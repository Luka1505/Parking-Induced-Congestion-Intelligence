"""
Step 5: Enforcement Prioritization Layer

Takes the scored zones and produces the actual actionable output:
  1. A ranked priority list (by impact score)
  2. A specific patrol time-window recommendation per zone (derived from that zone's
     OWN hour-of-day distribution, not a citywide default) - this is what makes the
     output "targeted" rather than "patrol more, generally"
  3. A simple resource allocation: given N available patrol units, which zones get
     covered, and what % of total severe-violation volume does that coverage capture

IMPORTANT FRAMING NOTE: patrol windows are derived from WHEN VIOLATIONS WERE LOGGED in
this dataset, which (per script 04's finding) is itself a function of when enforcement
was historically deployed (9pm-9am skew). So a window recommendation here means
"this is when this specific zone's problem has been caught in the past, and given the
citywide blind spot, likely an underestimate of its true 10am-6pm activity." We are
NOT claiming to know true violation timing independent of enforcement presence - we
flag this explicitly in the output as a caveat, and recommend daytime spot-checks for
all zones regardless of their historical window, precisely BECAUSE the daytime blind
spot is real and we cannot rely on the data to tell us what we're not seeing.
"""
import pandas as pd
import numpy as np
from config import SCORED_ZONES, CLUSTERED_DATA, ENFORCEMENT_PLAN

def get_zone_hourly_profile(row_level_df, zone_id):
    """Hour-of-day violation distribution for one zone, from row-level data."""
    zone_data = row_level_df[row_level_df['zone_id'] == zone_id]
    hourly = zone_data.groupby('hour')['id'].count()
    return hourly

def recommend_patrol_window(hourly_profile, top_n_hours=3, min_total_for_confidence=20):
    """
    Pick the top N hours (by historical violation count) and collapse them into
    a human-readable window. If the top hours aren't contiguous, return the top
    single block plus a note rather than a misleading merged range.

    Also returns a confidence flag: a window built from very few total observations
    (e.g. a zone visited only once or twice by enforcement) tells you when THAT VISIT
    happened, not a genuine behavioral concentration. We only call a window
    "high confidence" when (a) there's a reasonable total sample size and (b) the top
    hours actually capture a clear majority share of that zone's violations.
    """
    if hourly_profile.empty or hourly_profile.sum() == 0:
        return "Insufficient data", [], "no_data"

    total = hourly_profile.sum()
    top_hours = hourly_profile.sort_values(ascending=False).head(top_n_hours).index.tolist()
    top_hours_sorted = sorted(int(h) for h in top_hours)
    top_hours_share = hourly_profile.loc[top_hours].sum() / total

    if total < min_total_for_confidence:
        confidence = "low_sample_size"
    elif top_hours_share >= 0.6:
        confidence = "high_concentration"
    else:
        confidence = "diffuse"

    # check contiguity
    is_contiguous = all(
        top_hours_sorted[i+1] - top_hours_sorted[i] == 1
        for i in range(len(top_hours_sorted) - 1)
    )

    if is_contiguous and len(top_hours_sorted) > 1:
        start, end = top_hours_sorted[0], top_hours_sorted[-1]
        window_str = f"{start:02d}:00–{end+1:02d}:00"
    else:
        # not contiguous - report as discrete hours, don't manufacture a fake range
        window_str = ", ".join(f"{h:02d}:00–{h+1:02d}:00" for h in top_hours_sorted)

    return window_str, top_hours_sorted, confidence

def build_enforcement_plan(scored_zones_df, row_level_df, top_n_hours=3):
    scored = scored_zones_df.copy()

    patrol_windows = []
    window_confidence = []
    daytime_blindspot_flags = []
    for zone_id in scored['zone_id']:
        hourly = get_zone_hourly_profile(row_level_df, zone_id)
        window_str, top_hours, confidence = recommend_patrol_window(hourly, top_n_hours)
        patrol_windows.append(window_str)
        window_confidence.append(confidence)
        # flag whether this zone has ANY logged daytime (10am-6pm) activity at all
        daytime_activity = hourly.reindex(range(10, 18), fill_value=0).sum()
        daytime_blindspot_flags.append(daytime_activity == 0)

    scored['recommended_patrol_window'] = patrol_windows
    scored['window_confidence'] = window_confidence
    scored['no_daytime_data'] = daytime_blindspot_flags

    # Priority rank purely by impact score (already computed)
    scored = scored.sort_values('impact_score', ascending=False).reset_index(drop=True)
    scored['priority_rank'] = scored.index + 1

    return scored

def simulate_patrol_allocation(enforcement_plan_df, n_patrol_units):
    """
    Simple resource allocation: assign N patrol units to the top-N highest-priority
    zones, and report what % of total severe-violation volume that covers.
    This is honest resource arithmetic on real data - NOT a causal "risk reduction"
    estimate, since we have no before/after intervention data to calibrate that.
    """
    total_severe = enforcement_plan_df['severe_stop_count'].sum()
    total_violations = enforcement_plan_df['violation_count'].sum()

    covered = enforcement_plan_df.head(n_patrol_units)
    covered_severe = covered['severe_stop_count'].sum()
    covered_violations = covered['violation_count'].sum()

    return {
        'n_patrol_units': n_patrol_units,
        'zones_covered': len(covered),
        'total_zones': len(enforcement_plan_df),
        'severe_violations_covered': int(covered_severe),
        'severe_violations_covered_pct': round(100 * covered_severe / total_severe, 1) if total_severe else 0,
        'total_violations_covered': int(covered_violations),
        'total_violations_covered_pct': round(100 * covered_violations / total_violations, 1) if total_violations else 0,
    }

if __name__ == '__main__':
    scored_zones = pd.read_pickle(SCORED_ZONES)
    clustered_data = pd.read_pickle(CLUSTERED_DATA)

    plan = build_enforcement_plan(scored_zones, clustered_data)

    print("=== Top 15 Priority Zones for Enforcement ===")
    cols = ['priority_rank', 'zone_id', 'impact_score', 'impact_category',
            'violation_count', 'recommended_patrol_window', 'window_confidence',
            'no_daytime_data', 'representative_location']
    print(plan[cols].head(15).to_string())

    print(f"\nWindow confidence breakdown across all zones:")
    print(plan['window_confidence'].value_counts())

    n_no_daytime = plan['no_daytime_data'].sum()
    print(f"\nZones with ZERO logged daytime (10am-6pm) activity: {n_no_daytime} / {len(plan)} "
          f"({100*n_no_daytime/len(plan):.1f}%)")
    print("-> For these zones, patrol window recommendations reflect historical detection "
          "times only. Daytime spot-checks are still recommended given the citywide "
          "enforcement blind spot identified in script 04.")

    print("\n=== Resource Allocation Simulation ===")
    for n_units in [10, 25, 50, 100]:
        result = simulate_patrol_allocation(plan, n_units)
        print(result)

    plan.to_pickle(ENFORCEMENT_PLAN)
    print("\nSaved enforcement_plan.pkl")
