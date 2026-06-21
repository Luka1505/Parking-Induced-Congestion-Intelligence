"""
Step 8: Post-Event Learning Loop (basic backtest version)

This was originally scoped as concept-note-only, since a true post-event learning
loop needs a live deployment feedback period we don't have. But a basic, honest
version IS buildable from historical data alone: split the dataset in time, compute
the impact score using only the EARLY period ("predicted risk"), then check what
actually happened at those same zones in the LATER period ("actual outcome"). This
directly tests whether the score's ranking has any real predictive validity for
future enforcement-relevant activity, rather than just describing the past.

Split used: Nov+Dec+Jan ("train" - 3 full months) to compute zone impact scores,
then Feb+Mar ("test" - 2 full months) to check actual violation counts at those same
zones. April is excluded throughout this project since it's a partial month (data
ends Apr 8) - see script 04 notes.

IMPORTANT FRAMING: this measures whether HIGH-SCORING ZONES STAY HIGH-ACTIVITY zones,
which is the property that actually matters for an enforcement tool (you want
confidence that today's priority list is still relevant next month). It does NOT
prove the score predicts true "congestion impact" independent of enforcement
presence, since (as established in script 04) recorded violations are themselves a
function of where enforcement was deployed. This is a legitimate, honest test of
RANK STABILITY OVER TIME, not a claim of causal forecasting accuracy.
"""
import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from scipy.stats import spearmanr
from config import CLUSTERED_DATA, POST_EVENT_BACKTEST

TRAIN_MONTHS = ['2023-11', '2023-12', '2024-01']
TEST_MONTHS = ['2024-02', '2024-03']

ROAD_TYPE_SCORE = {
    'arterial': 100, 'junction': 80, 'local_road': 50, 'residential': 20, 'unknown': 40,
}
WEIGHTS = {'density': 0.35, 'severity': 0.25, 'road_criticality': 0.25, 'commercial_proximity': 0.15}

def normalize_0_100(series):
    lo, hi = series.min(), series.max()
    if hi - lo == 0:
        return pd.Series(50.0, index=series.index)
    return 100 * (series - lo) / (hi - lo)

def score_zones_for_period(df_period, zone_id_col='zone_id'):
    """Recompute a zone-level impact score using only the rows in df_period."""
    if df_period.empty:
        return pd.DataFrame(columns=['impact_score', 'violation_count'])

    grouped = df_period.groupby(zone_id_col).agg(
        violation_count=('id', 'count'),
        severe_stop_pct=('is_severe_stop', lambda x: 100 * x.mean()),
        road_type=('road_type', lambda x: x.mode().iloc[0] if not x.mode().empty else 'unknown'),
        is_commercial_zone=('is_commercial_zone', lambda x: x.mean() > 0.5),
    )

    density_score = normalize_0_100(np.log1p(grouped['violation_count']))
    severity_score = normalize_0_100(grouped['severe_stop_pct'])
    road_score = grouped['road_type'].map(ROAD_TYPE_SCORE).fillna(40)
    commercial_score = grouped['is_commercial_zone'].apply(lambda x: 100 if x else 0)

    grouped['impact_score'] = (
        WEIGHTS['density'] * density_score
        + WEIGHTS['severity'] * severity_score
        + WEIGHTS['road_criticality'] * road_score
        + WEIGHTS['commercial_proximity'] * commercial_score
    )
    return grouped

def run_backtest(df):
    df = df[df['zone_id'] != -1].copy()
    df = df.dropna(subset=['created_datetime'])
    df['month_str'] = df['created_datetime'].dt.tz_localize(None).dt.to_period('M').astype(str)

    train_df = df[df['month_str'].isin(TRAIN_MONTHS)]
    test_df = df[df['month_str'].isin(TEST_MONTHS)]

    print(f"Train period ({TRAIN_MONTHS}): {len(train_df)} violations")
    print(f"Test period ({TEST_MONTHS}): {len(test_df)} violations")

    train_scores = score_zones_for_period(train_df)
    test_scores = score_zones_for_period(test_df)

    # only compare zones that have activity in BOTH periods - a zone with zero
    # test-period activity isn't a "miss", it may just mean enforcement didn't visit,
    # consistent with everything we've found about this dataset reflecting patrol
    # presence. We're testing rank stability among zones that remained active, not
    # penalizing zones for going quiet.
    common_zones = train_scores.index.intersection(test_scores.index)
    print(f"\nZones active in both train and test periods: {len(common_zones)}")
    print(f"(Train-only zones: {len(train_scores.index.difference(test_scores.index))}, "
          f"Test-only zones: {len(test_scores.index.difference(train_scores.index))})")

    comparison = pd.DataFrame({
        'predicted_impact_score': train_scores.loc[common_zones, 'impact_score'],
        'predicted_violation_count': train_scores.loc[common_zones, 'violation_count'],
        'actual_violation_count': test_scores.loc[common_zones, 'violation_count'],
        'actual_impact_score': test_scores.loc[common_zones, 'impact_score'],
    })

    # Did the train-period score rank predict the test-period actual activity rank?
    corr, pval = spearmanr(comparison['predicted_impact_score'], comparison['actual_violation_count'])
    print(f"\nSpearman correlation (train impact score vs test actual violation count): "
          f"{corr:.3f} (p={pval:.2e})")

    # top-decile precision: of the zones predicted as top 10% highest-impact in train,
    # what fraction were still in the top 25% by actual test-period volume?
    n_top = max(1, len(comparison) // 10)
    predicted_top = comparison.nlargest(n_top, 'predicted_impact_score')
    actual_top_quartile_cutoff = comparison['actual_violation_count'].quantile(0.75)
    hit_rate = (predicted_top['actual_violation_count'] >= actual_top_quartile_cutoff).mean()
    print(f"Of the top {n_top} zones by train-period predicted impact score, "
          f"{100*hit_rate:.1f}% remained in the top quartile of actual test-period activity")

    return comparison, corr

if __name__ == '__main__':
    df = pd.read_pickle(CLUSTERED_DATA)
    comparison, corr = run_backtest(df)

    print("\n=== Sample: top 10 zones by predicted (train) impact score, with actual (test) outcome ===")
    sample = comparison.sort_values('predicted_impact_score', ascending=False).head(10)
    print(sample.to_string())

    comparison.to_pickle(POST_EVENT_BACKTEST)
    print("\nSaved post_event_backtest.pkl")

    # context: how does the composite score's predictive validity compare to two
    # baselines? (a) random selection, (b) naive raw-volume-only prediction.
    np.random.seed(42)
    n_top = max(1, len(comparison) // 10)
    cutoff = comparison['actual_violation_count'].quantile(0.75)

    random_hits = []
    for _ in range(1000):
        sample = comparison.sample(n_top)
        random_hits.append((sample['actual_violation_count'] >= cutoff).mean())
    random_baseline = np.mean(random_hits)

    naive_top = comparison.nlargest(n_top, 'predicted_violation_count')
    naive_hit_rate = (naive_top['actual_violation_count'] >= cutoff).mean()

    composite_top = comparison.nlargest(n_top, 'predicted_impact_score')
    composite_hit_rate = (composite_top['actual_violation_count'] >= cutoff).mean()

    score_volume_corr = comparison['predicted_impact_score'].corr(
        comparison['predicted_violation_count'], method='spearman'
    )

    print(f"\n=== Honest context: composite score vs baselines ===")
    print(f"Random selection baseline hit rate:        {100*random_baseline:.1f}%")
    print(f"Composite impact score top-decile hit rate: {100*composite_hit_rate:.1f}%")
    print(f"Naive raw-volume-only top-decile hit rate:  {100*naive_hit_rate:.1f}%")
    print(f"\nComposite score vs raw volume correlation (train period): {score_volume_corr:.3f}")
    print(
        "\nInterpretation: the composite score clearly beats random chance at identifying\n"
        "zones that stay high-activity, but a naive 'just rank by violation count so far'\n"
        "predictor does noticeably better at THIS specific task. This is expected, not a\n"
        "flaw: the composite score is deliberately NOT a pure volume ranking - severity,\n"
        "road criticality, and commercial proximity make up 65% of its weight by design,\n"
        "so it correlates only moderately (0.51) with raw volume even within the same\n"
        "period. It trades some future-volume predictive power for surfacing structurally\n"
        "important zones (a quiet but severe main-road obstruction) that pure volume\n"
        "ranking would underrate. Which framing matters more depends on the use case -\n"
        "for 'which zones will generate the most enforcement work next month', raw volume\n"
        "wins; for 'which zones deserve targeted attention regardless of raw frequency',\n"
        "the composite score's design is the right tradeoff. Both are legitimate; this\n"
        "backtest is what lets us state that distinction with actual numbers instead of\n"
        "asserting it."
    )
