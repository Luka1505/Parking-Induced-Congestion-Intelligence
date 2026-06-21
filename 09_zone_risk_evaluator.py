"""
Step 9: Zone Risk Evaluator (Options 2 & 4 merged)

A traffic officer or planner inputs a location (lat/long, road type, nearby landmark)
and gets back a risk assessment - this is the existing scoring pipeline exposed as an
on-demand lookup tool instead of only a batch report.

Two distinct cases, handled honestly and differently:

1. NEAR AN EXISTING ZONE (within proximity_radius_m of a known cluster): we have real
   historical data for this exact location. Return its actual impact score, patrol
   window, and confidence - this is the strong, well-grounded case.

2. NO NEARBY HISTORICAL DATA (a genuinely new/unmonitored location): we have no
   violation history here at all. We CANNOT claim to know its true risk - instead we
   compute a "structural risk estimate" using only the factors that don't require
   historical violations (road type criticality, footfall category from the landmark
   description), explicitly flagged as lower-confidence and explicitly excluding the
   density and severity components (which need real violation history to compute).
   This distinction matters: presenting a structural-only estimate with the same
   confidence as a data-backed one would be the same mistake we already caught and
   fixed twice in this project (the 'circle' bug, the low-sample-size patrol windows).
"""
import pandas as pd
import numpy as np
from config import ENFORCEMENT_PLAN

ROAD_TYPE_SCORE = {
    'arterial': 100, 'junction': 80, 'local_road': 50, 'residential': 20, 'unknown': 40,
}

FOOTFALL_KEYWORDS = {
    'retail_commercial': ['mall', 'market', 'bazaar', 'complex', 'plaza', 'shopping'],
    'transit_hub': ['metro', 'railway station', 'bus station', 'bus stand'],
    'institutional': ['hospital', 'theatre', 'theater'],
    'religious_site': ['temple'],
}

EARTH_RADIUS_M = 6371000

def haversine_m(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    return 2 * EARTH_RADIUS_M * np.arcsin(np.sqrt(a))

def classify_landmark_text(landmark_text):
    """Map free-text landmark description to a footfall category, reusing the same
    verified keyword set from script 01 (word-boundary equivalent via simple lowercase
    containment, acceptable here since this is a short user-typed phrase, not a full
    address string where false positives like 'Malleshwaram' could occur)."""
    if not landmark_text:
        return 'none'
    text = landmark_text.lower()
    for category, keywords in FOOTFALL_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return category
    return 'none'

class ZoneRiskEvaluator:
    def __init__(self, enforcement_plan_df):
        self.plan = enforcement_plan_df

    def evaluate(self, lat, lon, road_type='unknown', landmark_text=None, proximity_radius_m=150):
        """
        Returns a risk assessment dict. Always states which case applied (matched vs
        structural-only) so the caller/UI can render the confidence honestly.
        """
        distances = haversine_m(lat, lon, self.plan['centroid_lat'].values, self.plan['centroid_lon'].values)
        nearest_idx = np.argmin(distances)
        nearest_dist = distances[nearest_idx]

        if nearest_dist <= proximity_radius_m:
            zone = self.plan.iloc[nearest_idx]
            return {
                'case': 'matched_existing_zone',
                'matched_zone_id': int(zone['zone_id']),
                'distance_m': round(float(nearest_dist), 1),
                'impact_score': float(zone['impact_score']),
                'impact_category': zone['impact_category'],
                'violation_count': int(zone['violation_count']),
                'severe_stop_pct': round(float(zone['severe_stop_pct']), 1),
                'recommended_patrol_window': zone['recommended_patrol_window'],
                'window_confidence': zone['window_confidence'],
                'road_type': zone['road_type'],
                'footfall_category': zone['dominant_footfall_category'],
                'note': (f"Within {round(nearest_dist)}m of an existing monitored hotspot "
                         f"(Zone #{int(zone['zone_id'])}). This assessment uses real historical "
                         f"violation data, not a structural estimate.")
            }

        # No nearby historical data - structural-only estimate.
        # Only road criticality and footfall proximity are computable without history;
        # density and severity CANNOT be estimated for a location with zero recorded
        # violations, so they are explicitly excluded rather than guessed.
        footfall_category = classify_landmark_text(landmark_text)
        road_score = ROAD_TYPE_SCORE.get(road_type, 40)
        footfall_score = 100 if footfall_category != 'none' else 0

        # re-weight using ONLY the two computable factors, preserving their relative
        # weight from the full model (road_criticality:commercial_proximity = 25:15 = 5:3)
        structural_score = (5/8) * road_score + (3/8) * footfall_score

        nearest_zone = self.plan.iloc[nearest_idx]
        return {
            'case': 'structural_estimate_only',
            'nearest_zone_id': int(nearest_zone['zone_id']),
            'nearest_zone_distance_m': round(float(nearest_dist), 1),
            'structural_risk_score': round(float(structural_score), 1),
            'road_type': road_type,
            'footfall_category': footfall_category,
            'note': (
                f"No monitored hotspot within {proximity_radius_m}m (nearest is "
                f"{round(nearest_dist)}m away). This is a STRUCTURAL-ONLY estimate using "
                f"road type and landmark proximity alone - it does NOT include density or "
                f"severity, since there is no violation history at this location to measure "
                f"either from. Treat as a rough planning signal, not a validated risk score. "
                f"Recommend a manual spot-check before committing patrol resources here."
            )
        }


if __name__ == '__main__':
    plan = pd.read_pickle(ENFORCEMENT_PLAN)
    evaluator = ZoneRiskEvaluator(plan)

    print("=== Test case 1: location very close to a known high-impact zone ===")
    top_zone = plan.iloc[0]
    result = evaluator.evaluate(
        lat=top_zone['centroid_lat'] + 0.0005,  # ~55m offset
        lon=top_zone['centroid_lon'] + 0.0005,
        road_type='arterial',
    )
    for k, v in result.items():
        print(f"  {k}: {v}")

    print("\n=== Test case 2: genuinely new location, far from any monitored zone ===")
    result2 = evaluator.evaluate(
        lat=12.85, lon=77.40,  # far western edge, sparse in this dataset
        road_type='arterial',
        landmark_text='Near City Mall and bus stand',
    )
    for k, v in result2.items():
        print(f"  {k}: {v}")

    print("\n=== Test case 3: new residential location, no landmark ===")
    result3 = evaluator.evaluate(
        lat=12.85, lon=77.41,
        road_type='residential',
        landmark_text=None,
    )
    for k, v in result3.items():
        print(f"  {k}: {v}")
