"""
Step 4: Temporal Intelligence + Emerging Hotspot Detection
"""
import pandas as pd
import numpy as np
from config import CLUSTERED_DATA, ZONE_SUMMARY, ZONE_TRENDS, EMERGING_HOTSPOTS

def temporal_profile(df, zone_id):
    """Hour x day-of-week violation count matrix for a single zone."""
    zone_data = df[df['zone_id'] == zone_id]
    pivot = zone_data.pivot_table(
        index='hour', columns='day_name', values='id', aggfunc='count', fill_value=0
    )
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    pivot = pivot.reindex(columns=[d for d in day_order if d in pivot.columns])
    return pivot

def citywide_temporal_summary(df):
    """The headline finding: enforcement hour-of-day distribution, citywide."""
    by_hour = df.groupby('hour')['id'].count()
    by_dow = df.groupby('day_name')['id'].count()
    return by_hour, by_dow

def detect_emerging_hotspots(df, recent_months=2, comparison_months=2, min_recent_count=10,
                              min_full_month_count=30000):
    """
    Compare each zone's violation count in the most recent N FULL months vs the
    preceding N FULL months. Flags zones with a rising trend - proactive signal,
    not just a static "this zone is already bad" snapshot.

    Two data quality issues handled explicitly:
    - A small number of rows (5) have invalid/unparseable timestamps -> dropped.
    - The final calendar month in this dataset (Apr 2024) is partial (data ends Apr 8),
      with ~15K records vs ~55-65K for full months. Comparing a partial month directly
      against full months would produce a false "decline" signal and distort trends, so
      any month below min_full_month_count is excluded from the comparison entirely.
    """
    df = df[df['zone_id'] != -1].copy()
    df = df.dropna(subset=['created_datetime'])
    df['month_period'] = df['created_datetime'].dt.tz_localize(None).dt.to_period('M')

    month_counts = df['month_period'].value_counts()
    full_months = sorted(month_counts[month_counts >= min_full_month_count].index)
    excluded_months = sorted(set(df['month_period'].unique()) - set(full_months))
    if excluded_months:
        print(f"Excluding partial/incomplete months from trend comparison: {excluded_months} "
              f"(below {min_full_month_count} records)")

    if len(full_months) < recent_months + comparison_months:
        raise ValueError(f"Need at least {recent_months + comparison_months} full months, "
                          f"found {len(full_months)}")

    recent_window = full_months[-recent_months:]
    comparison_window = full_months[-(recent_months + comparison_months):-recent_months]

    recent_counts = df[df['month_period'].isin(recent_window)].groupby('zone_id')['id'].count()
    comparison_counts = df[df['month_period'].isin(comparison_window)].groupby('zone_id')['id'].count()

    # normalize by number of months in each window so periods of different length compare fairly
    recent_monthly_avg = recent_counts / len(recent_window)
    comparison_monthly_avg = comparison_counts / len(comparison_window)

    trend_df = pd.DataFrame({
        'recent_monthly_avg': recent_monthly_avg,
        'comparison_monthly_avg': comparison_monthly_avg,
    }).fillna(0)

    trend_df['recent_total'] = recent_counts.reindex(trend_df.index).fillna(0)

    # IMPORTANT: when comparison_monthly_avg == 0, a true percent-change is undefined
    # (division by zero), not literally 100%. An earlier version flattened ALL
    # zero-baseline zones to a flat pct_change of 100.0 regardless of whether the
    # recent count was 10 or 500 - this silently destroyed the ability to rank or
    # sort zero-baseline zones against each other (a real bug if pct_change is
    # consumed directly from this pickle rather than through the dashboard, which
    # worked around it by displaying raw counts instead - see PROGRESS_LOG). Fixed by
    # using a large sentinel value that still scales with recent_monthly_avg, so
    # zero-baseline zones remain correctly orderable relative to EACH OTHER by how
    # much recent activity they have, while staying clearly distinguishable from a
    # genuine (finite, computed) percent change for non-zero-baseline zones.
    ZERO_BASELINE_SENTINEL_MULTIPLIER = 1000  # large enough to always rank above any
                                                # realistic finite pct_change, while still
                                                # being proportional to recent_monthly_avg
    trend_df['pct_change'] = np.where(
        trend_df['comparison_monthly_avg'] > 0,
        100 * (trend_df['recent_monthly_avg'] - trend_df['comparison_monthly_avg']) / trend_df['comparison_monthly_avg'],
        trend_df['recent_monthly_avg'] * ZERO_BASELINE_SENTINEL_MULTIPLIER
    )
    trend_df['pct_change_is_undefined_baseline'] = trend_df['comparison_monthly_avg'] == 0

    # filter to zones with enough recent activity to be meaningful (avoid noise from tiny zones)
    emerging = trend_df[
        (trend_df['recent_total'] >= min_recent_count) &
        (trend_df['pct_change'] >= 25)  # at least 25% month-over-month rise
    ].sort_values('pct_change', ascending=False)

    # IMPORTANT CAVEAT (verified by inspection): the most extreme "emerging hotspot"
    # cases (e.g. comparison_monthly_avg near 0 -> recent spike of 40-150) are driven by
    # multiple distinct device_ids suddenly logging activity at a previously near-silent
    # location in a single month - this is the signature of a coordinated enforcement
    # drive being deployed there, not organic growth in illegal parking behavior.
    # This module should be framed honestly as "locations where enforcement attention
    # is intensifying" (useful for spotting newly-prioritized zones and validating
    # whether a drive sustained or tapered off), NOT as proof that violations
    # themselves are increasing absent enforcement. A true "organic growth" signal
    # would need to control for device/patrol presence, which is a roadmap item.

    return trend_df, emerging, recent_window, comparison_window

if __name__ == '__main__':
    df = pd.read_pickle(CLUSTERED_DATA)

    print("=== Citywide Temporal Summary ===")
    by_hour, by_dow = citywide_temporal_summary(df)
    print("\nViolations by hour:")
    print(by_hour)
    print("\nViolations by day of week:")
    print(by_dow)

    print("\n=== Emerging Hotspot Detection ===")
    trend_df, emerging, recent_window, comparison_window = detect_emerging_hotspots(df)
    print(f"Recent window: {recent_window}")
    print(f"Comparison window: {comparison_window}")
    print(f"\nEmerging hotspots flagged: {len(emerging)}")
    print(emerging.head(15).to_string())

    zone_summary = pd.read_pickle(ZONE_SUMMARY)
    emerging_with_loc = emerging.join(
        zone_summary.set_index('zone_id')[['representative_location', 'road_type']]
    )
    print("\nEmerging hotspots with location context:")
    print(emerging_with_loc[['recent_total', 'pct_change', 'representative_location', 'road_type']].head(15).to_string())

    trend_df.to_pickle(ZONE_TRENDS)
    emerging.to_pickle(EMERGING_HOTSPOTS)
    print("\nSaved zone_trends.pkl and emerging_hotspots.pkl")
