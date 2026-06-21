"""
Step 7: Export data for the UI
"""
import pandas as pd
import json
import numpy as np
import os
from config import ENFORCEMENT_PLAN, CLUSTERED_DATA, EMERGING_HOTSPOTS, ZONE_SUMMARY, UI_PIPELINE_OUTPUT, POST_EVENT_BACKTEST, INTERVENTION_EVENTS

def safe_round(x, n=1):
    return round(float(x), n) if pd.notna(x) else None

if __name__ == '__main__':
    plan = pd.read_pickle(ENFORCEMENT_PLAN)
    clustered = pd.read_pickle(CLUSTERED_DATA)
    emerging = pd.read_pickle(EMERGING_HOTSPOTS)
    zone_summary = pd.read_pickle(ZONE_SUMMARY)

    # citywide hourly profile (headline chart)
    clean = clustered.dropna(subset=['hour'])
    hourly = clean.groupby('hour')['id'].count()
    citywide_hourly = [int(hourly.get(float(h), 0)) for h in range(24)]

    # citywide day-of-week profile
    dow_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    dow_counts = clean.groupby('day_name')['id'].count()
    citywide_dow = [int(dow_counts.get(d, 0)) for d in dow_order]

    # zone records for map + list
    zones = []
    emerging_set = set(emerging.index.tolist())

    # NOTE: long arterial roads can legitimately contain multiple independent
    # high-severity hotspots a short distance apart (e.g. "Outer Ring Road" or
    # "Railway Line Road" appearing 3-4 times in the top 20) - this is the two-stage
    # clustering correctly keeping them as separate, patrol-actionable sub-zones rather
    # than merging them, NOT a duplication bug. But shown bare in a list, repeated
    # identical-looking road names look like an error. Tag duplicates with a short
    # disambiguator (compass-ish offset from the group's centroid) so it's visibly
    # clear these are distinct points along the same road.
    plan['road_name'] = plan['representative_location'].fillna('Unknown').str.split(',').str[0]
    road_name_counts = plan['road_name'].value_counts()
    duplicate_road_names = set(road_name_counts[road_name_counts > 1].index)
    # assign a stable segment number per duplicate group, ordered by impact score
    # (already the prevailing sort order) so "Segment 1" is consistently the
    # highest-priority instance of that road name
    segment_counters = {}

    for _, row in plan.iterrows():
        location_label = row['representative_location'] if pd.notna(row['representative_location']) else 'Unknown location'
        if row['road_name'] in duplicate_road_names:
            segment_counters[row['road_name']] = segment_counters.get(row['road_name'], 0) + 1
            location_label = f"{location_label} (Segment {segment_counters[row['road_name']]})"

        zones.append({
            'zoneId': int(row['zone_id']),
            'lat': safe_round(row['centroid_lat'], 6),
            'lon': safe_round(row['centroid_lon'], 6),
            'violationCount': int(row['violation_count']),
            'severeStopPct': safe_round(row['severe_stop_pct']),
            'rushHourPct': safe_round(row['rush_hour_pct']),
            'roadType': row['road_type'],
            'footfallCategory': row['dominant_footfall_category'],
            'location': location_label,
            'junction': row['representative_junction'] if pd.notna(row['representative_junction']) else None,
            'impactScore': safe_round(row['impact_score']),
            'impactCategory': row['impact_category'],
            'contribDensity': safe_round(row['contrib_density']),
            'contribSeverity': safe_round(row['contrib_severity']),
            'contribRoad': safe_round(row['contrib_road']),
            'contribCommercial': safe_round(row['contrib_commercial']),
            'patrolWindow': row['recommended_patrol_window'],
            'windowConfidence': row['window_confidence'],
            'noDaytimeData': bool(row['no_daytime_data']),
            'priorityRank': int(row['priority_rank']),
            'isEmerging': int(row['zone_id']) in emerging_set,
        })

    # emerging hotspot detail (for a dedicated panel)
    emerging_detail = []
    for zid, erow in emerging.head(30).iterrows():
        zone_match = plan[plan['zone_id'] == zid]
        loc = zone_match['representative_location'].iloc[0] if len(zone_match) else 'Unknown'
        impact = zone_match['impact_score'].iloc[0] if len(zone_match) else None
        emerging_detail.append({
            'zoneId': int(zid),
            'location': loc if pd.notna(loc) else 'Unknown location',
            'recentTotal': int(erow['recent_total']),
            'pctChange': safe_round(erow['pct_change']),
            'impactScore': safe_round(impact) if impact is not None else None,
        })

    # Post-event learning loop backtest (script 08) - optional, computed separately
    backtest_path = POST_EVENT_BACKTEST
    post_event_data = None
    if backtest_path.exists():
        backtest_df = pd.read_pickle(backtest_path)
        cutoff = backtest_df['actual_violation_count'].quantile(0.75)
        n_top = max(1, len(backtest_df) // 10)

        np.random.seed(42)
        random_hits = [
            (backtest_df.sample(n_top)['actual_violation_count'] >= cutoff).mean()
            for _ in range(1000)
        ]
        random_baseline = float(np.mean(random_hits))

        composite_top = backtest_df.nlargest(n_top, 'predicted_impact_score')
        composite_hit_rate = float((composite_top['actual_violation_count'] >= cutoff).mean())

        naive_top = backtest_df.nlargest(n_top, 'predicted_violation_count')
        naive_hit_rate = float((naive_top['actual_violation_count'] >= cutoff).mean())

        corr = float(backtest_df['predicted_impact_score'].corr(
            backtest_df['actual_violation_count'], method='spearman'
        ))

        post_event_data = {
            'trainMonths': 'Nov 2023 - Jan 2024',
            'testMonths': 'Feb - Mar 2024',
            'zonesTestedBoth': len(backtest_df),
            'spearmanCorr': safe_round(corr, 3),
            'randomBaselineHitRate': safe_round(100 * random_baseline),
            'compositeScoreHitRate': safe_round(100 * composite_hit_rate),
            'naiveVolumeHitRate': safe_round(100 * naive_hit_rate),
        }

    # Intervention effectiveness data (script 10) - optional
    intervention_path = INTERVENTION_EVENTS
    intervention_data = None
    if intervention_path.exists():
        events_df = pd.read_pickle(intervention_path)
        cat_counts = events_df['followup_category'].value_counts().to_dict()
        with_followup = events_df[events_df['followup_category'] != 'no_followup_data']
        intervention_data = {
            'totalEventsFound': len(events_df),
            'eventsWithFollowup': len(with_followup),
            'categoryCounts': {k: int(v) for k, v in cat_counts.items()},
            'sampleEvents': [],
        }
        sample = events_df[events_df['followup_category'] != 'no_followup_data'].head(8)
        for _, ev in sample.iterrows():
            zone_match = plan[plan['zone_id'] == ev['zone_id']]
            loc = zone_match['representative_location'].iloc[0] if len(zone_match) else 'Unknown'
            intervention_data['sampleEvents'].append({
                'zoneId': int(ev['zone_id']),
                'location': (loc.split(',')[0] if pd.notna(loc) else 'Unknown'),
                'baselineMonth': ev['baseline_month'],
                'baselineCount': int(ev['baseline_count']),
                'spikeMonth': ev['spike_month'],
                'spikeCount': int(ev['spike_count']),
                'followupMonth': ev['followup_month'] if pd.notna(ev['followup_month']) else None,
                'followupCount': int(ev['followup_count']) if pd.notna(ev['followup_count']) else None,
                'followupCategory': ev['followup_category'],
            })

    summary_stats = {
        'totalViolationsRaw': len(clustered),
        'totalViolationsClustered': int(plan['violation_count'].sum()),
        'noisePointCount': int((clustered['zone_id'] == -1).sum()),
        'totalZones': len(plan),
        'highImpactZones': int((plan['impact_category'] == 'High').sum()),
        'mediumImpactZones': int((plan['impact_category'] == 'Medium').sum()),
        'lowImpactZones': int((plan['impact_category'] == 'Low').sum()),
        'noDaytimeDataPct': safe_round(100 * plan['no_daytime_data'].mean()),
        'emergingHotspotCount': len(emerging),
        'dateRange': 'Nov 2023 - Apr 2024',
    }

    output = {
        'summaryStats': summary_stats,
        'citywideHourly': citywide_hourly,
        'citywideDow': citywide_dow,
        'dowLabels': dow_order,
        'zones': zones,
        'emergingHotspots': emerging_detail,
        'postEventLearning': post_event_data,
        'interventionTracking': intervention_data,
    }

    out_path = UI_PIPELINE_OUTPUT
    with open(out_path, 'w') as f:
        json.dump(output, f)

    print(f"Exported {len(zones)} zones, {len(emerging_detail)} emerging hotspots")
    print(f"File size: {os.path.getsize(out_path) / 1024:.1f} KB")
    print(f"Saved to {out_path}")
