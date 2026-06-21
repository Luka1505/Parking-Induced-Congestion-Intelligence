"""
Step 3: Parking Impact Score (transparent, weighted, explainable)

Score combines four signals, each normalized to 0-100, then weighted-summed:
  1. Density       - how many violations the zone accumulates (raw enforcement burden)
  2. Severity      - % of stops flagged for a high-impact obstruction TYPE (e.g. main-road
                      or footpath parking), not raw multi-tag count - see script 01 notes:
                      raw tag count was found to reflect officer tagging convention, not
                      real severity
  3. Road criticality - arterial/junction roads block more capacity than residential lanes
  4. Commercial/footfall proximity - violations near markets/metro/hospitals affect more people

Weights are explicit and tunable - this is intentional. We are NOT claiming to measure
actual traffic speed reduction (no such data exists in this dataset). This is a transparent,
defensible proxy for "enforcement priority," not a black-box congestion measurement.
"""
import pandas as pd
import numpy as np
from config import ZONE_SUMMARY, SCORED_ZONES

# Road type criticality weights (capacity impact of blocking each road type)
ROAD_TYPE_SCORE = {
    'arterial': 100,
    'junction': 80,
    'local_road': 50,
    'residential': 20,
    'unknown': 40,
}

# Final score weights - sum to 1.0, exposed for the concept note / explainability demo
WEIGHTS = {
    'density': 0.35,
    'severity': 0.25,
    'road_criticality': 0.25,
    'commercial_proximity': 0.15,
}

def normalize_0_100(series):
    """Min-max normalize to 0-100. Handles constant/degenerate series safely."""
    lo, hi = series.min(), series.max()
    if hi - lo == 0:
        return pd.Series(50.0, index=series.index)  # neutral midpoint if no variance
    return 100 * (series - lo) / (hi - lo)

def compute_impact_score(zone_df):
    zone_df = zone_df.copy()

    # 1. Density: raw violation count, log-scaled before normalizing
    #    (log scale prevents the few mega-zones from making everything else look like zero)
    zone_df['density_raw'] = np.log1p(zone_df['violation_count'])
    zone_df['density_score'] = normalize_0_100(zone_df['density_raw'])

    # 2. Severity: % of stops flagged for a high-impact obstruction type (see script 01)
    zone_df['severity_score'] = normalize_0_100(zone_df['severe_stop_pct'])

    # 3. Road criticality: mapped from road_type classification
    zone_df['road_criticality_score'] = zone_df['road_type'].map(ROAD_TYPE_SCORE).fillna(40)

    # 4. Commercial proximity: binary flag scaled to 0/100
    zone_df['commercial_score'] = zone_df['is_commercial_zone'].apply(lambda x: 100 if x else 0)

    # Weighted composite
    zone_df['impact_score'] = (
        WEIGHTS['density'] * zone_df['density_score']
        + WEIGHTS['severity'] * zone_df['severity_score']
        + WEIGHTS['road_criticality'] * zone_df['road_criticality_score']
        + WEIGHTS['commercial_proximity'] * zone_df['commercial_score']
    ).round(1)

    # Category bucket - percentile-based, not fixed absolute thresholds.
    high_cutoff = zone_df['impact_score'].quantile(0.95)
    medium_cutoff = zone_df['impact_score'].quantile(0.70)

    def categorize(score):
        if score >= high_cutoff:
            return 'High'
        elif score >= medium_cutoff:
            return 'Medium'
        else:
            return 'Low'
    zone_df['impact_category'] = zone_df['impact_score'].apply(categorize)

    # Explainability: contribution breakdown per zone (% of final score from each factor)
    zone_df['contrib_density'] = (WEIGHTS['density'] * zone_df['density_score'] / zone_df['impact_score'] * 100).round(1)
    zone_df['contrib_severity'] = (WEIGHTS['severity'] * zone_df['severity_score'] / zone_df['impact_score'] * 100).round(1)
    zone_df['contrib_road'] = (WEIGHTS['road_criticality'] * zone_df['road_criticality_score'] / zone_df['impact_score'] * 100).round(1)
    zone_df['contrib_commercial'] = (WEIGHTS['commercial_proximity'] * zone_df['commercial_score'] / zone_df['impact_score'] * 100).round(1)

    return zone_df.sort_values('impact_score', ascending=False)

if __name__ == '__main__':
    zone_df = pd.read_pickle(ZONE_SUMMARY)
    scored = compute_impact_score(zone_df)

    print(f"Impact category distribution:\n{scored['impact_category'].value_counts()}\n")

    print("Top 15 zones by Impact Score:")
    cols = ['zone_id', 'impact_score', 'impact_category', 'violation_count',
            'severe_stop_pct', 'road_type', 'is_commercial_zone', 'representative_location']
    print(scored[cols].head(15).to_string())

    print("\nExample explainability breakdown (top zone):")
    top = scored.iloc[0]
    print(f"Zone {top['zone_id']} - Impact Score: {top['impact_score']}")
    print(f"  Density contribution:    {top['contrib_density']}%")
    print(f"  Severity contribution:   {top['contrib_severity']}%")
    print(f"  Road type contribution:  {top['contrib_road']}%")
    print(f"  Commercial contribution: {top['contrib_commercial']}%")

    scored.to_pickle(SCORED_ZONES)
    print("\nSaved scored_zones.pkl")
