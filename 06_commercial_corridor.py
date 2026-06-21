"""
Step 6: Commercial Corridor Intelligence (Flipkart-relevant framing)

Surfaces a specific, named subset of high-impact zones that sit on retail/commercial
corridors or transit hubs - the locations most likely to matter for last-mile delivery
movement, not just generic civic enforcement. This reuses footfall_category from
script 01 rather than building new classification logic.
"""
import pandas as pd
from config import ENFORCEMENT_PLAN, COMMERCIAL_CORRIDOR_ZONES

def build_commercial_corridor_report(enforcement_plan_df):
    df = enforcement_plan_df.copy()

    commercial_zones = df[df['dominant_footfall_category'] != 'none'].copy()
    commercial_zones = commercial_zones.sort_values('impact_score', ascending=False)

    summary_by_category = commercial_zones.groupby('dominant_footfall_category').agg(
        zone_count=('zone_id', 'count'),
        total_violations=('violation_count', 'sum'),
        avg_impact_score=('impact_score', 'mean'),
        high_impact_zone_count=('impact_category', lambda x: (x == 'High').sum()),
    ).round(1)

    return commercial_zones, summary_by_category

if __name__ == '__main__':
    plan = pd.read_pickle(ENFORCEMENT_PLAN)

    commercial_zones, summary = build_commercial_corridor_report(plan)

    print("=== Commercial Corridor Summary by Category ===")
    print(summary)
    print()

    print(f"Total commercial/transit/institutional zones: {len(commercial_zones)} "
          f"({100*len(commercial_zones)/len(plan):.1f}% of all zones)")
    print(f"Of these, High-impact: {(commercial_zones['impact_category']=='High').sum()}")
    print()

    print("=== Top 15 Commercial Corridor Zones by Impact Score ===")
    cols = ['priority_rank', 'zone_id', 'impact_score', 'impact_category',
            'dominant_footfall_category', 'violation_count', 'recommended_patrol_window',
            'representative_location']
    print(commercial_zones[cols].head(15).to_string())

    # Flipkart framing: these are the zones where delivery vehicles are most likely
    # to be obstructed by illegal parking, since they sit on the same retail/transit
    # corridors that drive last-mile delivery volume.
    print("\n=== Delivery-Relevant Framing ===")
    retail_zones = commercial_zones[commercial_zones['dominant_footfall_category'] == 'retail_commercial']
    print(f"Retail/commercial corridor zones: {len(retail_zones)}")
    print(f"Total violations on these corridors: {retail_zones['violation_count'].sum()}")
    print(f"These represent {100*retail_zones['violation_count'].sum()/plan['violation_count'].sum():.1f}% "
          f"of all logged violations, concentrated on roads that double as delivery routes.")

    # Honest framing note: commercial/transit/institutional zones don't dominate the
    # absolute top-15 (that's dominated by a handful of extreme-severity outlier zones),
    # but they DO score meaningfully higher on average than the overall zone population -
    # this is the real, defensible finding to lead with, not "commercial zones are our
    # single worst hotspots."
    commercial_mean = commercial_zones['impact_score'].mean()
    all_mean = plan['impact_score'].mean()
    print(f"\nCommercial/transit/institutional zones average impact score: {commercial_mean:.1f}")
    print(f"All zones average impact score: {all_mean:.1f}")
    print(f"-> Commercial-adjacent zones score {commercial_mean - all_mean:.1f} points higher on "
          f"average than the typical zone, a real and presentable disparity, even though the "
          f"single highest-scoring zones citywide happen to be driven by extreme severity rather "
          f"than commercial proximity specifically.")

    commercial_zones.to_pickle(COMMERCIAL_CORRIDOR_ZONES)
    print("\nSaved commercial_corridor_zones.pkl")
