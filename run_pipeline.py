"""
Usage:
    python3 run_pipeline.py                  # run the full production chain
    python3 run_pipeline.py --skip-diagnostics  # same (diagnostics are skipped by default)
    python3 run_pipeline.py --include-diagnostics  # also run 02b's eps tuning sweep

02b_tune_eps.py is intentionally NOT part of the default chain - it's a one-time
diagnostic sweep used to justify the clustering parameters, not a production dependency of any later script. Re-running it every
time would be slow for no benefit, so it's opt-in via --include-diagnostics.
"""
import subprocess
import sys
import time
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent

# Order matters - each script depends on outputs from the ones before it.
PRODUCTION_CHAIN = [
    '01_load_and_features.py',
    '02_clustering.py',
    '03_impact_score.py',
    '03b_sensitivity_analysis.py',
    '04_temporal_and_emerging.py',
    '05_enforcement_priority.py',
    '06_commercial_corridor.py',
    '08_post_event_learning.py',
    '10_intervention_tracker.py',
    '07_export_for_ui.py',  # runs LAST - it's the integration hub that reads
                              # outputs from 03b, 08, and 10 as optional extras,
                              # so those must already exist before this runs
]

DIAGNOSTIC_SCRIPTS = [
    '02b_tune_eps.py',  # one-time parameter justification sweep, not a production dependency
]

# 09 (Zone Risk Evaluator) and 11 (Deployment Allocator) are intentionally excluded
# from this chain - they're on-demand query tools (a class + functions you call with
# specific inputs), not batch steps that produce a pickle for the next script to
# consume. Their __main__ blocks are demo/test code, not pipeline stages.


def run_script(script_name):
    script_path = PIPELINE_DIR / script_name
    print(f"\n{'='*70}\nRunning {script_name}\n{'='*70}")
    start = time.time()
    result = subprocess.run([sys.executable, str(script_path)], cwd=str(PIPELINE_DIR))
    elapsed = time.time() - start
    if result.returncode != 0:
        print(f"\n FAILED: {script_name} exited with code {result.returncode} after {elapsed:.1f}s")
        return False
    print(f"\n OK: {script_name} completed in {elapsed:.1f}s")
    return True


def main():
    include_diagnostics = '--include-diagnostics' in sys.argv

    chain = list(PRODUCTION_CHAIN)
    if include_diagnostics:
        chain = DIAGNOSTIC_SCRIPTS + chain  # diagnostics first, since 02 depends on
                                              # the parameters they justify, not the
                                              # other way around

    print(f"PS1 Pipeline Orchestrator - running {len(chain)} scripts in order")
    if not include_diagnostics:
        print(f"(Skipping diagnostics: {DIAGNOSTIC_SCRIPTS}. Use --include-diagnostics to run them.)")

    overall_start = time.time()
    for script in chain:
        success = run_script(script)
        if not success:
            print(f"\nPipeline halted - fix the error in {script} before continuing.")
            sys.exit(1)

    total_elapsed = time.time() - overall_start
    print(f"\n{'='*70}")
    print(f"Pipeline complete: {len(chain)} scripts ran successfully in {total_elapsed:.1f}s")
    print(f"{'='*70}")
    print("\nOutputs ready. Dashboard data exported to public/data/dashboardData.json")
    print("To view refreshed results, run the React app with `npm run dev` or")
    print("rebuild it with `npm run build`. No HTML data-injection step is required.")


if __name__ == '__main__':
    main()
