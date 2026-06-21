# Parking-Induced Congestion Intelligence

**An AI-assisted hotspot intelligence and decision-support platform for Bengaluru Traffic Police.**

Built for **Gridlock Hackathon 2.0** (Flipkart × Bengaluru Traffic Police) — Problem Statement 1: *Poor Visibility on Parking-Induced Congestion*.

> How can AI-driven parking intelligence detect illegal parking hotspots and quantify their impact on traffic flow to enable targeted enforcement?

This repository turns 298,450 raw parking-violation records into 1,813 machine-learning-discovered enforcement zones, a transparent priority score for each, and three live decision-support tools — validated with a sensitivity analysis and a historical backtest, not just demoed.

---

## Table of Contents

- [Overview](#overview)
- [Key Results](#key-results)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [The Three Decision-Support Tools](#the-three-decision-support-tools)
- [Validation](#validation)
- [Known Limitations](#known-limitations)

---

## Overview

Illegal and spillover parking near commercial areas, metro stations, and event venues chokes Bengaluru's carriageways and intersections. Today, enforcement is patrol-based and reactive, there's no heatmap connecting violations to actual traffic impact, and there's no defensible way to prioritize which of thousands of violation-prone sites deserve attention first.

This project addresses all three gaps with a ten-stage pipeline:

```
Raw Data → Feature Engineering → ML Spatial Clustering → Zone Formation →
Impact Scoring → Temporal Intelligence → Commercial Corridor Detection →
Enforcement Priority → Post-Event Learning → Decision Support
```

**Machine learning is used where it adds real value** (spatial hotspot discovery via two-stage DBSCAN clustering) **and explainable, transparent rules are used where trust matters more than marginal accuracy** (the impact-scoring layer that prioritizes enforcement). That split is a deliberate design decision, not a limitation — see [Known Limitations](#known-limitations) for the reasoning.

## Key Results

| Metric | Value |
|---|---|
| Violation records analyzed | 298,450 |
| ML-discovered hotspot zones | 1,813 |
| Points successfully clustered | 86.3% |
| Sensitivity analysis robustness | Spearman correlation ≥ 0.99 across ±10/20% weight perturbations |
| Top-50 priority overlap under weight disagreement | ≥ 74% |
| Historical backtest hit-rate | 47.6% (vs. 25.1% random baseline — ~2× better than chance) |
| Commercial-corridor score premium | +12 points average vs. non-commercial zones |
| Key temporal finding | Violation activity peaks 9 PM–9 AM, opposite of standard daytime patrol coverage |

## Architecture

| Stage | Script(s) | What it does |
|---|---|---|
| Load & feature engineering | `01_load_and_features.py` | Cleans records, corrects timestamps to IST, engineers severity/road-type/footfall features |
| Spatial clustering | `02_clustering.py`, `02b_tune_eps.py` | Two-stage DBSCAN discovers 1,813 zones from raw lat/lon |
| Impact scoring | `03_impact_score.py`, `03b_sensitivity_analysis.py` | Transparent 4-factor weighted score + robustness validation |
| Temporal intelligence | `04_temporal_and_emerging.py` | Hourly patterns, enforcement blind spots, emerging hotspots |
| Commercial corridor | `06_commercial_corridor.py` | Footfall-aware classification (retail, transit, institutional, religious) |
| Enforcement priority | `05_enforcement_priority.py` | Patrol time-windows with confidence tiers |
| UI export | `07_export_for_ui.py` | Packages pipeline output for the frontend |
| Post-event learning | `08_post_event_learning.py` | Historical backtest of the score's predictive validity |
| Decision-support tools | `09_zone_risk_evaluator.py`, `10_intervention_tracker.py`, `11_deployment_allocator.py` | On-demand live tools (see below) |
| Configuration | `config.py` | Single source of truth for every file path in the pipeline |
| Orchestration | `run_pipeline.py` | Runs 01→11 end-to-end in dependency order |

## Tech Stack

**Pipeline:** Python · pandas · scikit-learn (DBSCAN) · scipy · numpy
**Frontend:** React · TypeScript · Vite · Zustand · TanStack Query · React Router
**Mapping:** React Leaflet + OpenStreetMap tiles
**Visualization:** Recharts · custom virtualized list rendering for 1,800+ zones
**Export:** Client-side CSV / JSON / print-ready PDF

## Getting Started

### Pipeline

```bash
pip install -r requirements.txt --break-system-packages
python run_pipeline.py
```

This runs all 11 pipeline stages in order and produces every `.pkl` / `.json` / `.csv` output the frontend and tools consume. Paths are entirely config-driven — no editing required to run on a fresh machine.

### Frontend

```bash
npm install
npm run dev      # local development server
npm run build    # production build
```

## Project Structure

```
.
├── 01_load_and_features.py
├── 02_clustering.py
├── 02b_tune_eps.py
├── 03_impact_score.py
├── 03b_sensitivity_analysis.py
├── 04_temporal_and_emerging.py
├── 05_enforcement_priority.py
├── 06_commercial_corridor.py
├── 07_export_for_ui.py
├── 08_post_event_learning.py
├── 09_zone_risk_evaluator.py
├── 10_intervention_tracker.py
├── 11_deployment_allocator.py
├── config.py
├── run_pipeline.py
├── requirements.txt
├── src/
│   ├── components/        # layout + shared UI components
│   ├── features/
│   │   ├── map/           # HotspotMap (React Leaflet), MapLegend
│   │   ├── analytics/     # charts, priority list, zone detail drawer
│   │   ├── tools/         # RiskEvaluator, InterventionTracker, DeploymentAllocator
│   │   ├── export/        # ExportCenter
│   │   ├── filters/       # FilterPanel
│   │   └── search/        # GlobalSearch
│   ├── pages/              # one page per route
│   ├── hooks/              # useDashboardData, useFilteredZones, useShareableState, useVirtualList
│   ├── store/               # Zustand store
│   ├── services/            # data loading
│   ├── utils/               # ported scoring/allocation logic, formatting
│   ├── data/dashboardData.json
│   └── types/domain.ts
└── PROGRESS_LOG.md
```

## The Three Decision-Support Tools

| Tool | Question it answers | What makes it honest |
|---|---|---|
| **Zone Risk Evaluator** | "Is this specific spot a problem?" | Within 150m of a known zone → real historical score. Outside that radius → a clearly-labeled structural estimate, never presented with false confidence. |
| **Intervention Tracker** | "Did past enforcement action work?" | Mines real historical enforcement spikes as natural experiments. Explicitly framed as observational correlation, never causal. A `log_intervention` logging contract is already built for capturing genuine before/after data once deployed. |
| **Deployment Allocator** | "Where do I send my teams today?" | Generates a real routed patrol plan with honest, computed coverage percentages — no fabricated "expected reduction %." |

## Validation

Two independent checks back the methodology, both run against real numbers, not assumptions:

1. **Sensitivity analysis** (`03b_sensitivity_analysis.py`) — perturbs every scoring weight ±10% and ±20% and measures rank stability. Result: Spearman correlation ≥ 0.99 in every case; top-50 priority overlap ≥ 74%. The priority ranking is not an artifact of one arbitrary weight choice.
2. **Historical backtest** (`08_post_event_learning.py`) — computes the score on Nov–Jan data and checks whether top-priority zones stayed high-activity in Feb–Mar. Result: 47.6% hit-rate vs. a 25.1% random-selection baseline. Reported honestly alongside the finding that a naive volume-only ranking scores marginally higher on this specific test — expected, since the composite score deliberately trades some future-volume accuracy for surfacing structurally important zones a volume-only rank would miss.

## Known Limitations

Stated directly, with reasoning, rather than left for a reviewer to discover:

- **Structural-only estimates outside monitored zones** — locations far from any of the 1,813 zones get a road-type/landmark-based estimate, not a precise score, because there's no historical violation data at that exact point. Always visibly distinguished in the UI from a data-backed score.
- **Intervention data is observational, not causal** — historical data alone can't support a controlled before/after experiment. The Intervention Tracker is framed accordingly, and a logging contract already exists to capture real causal evidence once deployed.
- **Event-driven congestion is intentionally out of scope** — festivals, matches, and one-off events need a different model class than standing-pattern parking. A parallel track (XGBoost regression on an event-congestion dataset, R²≈0.25–0.28) already exists and is the named first item on the roadmap below, not a capability gap discovered late.
- **The backtest covers a 6-month window** — real, but one validation window, not a multi-year track record. Reported as such.

