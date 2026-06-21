"""
Step 1: Load data, parse fields, engineer base features
"""
import pandas as pd
import numpy as np
import ast
import re
from config import DATA_PATH, ENGINEERED_DATA

def safe_parse_list(x):
    try:
        result = ast.literal_eval(x)
        return result if isinstance(result, list) else []
    except Exception:
        return []

def classify_road_type(location):
    """Classify road criticality from the address string's first segment."""
    if pd.isna(location):
        return 'unknown'
    first_segment = location.split(',')[0].strip().lower()

    # High criticality - arterial/major roads
    arterial_keywords = ['main road', 'ring road', 'orr', 'highway', 'nh ', 'flyover',
                          'bypass', 'expressway', 'circle']
    # Medium criticality - junctions, named roads near infrastructure
    junction_keywords = ['junction', 'cross road', 'signal']
    # Low criticality - residential/unnamed
    residential_keywords = ['unnamed road', 'layout', 'colony', 'quarters']

    for kw in arterial_keywords:
        if kw in first_segment:
            return 'arterial'
    for kw in junction_keywords:
        if kw in first_segment:
            return 'junction'
    for kw in residential_keywords:
        if kw in first_segment:
            return 'residential'
    return 'local_road'

def classify_footfall_category(location):
    """
    Classify high-footfall infrastructure proximity from the address string.
    """
    if pd.isna(location):
        return 'none'
    loc = location.lower()
    first_segment = loc.split(',')[0].strip()

    retail_patterns = [r'\bmall\b', r'\bmarket\b', r'\bbazaar\b', r'\bcomplex\b', r'\bplaza\b',
                        r'\bshopping\b', r'\bcommercial street\b']
    transit_patterns = [r'\bmetro\b', r'\brailway station\b', r'\bbus station\b', r'\bbus stand\b',
                         r'\bbts\b.*\bstation\b']
    institutional_patterns = [r'\bhospital\b', r'\btheatre\b', r'\btheater\b']
    # these two require a first-segment match (road/street name) to avoid catching
    # residential complex/society names that merely contain the word
    temple_patterns = [r'\btemple\b']
    railway_first_seg_patterns = [r'\brailway\b']

    for p in retail_patterns:
        if re.search(p, loc):
            return 'retail_commercial'
    for p in transit_patterns:
        if re.search(p, loc):
            return 'transit_hub'
    for p in railway_first_seg_patterns:
        if re.search(p, first_segment):
            return 'transit_hub'
    for p in institutional_patterns:
        if re.search(p, loc):
            return 'institutional'
    for p in temple_patterns:
        if re.search(p, first_segment):
            return 'religious_site'
    return 'none'

def load_and_engineer():
    print("Loading raw data...")
    df = pd.read_csv(DATA_PATH, low_memory=False)
    print(f"Loaded {len(df)} rows")

    # Parse violation_type arrays
    df['violation_list'] = df['violation_type'].apply(safe_parse_list)
    df['n_violations'] = df['violation_list'].apply(len)

    # Parse timestamps
    df['created_datetime'] = pd.to_datetime(df['created_datetime'], errors='coerce', utc=True)
    df['hour'] = df['created_datetime'].dt.hour
    df['dow'] = df['created_datetime'].dt.dayofweek  # 0=Monday
    df['day_name'] = df['created_datetime'].dt.day_name()
    df['month'] = df['created_datetime'].dt.to_period('M').astype(str)
    df['date'] = df['created_datetime'].dt.date

    # Rush hour flag (7-10am, 5-9pm - standard Indian urban peak windows)
    df['is_rush_hour'] = df['hour'].apply(
        lambda h: (7 <= h <= 10) or (17 <= h <= 21) if pd.notna(h) else False
    )

    # Severity: presence of a genuinely high-impact obstruction type, not raw tag count.
    # Raw tag count is misleading here - investigation showed officers frequently apply
    # standardized 2-3 tag templates (e.g. "NO PARKING"+"WRONG PARKING"+"PARKING ON
    # FOOTPATH" fired together 11,427+ times) regardless of actual severity, so counting
    # tags would just measure tagging convention, not obstruction severity.
    SEVERE_VIOLATION_TYPES = {
        'PARKING IN A MAIN ROAD',
        'PARKING ON FOOTPATH',
        'PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC',
        'PARKING NEAR ROAD CROSSING',
        'PARKING NEAR TRAFFIC LIGHT OR ZEBRA CROSS',
        'DOUBLE PARKING',
        'PARKING OPPOSITE TO ANOTHER PARKED VEHICLE',
    }
    df['is_severe_stop'] = df['violation_list'].apply(
        lambda lst: any(v in SEVERE_VIOLATION_TYPES for v in lst)
    )

    # Road criticality classification
    df['road_type'] = df['location'].apply(classify_road_type)

    # High-footfall infrastructure proximity classification (retail/transit/institutional)
    df['footfall_category'] = df['location'].apply(classify_footfall_category)
    df['is_commercial_zone'] = df['footfall_category'] != 'none'

    # Drop rows with invalid coordinates
    df = df.dropna(subset=['latitude', 'longitude'])
    df = df[(df['latitude'].between(12.0, 14.0)) & (df['longitude'].between(76.0, 78.5))]

    print(f"After cleaning: {len(df)} rows")
    print(f"\nRoad type distribution:\n{df['road_type'].value_counts()}")
    print(f"\nCommercial zone flag: {df['is_commercial_zone'].sum()} ({100*df['is_commercial_zone'].mean():.1f}%)")
    print(f"\nFootfall category breakdown:\n{df['footfall_category'].value_counts()}")
    print(f"\nSevere (high-impact obstruction type) stops: {df['is_severe_stop'].sum()} ({100*df['is_severe_stop'].mean():.1f}%)")
    print(f"\nRush hour stops: {df['is_rush_hour'].sum()} ({100*df['is_rush_hour'].mean():.1f}%)")

    return df

if __name__ == '__main__':
    df = load_and_engineer()
    df.to_pickle(ENGINEERED_DATA)
    print("\nSaved to engineered_data.pkl")
