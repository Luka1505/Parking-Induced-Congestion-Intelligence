"""
Step 2b: Tune DBSCAN epsilon to avoid chaining mega-clusters
"""
import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from config import ENGINEERED_DATA, EPS_TUNING_RESULTS

def test_eps(df, eps_meters, min_samples):
    coords = df[['latitude', 'longitude']].values
    coords_rad = np.radians(coords)
    earth_radius_m = 6371000
    eps_rad = eps_meters / earth_radius_m

    db = DBSCAN(eps=eps_rad, min_samples=min_samples, metric='haversine', algorithm='ball_tree')
    labels = db.fit_predict(coords_rad)

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = (labels == -1).sum()

    # check cluster size distribution - look for mega-cluster problem
    sizes = pd.Series(labels[labels != -1]).value_counts()
    max_size = sizes.max() if len(sizes) > 0 else 0
    max_size_pct = 100 * max_size / len(df)
    top5_pct = 100 * sizes.head(5).sum() / len(df)

    return {
        'eps_m': eps_meters,
        'min_samples': min_samples,
        'n_clusters': n_clusters,
        'noise_pct': 100 * n_noise / len(df),
        'largest_cluster_size': max_size,
        'largest_cluster_pct': max_size_pct,
        'top5_clusters_pct': top5_pct,
    }

if __name__ == '__main__':
    df = pd.read_pickle(ENGINEERED_DATA)

    results = []
    for eps in [15, 20, 25, 30, 40, 50]:
        for ms in [10, 15, 20]:
            r = test_eps(df, eps, ms)
            results.append(r)
            print(r)

    results_df = pd.DataFrame(results)
    results_df.to_csv(EPS_TUNING_RESULTS, index=False)
