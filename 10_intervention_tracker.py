"""
Step 10: Intervention Effectiveness Tracker (Option 6, basic version)

True intervention tracking needs deliberate before/after experiments an officer logs
("patrolled Zone 12 for 7 days, here's what happened"). We don't have that yet since
this is a historical dataset, not a live deployment. But we can do something honest
and real right now: mine the dataset for NATURAL experiments that already happened.

Script 04 found that "emerging hotspot" spikes are mostly driven by multiple devices
suddenly becoming active at a location in one month - i.e. an enforcement drive being
deployed there. That IS an intervention, even if undeclared. This script identifies
those natural spike events and measures what happened to violation counts in the
FOLLOWING month - giving a real, data-grounded (if observational, not controlled)
signal about whether increased enforcement presence at a zone correlates with
violations declining, holding steady, or even rising afterward (e.g. if the spike
itself was a one-time crackdown that didn't change underlying behavior).

This is explicitly framed as CORRELATIONAL, not a controlled experiment - we have no
counterfactual (what would have happened without the spike), no randomization, and
confounding is likely (e.g. a spike might happen BECAUSE a location was already
trending worse, not the other way around). The honest framing: "zones that received a
sudden enforcement spike show this pattern afterward" - useful descriptive signal for
planning, not proof of causal intervention effectiveness.

It also provides a simple manual-entry interface (log_intervention) so that once this
system IS deployed live, real declared interventions (officer explicitly says "we
patrolled here for N days") can be logged and scored the same way, building toward a
true controlled feedback loop over time - this is the bridge from the historical
backtest to genuine future post-event learning.
"""
import pandas as pd
import numpy as np
from config import CLUSTERED_DATA, PIPELINE_DIR, INTERVENTION_EVENTS, INTERVENTION_LOG

MONTH_ORDER = ['2023-11', '2023-12', '2024-01', '2024-02', '2024-03']  # April excluded - partial month

def build_monthly_matrix(df):
    df = df[df['zone_id'] != -1].copy()
    df = df.dropna(subset=['created_datetime'])
    df['month_period'] = df['created_datetime'].dt.tz_localize(None).dt.to_period('M').astype(str)
    monthly = df.groupby(['zone_id', 'month_period'])['id'].count().unstack(fill_value=0)
    return monthly.reindex(columns=MONTH_ORDER, fill_value=0)

def find_natural_spike_events(monthly, baseline_max=5, spike_min=20):
    """
    A "natural intervention" event: a zone with near-zero activity (<=baseline_max)
    in some month, followed immediately by a sharp spike (>=spike_min) the next month.
    For each such event, also record what happened the month AFTER the spike, if
    available, to see whether elevated attention persisted, declined, or violations
    actually dropped post-spike.
    """
    events = []
    for zone_id, row in monthly.iterrows():
        for i in range(len(MONTH_ORDER) - 1):
            baseline_month, spike_month = MONTH_ORDER[i], MONTH_ORDER[i+1]
            baseline_val, spike_val = row[baseline_month], row[spike_month]
            if baseline_val <= baseline_max and spike_val >= spike_min:
                followup_val = None
                followup_month = None
                if i + 2 < len(MONTH_ORDER):
                    followup_month = MONTH_ORDER[i+2]
                    followup_val = row[followup_month]
                events.append({
                    'zone_id': zone_id,
                    'baseline_month': baseline_month,
                    'baseline_count': int(baseline_val),
                    'spike_month': spike_month,
                    'spike_count': int(spike_val),
                    'followup_month': followup_month,
                    'followup_count': int(followup_val) if followup_val is not None else None,
                })
                break  # only the first qualifying event per zone, to avoid double-counting overlapping windows
    return pd.DataFrame(events)

def categorize_followup(row):
    """What happened after the enforcement spike, relative to the spike itself."""
    if pd.isna(row['followup_count']):
        return 'no_followup_data'
    if row['followup_count'] >= row['spike_count'] * 0.8:
        return 'sustained_high'       # enforcement presence (or violations) stayed elevated
    elif row['followup_count'] <= row['spike_count'] * 0.3:
        return 'dropped_sharply'      # violations fell off fast after the spike
    else:
        return 'partial_decline'

def log_intervention(zone_id, action_taken, duration_days, start_date, notes=None):
    """
    Manual entry point for a FUTURE real declared intervention, once this system is
    deployed live. Appends to a simple CSV log. This is intentionally minimal - the
    point is to establish the logging contract now so genuine controlled before/after
    data can accumulate over time, which is what would upgrade this from a historical
    backtest into a true live learning loop.
    """
    log_path = INTERVENTION_LOG
    entry = pd.DataFrame([{
        'zone_id': zone_id,
        'action_taken': action_taken,
        'duration_days': duration_days,
        'start_date': start_date,
        'notes': notes or '',
        'logged_at': pd.Timestamp.now().isoformat(),
    }])
    if log_path.exists():
        existing = pd.read_csv(log_path)
        combined = pd.concat([existing, entry], ignore_index=True)
    else:
        combined = entry
    combined.to_csv(log_path, index=False)
    return entry.iloc[0].to_dict()

if __name__ == '__main__':
    df = pd.read_pickle(CLUSTERED_DATA)
    monthly = build_monthly_matrix(df)

    print(f"Monthly matrix: {monthly.shape[0]} zones x {monthly.shape[1]} months\n")

    events = find_natural_spike_events(monthly)
    print(f"Natural enforcement-spike events found: {len(events)}")

    events['followup_category'] = events.apply(categorize_followup, axis=1)
    print(f"\nFollow-up outcome breakdown:")
    print(events['followup_category'].value_counts())

    print(f"\n=== Sample events ===")
    print(events.head(10).to_string())

    print(
        "\nIMPORTANT FRAMING: these are observational natural experiments (a sudden\n"
        "multi-device enforcement spike, identified the same way as script 04's emerging\n"
        "hotspots), NOT controlled trials. No counterfactual exists - we don't know what\n"
        "would have happened without the spike. Treat 'dropped_sharply' as 'this pattern\n"
        "is consistent with the spike having an effect', not as proof the spike CAUSED the\n"
        "drop (it could also mean the spike was a one-off crackdown coinciding with the\n"
        "violation naturally being a short-lived spree, e.g. a specific event)."
    )

    events.to_pickle(INTERVENTION_EVENTS)
    print("\nSaved intervention_events.pkl")

    print("\n=== Example manual log entry (for live future use) ===")
    example = log_intervention(
        zone_id=309, action_taken='Increased patrol frequency', duration_days=7,
        start_date='2024-05-01', notes='Test entry - demonstrates the logging interface'
    )
    print(example)
