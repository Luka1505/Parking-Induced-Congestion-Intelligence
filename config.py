import os
from pathlib import Path

# All pipeline scripts and pickled intermediate outputs live alongside this file
PIPELINE_DIR = Path(__file__).resolve().parent

# Raw input CSV - override with: export PS1_DATA_PATH=/path/to/file.csv
DEFAULT_DATA_PATH = PIPELINE_DIR / 'jan to may police violation_anonymized791b166.csv'
DATA_PATH = Path(os.environ.get('PS1_DATA_PATH', str(DEFAULT_DATA_PATH)))

# Intermediate pickle outputs - all relative to PIPELINE_DIR
ENGINEERED_DATA = PIPELINE_DIR / 'engineered_data.pkl'
CLUSTERED_DATA = PIPELINE_DIR / 'clustered_data.pkl'
ZONE_SUMMARY = PIPELINE_DIR / 'zone_summary.pkl'
SCORED_ZONES = PIPELINE_DIR / 'scored_zones.pkl'
ZONE_TRENDS = PIPELINE_DIR / 'zone_trends.pkl'
EMERGING_HOTSPOTS = PIPELINE_DIR / 'emerging_hotspots.pkl'
ENFORCEMENT_PLAN = PIPELINE_DIR / 'enforcement_plan.pkl'
COMMERCIAL_CORRIDOR_ZONES = PIPELINE_DIR / 'commercial_corridor_zones.pkl'

EPS_TUNING_RESULTS = PIPELINE_DIR / 'eps_tuning_results.csv'
SENSITIVITY_RESULTS = PIPELINE_DIR / 'sensitivity_analysis_results.csv'
POST_EVENT_BACKTEST = PIPELINE_DIR / 'post_event_backtest.pkl'
INTERVENTION_EVENTS = PIPELINE_DIR / 'intervention_events.pkl'
INTERVENTION_LOG = PIPELINE_DIR / 'intervention_log.csv'

# UI export output. The React app serves files in public/ as runtime assets, so
# re-running the pipeline refreshes the same JSON file the app fetches.
UI_DATA_DIR = PIPELINE_DIR / 'public' / 'data'
UI_DATA_DIR.mkdir(parents=True, exist_ok=True)
UI_PIPELINE_OUTPUT = UI_DATA_DIR / 'dashboardData.json'
