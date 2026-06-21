"""
Step 2: Hotspot clustering (DBSCAN with haversine distance)
"""
import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from collections import Counter
from config import ENGINEERED_DATA, CLUSTERED_DATA, ZONE_SUMMARY

def _dbscan_pass(coords, eps_meters, min_samples):
    coords_rad = np.radians(coords)
    earth_radius_m = 6371000
    eps_rad = eps_meters / earth_radius_m
    db = DBSCAN(eps=eps_rad, min_samples=min_samples, metric='haversine', algorithm='ball_tree')
    return db.fit_predict(coords_rad)

def run_clustering(df, eps_meters=15, min_samples=10, max_zone_size=3000, sub_eps_meters=8, sub_min_samples=8):
    """
    Two-stage DBSCAN clustering on lat/long using haversine distance.

    Bengaluru's old-city commercial areas (Chickpete/City Market/Gandhi Nagar) are
    continuously dense with no spatial gaps, so a single DBSCAN pass chains them into
    one mega-cluster spanning ~2km - useless for patrol targeting. Stage 2 re-splits
    any cluster above max_zone_size with a tighter epsilon to recover patrol-actionable
    sub-zones (street-corner scale, not district scale).

    eps_meters: max distance between points in a cluster (stage 1, street-segment scale)
    min_samples: min points to form a dense cluster (filters noise/one-off violations)
    max_zone_size: clusters larger than this get sub-clustered
    sub_eps_meters / sub_min_samples: tighter params for stage-2 splitting
    """
    df = df.copy()
    coords = df[['latitude', 'longitude']].values

    print(f"Stage 1 DBSCAN: eps={eps_meters}m, min_samples={min_samples}")
    labels = _dbscan_pass(coords, eps_meters, min_samples)
    df['zone_id'] = labels

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = (labels == -1).sum()
    print(f"Stage 1 clusters: {n_clusters}, noise: {n_noise} ({100*n_noise/len(df):.1f}%)")

    # Stage 2: re-split any oversized mega-cluster into patrol-actionable sub-zones
    sizes = df[df['zone_id'] != -1]['zone_id'].value_counts()
    mega_clusters = sizes[sizes > max_zone_size].index.tolist()
    print(f"Mega-clusters above {max_zone_size} points needing sub-split: {len(mega_clusters)}")

    next_zone_id = df['zone_id'].max() + 1
    for mega_id in mega_clusters:
        mask = df['zone_id'] == mega_id
        sub_coords = df.loc[mask, ['latitude', 'longitude']].values
        sub_labels = _dbscan_pass(sub_coords, sub_eps_meters, sub_min_samples)

        # remap sub-labels to fresh global zone_ids; sub-noise (-1) becomes its own catch-all zone
        sub_label_map = {}
        new_labels = []
        for lbl in sub_labels:
            if lbl == -1:
                new_labels.append(-2)  # temp marker for "mega-cluster noise", handled below
                continue
            if lbl not in sub_label_map:
                sub_label_map[lbl] = next_zone_id
                next_zone_id += 1
            new_labels.append(sub_label_map[lbl])

        df.loc[mask, 'zone_id'] = new_labels

    # mega-cluster noise points (-2) get folded back into overall noise (-1)
    df.loc[df['zone_id'] == -2, 'zone_id'] = -1

    n_clusters_final = len(set(df['zone_id'])) - (1 if -1 in df['zone_id'].values else 0)
    n_noise_final = (df['zone_id'] == -1).sum()
    print(f"\nFinal clusters: {n_clusters_final}")
    print(f"Final noise points: {n_noise_final} ({100*n_noise_final/len(df):.1f}%)")
    print(f"Final clustered points: {len(df) - n_noise_final} ({100*(len(df)-n_noise_final)/len(df):.1f}%)")

    final_sizes = df[df['zone_id'] != -1]['zone_id'].value_counts()
    print(f"Largest final zone: {final_sizes.max()} points ({100*final_sizes.max()/len(df):.1f}% of data)")

    return df

def summarize_zones(df):
    """Build a per-zone summary table from clustered data."""
    clustered = df[df['zone_id'] != -1].copy()

    zone_summary = []
    for zone_id, group in clustered.groupby('zone_id'):
        # dominant violation types
        all_viols = Counter()
        for lst in group['violation_list']:
            all_viols.update(lst)
        top_violations = [v for v, c in all_viols.most_common(3)]

        # dominant road type and commercial flag (mode)
        road_type = group['road_type'].mode().iloc[0] if not group['road_type'].mode().empty else 'unknown'
        is_commercial = group['is_commercial_zone'].mean() > 0.5
        # dominant footfall category for this zone (most common non-"none" wins if present)
        footfall_counts = group['footfall_category'].value_counts()
        dominant_footfall = footfall_counts.index[0] if not footfall_counts.empty else 'none'

        # representative location string (most common)
        rep_location = group['location'].mode().iloc[0] if not group['location'].mode().empty else None
        rep_junction = group['junction_name'].mode().iloc[0] if not group['junction_name'].mode().empty else None

        zone_summary.append({
            'zone_id': zone_id,
            'centroid_lat': group['latitude'].mean(),
            'centroid_lon': group['longitude'].mean(),
            'violation_count': len(group),
            'severe_stop_count': group['is_severe_stop'].sum(),
            'severe_stop_pct': 100 * group['is_severe_stop'].mean(),
            'rush_hour_count': group['is_rush_hour'].sum(),
            'rush_hour_pct': 100 * group['is_rush_hour'].mean(),
            'top_violations': top_violations,
            'road_type': road_type,
            'is_commercial_zone': is_commercial,
            'dominant_footfall_category': dominant_footfall,
            'representative_location': rep_location,
            'representative_junction': rep_junction,
            'unique_vehicles': group['vehicle_number'].nunique(),
            'date_range_days': (group['created_datetime'].max() - group['created_datetime'].min()).days,
        })

    zone_df = pd.DataFrame(zone_summary).sort_values('violation_count', ascending=False)
    return zone_df

if __name__ == '__main__':
    df = pd.read_pickle(ENGINEERED_DATA)

    clustered_df = run_clustering(df, eps_meters=15, min_samples=10, max_zone_size=3000,
                                   sub_eps_meters=8, sub_min_samples=8)

    zone_df = summarize_zones(clustered_df)
    print(f"\nTotal zones: {len(zone_df)}")
    print(f"\nTop 15 zones by violation count:")
    print(zone_df[['zone_id', 'violation_count', 'severe_stop_pct', 'rush_hour_pct',
                    'road_type', 'is_commercial_zone', 'representative_location']].head(15).to_string())

    clustered_df.to_pickle(CLUSTERED_DATA)
    zone_df.to_pickle(ZONE_SUMMARY)
    print("\nSaved clustered_data.pkl and zone_summary.pkl")
