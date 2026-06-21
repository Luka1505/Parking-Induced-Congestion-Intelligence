"""
Step 11: Deployment Allocator (honest version of "Officer Action Simulator")

Extends the existing resource allocation simulator (script 05) with route grouping:
given N patrol teams and a target area, assign the highest-priority zones to teams
and sequence each team's stops by geographic proximity (nearest-neighbor), so the
output looks like an actual deployable plan, not just a flat ranked list.

DELIBERATELY EXCLUDED: any "expected violation reduction %" number. We have no
controlled before/after intervention data to calibrate what a patrol actually does to
violation rates - the intervention_events.pkl analysis (script 10) is observational,
not causal, and explicitly should not be used to manufacture a reduction percentage
for a specific hypothetical deployment. What we CAN honestly report: the % of total
violation volume / severe-violation volume that falls within the selected zones,
which is real arithmetic on real data (already computed in script 05) - i.e. "this
plan would put patrols within reach of 18% of all severe violations", not "this plan
will reduce violations by 18%". The distinction is the entire point.
"""
import pandas as pd
import numpy as np
from config import ENFORCEMENT_PLAN

EARTH_RADIUS_M = 6371000

def haversine_m(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    return 2 * EARTH_RADIUS_M * np.arcsin(np.sqrt(a))

def filter_by_area(plan_df, area_bounds=None):
    """area_bounds: optional dict with min_lat/max_lat/min_lon/max_lon to restrict to
    a sub-region (e.g. 'Bengaluru East'). If None, considers the whole dataset."""
    if area_bounds is None:
        return plan_df
    return plan_df[
        plan_df['centroid_lat'].between(area_bounds['min_lat'], area_bounds['max_lat']) &
        plan_df['centroid_lon'].between(area_bounds['min_lon'], area_bounds['max_lon'])
    ]

def nearest_neighbor_route(zones_subset, start_idx=0):
    """Simple greedy nearest-neighbor sequencing - not optimal TSP, but a reasonable,
    fast, explainable route ordering for a handful of stops per team."""
    remaining = zones_subset.copy().reset_index(drop=True)
    route = []
    current = remaining.iloc[start_idx]
    route.append(current)
    remaining = remaining.drop(start_idx).reset_index(drop=True)

    while len(remaining) > 0:
        dists = haversine_m(current['centroid_lat'], current['centroid_lon'],
                             remaining['centroid_lat'].values, remaining['centroid_lon'].values)
        next_idx = np.argmin(dists)
        current = remaining.iloc[next_idx]
        route.append(current)
        remaining = remaining.drop(next_idx).reset_index(drop=True)

    return route

def allocate_deployment(plan_df, n_teams, stops_per_team, area_bounds=None):
    """
    Assigns the highest-priority zones to N teams, stops_per_team each, then
    sequences each team's stops geographically. Teams are filled round-robin from
    the priority-ranked list so each team gets a mix across the priority spread
    rather than Team 1 getting all the best zones and Team N getting the worst -
    every team gets a meaningful patrol, which is the operationally realistic ask.
    """
    area_plan = filter_by_area(plan_df, area_bounds).sort_values('impact_score', ascending=False)
    n_zones_needed = n_teams * stops_per_team

    if len(area_plan) < n_zones_needed:
        print(f"WARNING: only {len(area_plan)} zones available in this area, "
              f"requested {n_zones_needed} (n_teams x stops_per_team). Reducing stops_per_team.")
        stops_per_team = max(1, len(area_plan) // n_teams)
        n_zones_needed = n_teams * stops_per_team

    selected = area_plan.head(n_zones_needed).reset_index(drop=True)

    # round-robin assignment: zone 0->team1, zone1->team2, ..., zoneN->team1, ...
    selected['team_id'] = [(i % n_teams) + 1 for i in range(len(selected))]

    teams = {}
    for team_id in range(1, n_teams + 1):
        team_zones = selected[selected['team_id'] == team_id]
        if len(team_zones) == 0:
            teams[team_id] = []
            continue
        route = nearest_neighbor_route(team_zones)
        teams[team_id] = route

    # Honest coverage stats - real arithmetic, no fabricated reduction %
    total_severe = plan_df['severe_stop_count'].sum()
    total_violations = plan_df['violation_count'].sum()
    covered_severe = selected['severe_stop_count'].sum()
    covered_violations = selected['violation_count'].sum()

    coverage_stats = {
        'n_teams': n_teams,
        'stops_per_team': stops_per_team,
        'total_zones_covered': len(selected),
        'severe_violations_in_plan': int(covered_severe),
        'severe_violations_coverage_pct': round(100 * covered_severe / total_severe, 1) if total_severe else 0,
        'total_violations_in_plan': int(covered_violations),
        'total_violations_coverage_pct': round(100 * covered_violations / total_violations, 1) if total_violations else 0,
    }

    return teams, coverage_stats

def print_deployment_plan(teams, coverage_stats):
    print(f"=== Deployment Plan: {coverage_stats['n_teams']} teams x "
          f"{coverage_stats['stops_per_team']} stops ===\n")
    for team_id, route in teams.items():
        print(f"Patrol Team {team_id}:")
        if not route:
            print("  (no zones assigned)")
            continue
        for stop_num, zone in enumerate(route, 1):
            loc = zone['representative_location']
            loc_short = loc.split(',')[0] if pd.notna(loc) else f"Zone {zone['zone_id']}"
            print(f"  Stop {stop_num} -> Zone #{int(zone['zone_id'])} ({loc_short}) "
                  f"- Impact {zone['impact_score']:.1f}, {zone['recommended_patrol_window']}")
        print()

    print(f"--- Coverage (real arithmetic, NOT a predicted reduction) ---")
    print(f"Zones covered: {coverage_stats['total_zones_covered']}")
    print(f"Severe violations within this plan's reach: {coverage_stats['severe_violations_in_plan']} "
          f"({coverage_stats['severe_violations_coverage_pct']}% of all logged severe violations)")
    print(f"Total violations within this plan's reach: {coverage_stats['total_violations_in_plan']} "
          f"({coverage_stats['total_violations_coverage_pct']}% of all logged violations)")
    print(
        "\nNOTE: this reports what fraction of historically logged violation activity falls\n"
        "within the selected zones - i.e. how much ground this plan covers. It does NOT\n"
        "predict a violation reduction percentage, since we have no controlled before/after\n"
        "intervention data in this dataset to calibrate what patrol presence actually\n"
        "changes (see script 10's natural-experiment analysis, which is observational, not\n"
        "causal, and should not be used to manufacture a reduction estimate here)."
    )

if __name__ == '__main__':
    plan = pd.read_pickle(ENFORCEMENT_PLAN)

    print(">>> Example: 5 teams, 3 stops each, citywide\n")
    teams, stats = allocate_deployment(plan, n_teams=5, stops_per_team=3)
    print_deployment_plan(teams, stats)

    print("\n\n>>> Example: 3 teams, 2 stops each, restricted to a bounding-box sub-area\n")
    # rough bounding box - illustrative "Bengaluru East" style area filter
    east_bounds = {'min_lat': 12.95, 'max_lat': 13.05, 'min_lon': 77.65, 'max_lon': 77.78}
    teams2, stats2 = allocate_deployment(plan, n_teams=3, stops_per_team=2, area_bounds=east_bounds)
    print_deployment_plan(teams2, stats2)
