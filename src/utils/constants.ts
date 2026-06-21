import type { AreaBounds, ConfidenceTier, FootfallCategory, ImpactCategory, RoadType, WindowConfidence } from "../types/domain";

export const HOUR_LABELS = [
  "12a",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12p",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
];

export const IMPACT_COLORS: Record<ImpactCategory, string> = {
  High: "#cf3f38",
  Medium: "#b87416",
  Low: "#218763",
};

export const CONFIDENCE_COLORS: Record<ConfidenceTier, string> = {
  High: "#218763",
  Medium: "#b87416",
  Low: "#64748b",
};

export const FOOTFALL_LABELS: Record<FootfallCategory, string | null> = {
  retail_commercial: "Retail / Commercial",
  transit_hub: "Transit Hub",
  institutional: "Hospital / Institutional",
  religious_site: "Religious Site",
  none: null,
};

export const CONFIDENCE_TEXT: Record<string, { text: string; tier: ConfidenceTier; color: string }> = {
  high_concentration: { text: "High confidence", tier: "High", color: CONFIDENCE_COLORS.High },
  diffuse: { text: "Diffuse pattern", tier: "Medium", color: CONFIDENCE_COLORS.Medium },
  low_sample_size: { text: "Low sample size", tier: "Low", color: CONFIDENCE_COLORS.Low },
  no_data: { text: "No data", tier: "Low", color: CONFIDENCE_COLORS.Low },
};

export const ROAD_TYPE_SCORE: Record<string, number> = {
  arterial: 100,
  junction: 80,
  local_road: 50,
  residential: 20,
  unknown: 40,
};

export const LANDMARK_KEYWORDS: Record<string, string[]> = {
  retail_commercial: ["mall", "market", "bazaar", "complex", "plaza", "shopping"],
  transit_hub: ["metro", "railway station", "bus station", "bus stand"],
  institutional: ["hospital", "theatre", "theater"],
  religious_site: ["temple"],
};

export const AREA_BOUNDS: Record<string, AreaBounds | null> = {
  all: null,
  east: { minLat: 12.95, maxLat: 13.05, minLon: 77.65, maxLon: 77.78 },
  north: { minLat: 13.02, maxLat: 13.25, minLon: 77.46, maxLon: 77.65 },
  south: { minLat: 12.82, maxLat: 12.95, minLon: 77.46, maxLon: 77.65 },
};

export const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];

export const DEFAULT_ROAD_TYPES: RoadType[] = ["arterial", "junction", "local_road", "residential", "unknown"];

export function confidenceTier(windowConfidence: WindowConfidence): ConfidenceTier {
  return CONFIDENCE_TEXT[windowConfidence]?.tier ?? "Low";
}

export function footfallLabel(category: FootfallCategory): string {
  return FOOTFALL_LABELS[category] ?? category.replaceAll("_", " ");
}

export function impactColor(category: ImpactCategory): string {
  return IMPACT_COLORS[category];
}
