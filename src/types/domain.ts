export type ImpactCategory = "High" | "Medium" | "Low";

export type RoadType = "arterial" | "junction" | "local_road" | "residential" | "unknown" | string;

export type FootfallCategory =
  | "retail_commercial"
  | "transit_hub"
  | "institutional"
  | "religious_site"
  | "none"
  | string;

export type WindowConfidence = "high_concentration" | "diffuse" | "low_sample_size" | "no_data" | string;

export type ConfidenceTier = "High" | "Medium" | "Low";

export interface SummaryStats {
  totalViolationsRaw: number;
  totalViolationsClustered: number;
  noisePointCount: number;
  totalZones: number;
  highImpactZones: number;
  mediumImpactZones: number;
  lowImpactZones: number;
  noDaytimeDataPct: number;
  emergingHotspotCount: number;
  dateRange: string;
}

export interface Zone {
  zoneId: number;
  lat: number;
  lon: number;
  violationCount: number;
  severeStopPct: number;
  rushHourPct: number;
  roadType: RoadType;
  footfallCategory: FootfallCategory;
  location: string;
  junction: string | null;
  impactScore: number;
  impactCategory: ImpactCategory;
  contribDensity: number;
  contribSeverity: number;
  contribRoad: number;
  contribCommercial: number;
  patrolWindow: string;
  windowConfidence: WindowConfidence;
  noDaytimeData: boolean;
  priorityRank: number;
  isEmerging: boolean;
}

export interface EmergingHotspot {
  zoneId: number;
  location: string;
  recentTotal: number;
  pctChange: number;
  impactScore: number | null;
}

export interface PostEventLearning {
  trainMonths: string;
  testMonths: string;
  zonesTestedBoth: number;
  spearmanCorr: number;
  randomBaselineHitRate: number;
  compositeScoreHitRate: number;
  naiveVolumeHitRate: number;
}

export type FollowupCategory =
  | "dropped_sharply"
  | "partial_decline"
  | "sustained_high"
  | "no_followup_data"
  | string;

export interface InterventionEvent {
  zoneId: number;
  location: string;
  baselineMonth: string;
  baselineCount: number;
  spikeMonth: string;
  spikeCount: number;
  followupMonth: string | null;
  followupCount: number | null;
  followupCategory: FollowupCategory;
}

export interface InterventionTracking {
  totalEventsFound: number;
  eventsWithFollowup: number;
  categoryCounts: Record<FollowupCategory, number>;
  sampleEvents: InterventionEvent[];
}

export interface DashboardData {
  summaryStats: SummaryStats;
  citywideHourly: number[];
  citywideDow: number[];
  dowLabels: string[];
  zones: Zone[];
  emergingHotspots: EmergingHotspot[];
  postEventLearning: PostEventLearning | null;
  interventionTracking: InterventionTracking | null;
}

export interface DashboardFilters {
  impactCategory: ImpactCategory | "All";
  roadTypes: RoadType[];
  confidenceTiers: ConfidenceTier[];
  commercialOnly: boolean;
  emergingOnly: boolean;
  highPriorityOnly: boolean;
  minViolations: number;
  maxViolations: number;
  patrolWindow: "All" | "Daytime" | "Evening" | "Night";
}

export type SortMode = "priority" | "impact" | "volume" | "confidence";

export interface MapState {
  center: [number, number];
  zoom: number;
}

export interface AreaBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface DeploymentStats {
  zonesCovered: number;
  severeCoveragePct: number;
  violationCoveragePct: number;
  totalViolationsInPlan: number;
  severeViolationsInPlan: number;
}

export interface DeploymentPlan {
  teams: Zone[][];
  warning: string | null;
  stats: DeploymentStats;
}

export type RiskEvaluation =
  | {
      case: "matched_existing_zone";
      zone: Zone;
      distanceM: number;
    }
  | {
      case: "structural_estimate_only";
      structuralScore: number;
      roadType: RoadType;
      footfallCategory: FootfallCategory;
      nearestZone: Zone;
      nearestDistM: number;
    };

export interface SearchResult {
  zone: Zone;
  label: string;
  subLabel: string;
  matchText: string;
}
