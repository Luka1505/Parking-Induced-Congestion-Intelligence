import type {
  AreaBounds,
  ConfidenceTier,
  DashboardFilters,
  DeploymentPlan,
  FootfallCategory,
  ImpactCategory,
  RiskEvaluation,
  RoadType,
  SearchResult,
  SortMode,
  Zone,
} from "../types/domain";
import { confidenceTier, LANDMARK_KEYWORDS, ROAD_TYPE_SCORE } from "./constants";
import { shortLocation } from "./format";

export function isCommercialZone(zone: Zone): boolean {
  return zone.footfallCategory !== "none";
}

export function getRoadName(zone: Zone): string {
  return zone.location.split(",")[0]?.trim() || `Zone ${zone.zoneId}`;
}

export function getPoliceStationText(zone: Zone): string {
  return zone.junction && zone.junction !== "No Junction" ? zone.junction : "";
}

export function getConfidenceTier(zone: Zone): ConfidenceTier {
  return confidenceTier(zone.windowConfidence);
}

function patrolWindowMatches(zone: Zone, filter: DashboardFilters["patrolWindow"]): boolean {
  if (filter === "All") return true;
  const hours = [...zone.patrolWindow.matchAll(/(\d{2}):00/g)].map((match) => Number(match[1]));
  if (!hours.length) return false;
  if (filter === "Daytime") return hours.some((hour) => hour >= 10 && hour < 18);
  if (filter === "Evening") return hours.some((hour) => hour >= 18 && hour < 22);
  return hours.some((hour) => hour >= 22 || hour < 6);
}

export function filterZones(zones: Zone[], filters: DashboardFilters, searchQuery = ""): Zone[] {
  const query = searchQuery.trim().toLowerCase();
  return zones.filter((zone) => {
    if (filters.impactCategory !== "All" && zone.impactCategory !== filters.impactCategory) return false;
    if (filters.roadTypes.length && !filters.roadTypes.includes(zone.roadType)) return false;
    if (filters.confidenceTiers.length && !filters.confidenceTiers.includes(getConfidenceTier(zone))) return false;
    if (filters.commercialOnly && !isCommercialZone(zone)) return false;
    if (filters.emergingOnly && !zone.isEmerging) return false;
    if (filters.highPriorityOnly && zone.impactCategory !== "High") return false;
    if (zone.violationCount < filters.minViolations || zone.violationCount > filters.maxViolations) return false;
    if (!patrolWindowMatches(zone, filters.patrolWindow)) return false;
    if (!query) return true;

    const haystack = [
      String(zone.zoneId),
      zone.location,
      zone.junction ?? "",
      getRoadName(zone),
      zone.roadType,
      zone.footfallCategory,
      zone.impactCategory,
      zone.patrolWindow,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function sortZones(zones: Zone[], sortMode: SortMode): Zone[] {
  const sorted = [...zones];
  if (sortMode === "priority") sorted.sort((a, b) => a.priorityRank - b.priorityRank);
  if (sortMode === "impact") sorted.sort((a, b) => b.impactScore - a.impactScore || a.priorityRank - b.priorityRank);
  if (sortMode === "volume") sorted.sort((a, b) => b.violationCount - a.violationCount);
  if (sortMode === "confidence") {
    const order: Record<ConfidenceTier, number> = { High: 0, Medium: 1, Low: 2 };
    sorted.sort((a, b) => order[getConfidenceTier(a)] - order[getConfidenceTier(b)] || a.priorityRank - b.priorityRank);
  }
  return sorted;
}

export function summarizeZones(zones: Zone[]) {
  const totalViolations = zones.reduce((sum, zone) => sum + zone.violationCount, 0);
  const severeViolations = zones.reduce((sum, zone) => sum + zone.violationCount * (zone.severeStopPct / 100), 0);
  const highImpact = zones.filter((zone) => zone.impactCategory === "High").length;
  const emerging = zones.filter((zone) => zone.isEmerging).length;
  const commercial = zones.filter(isCommercialZone).length;
  const averageImpact = zones.length ? zones.reduce((sum, zone) => sum + zone.impactScore, 0) / zones.length : 0;

  return {
    totalViolations,
    severeViolations,
    highImpact,
    emerging,
    commercial,
    averageImpact: Math.round(averageImpact * 10) / 10,
  };
}

export function searchZones(zones: Zone[], query: string, limit = 8): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored = zones
    .map((zone) => {
      const road = getRoadName(zone);
      const station = getPoliceStationText(zone);
      const fields = [
        { key: "Zone ID", value: String(zone.zoneId), weight: 120 },
        { key: "Road", value: road, weight: 80 },
        { key: "Police station", value: station, weight: 70 },
        { key: "Commercial area", value: zone.footfallCategory, weight: 60 },
        { key: "Area", value: zone.location, weight: 40 },
      ];
      let score = 0;
      let matchText = "";
      for (const field of fields) {
        const value = field.value.toLowerCase();
        if (value === q) score += field.weight * 2;
        if (value.startsWith(q)) score += field.weight;
        if (value.includes(q)) {
          score += field.weight / 2;
          matchText ||= `${field.key}: ${field.value}`;
        }
      }
      return {
        score,
        result: {
          zone,
          label: `Zone #${zone.zoneId} - ${shortLocation(zone.location)}`,
          subLabel: `${zone.impactCategory} impact | ${zone.patrolWindow}`,
          matchText: matchText || zone.location,
        },
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.result.zone.priorityRank - b.result.zone.priorityRank)
    .slice(0, limit);

  return scored.map(({ result }) => result);
}

export function getCategoryCounts(zones: Zone[]) {
  return zones.reduce(
    (counts, zone) => {
      counts[zone.impactCategory] += 1;
      return counts;
    },
    { High: 0, Medium: 0, Low: 0 } satisfies Record<ImpactCategory, number>,
  );
}

export function getRoadTypeCounts(zones: Zone[]) {
  const counts = new Map<string, number>();
  for (const zone of zones) counts.set(zone.roadType, (counts.get(zone.roadType) ?? 0) + 1);
  return [...counts.entries()].map(([roadType, count]) => ({ roadType, count })).sort((a, b) => b.count - a.count);
}

export function getCommercialSummary(zones: Zone[]) {
  const summary = new Map<string, { category: FootfallCategory; zoneCount: number; totalViolations: number; avgImpactScore: number; highImpactCount: number }>();
  for (const zone of zones.filter(isCommercialZone)) {
    const current =
      summary.get(zone.footfallCategory) ??
      ({ category: zone.footfallCategory, zoneCount: 0, totalViolations: 0, avgImpactScore: 0, highImpactCount: 0 } as const);
    const next = {
      category: current.category,
      zoneCount: current.zoneCount + 1,
      totalViolations: current.totalViolations + zone.violationCount,
      avgImpactScore: current.avgImpactScore + zone.impactScore,
      highImpactCount: current.highImpactCount + (zone.impactCategory === "High" ? 1 : 0),
    };
    summary.set(zone.footfallCategory, next);
  }
  return [...summary.values()]
    .map((row) => ({ ...row, avgImpactScore: row.zoneCount ? Math.round((row.avgImpactScore / row.zoneCount) * 10) / 10 : 0 }))
    .sort((a, b) => b.zoneCount - a.zoneCount);
}

export function buildCommercialCorridors(zones: Zone[]) {
  const groups = new Map<string, Zone[]>();
  for (const zone of zones.filter(isCommercialZone)) {
    const road = getRoadName(zone);
    groups.set(road, [...(groups.get(road) ?? []), zone]);
  }

  return [...groups.entries()]
    .map(([roadName, roadZones]) => ({
      roadName,
      zones: roadZones.sort((a, b) => a.lat - b.lat || a.lon - b.lon),
      totalViolations: roadZones.reduce((sum, zone) => sum + zone.violationCount, 0),
      averageImpact: roadZones.reduce((sum, zone) => sum + zone.impactScore, 0) / roadZones.length,
    }))
    .filter((corridor) => corridor.zones.length > 1)
    .sort((a, b) => b.totalViolations - a.totalViolations)
    .slice(0, 25);
}

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusM = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusM * Math.asin(Math.sqrt(a));
}

export function classifyLandmarkText(text: string | null | undefined): FootfallCategory {
  if (!text) return "none";
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(LANDMARK_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) return category;
  }
  return "none";
}

export function evaluateZoneRisk(
  zones: Zone[],
  lat: number,
  lon: number,
  roadType: RoadType,
  landmarkText: string,
  proximityRadiusM = 150,
): RiskEvaluation {
  let nearestDist = Infinity;
  let nearestZone = zones[0];

  for (const zone of zones) {
    const distance = haversineM(lat, lon, zone.lat, zone.lon);
    if (distance < nearestDist) {
      nearestDist = distance;
      nearestZone = zone;
    }
  }

  if (nearestDist <= proximityRadiusM) {
    return {
      case: "matched_existing_zone",
      zone: nearestZone,
      distanceM: Math.round(nearestDist),
    };
  }

  const footfallCategory = classifyLandmarkText(landmarkText);
  const roadScore = ROAD_TYPE_SCORE[roadType] ?? 40;
  const footfallScore = footfallCategory !== "none" ? 100 : 0;
  const structuralScore = (5 / 8) * roadScore + (3 / 8) * footfallScore;

  return {
    case: "structural_estimate_only",
    structuralScore: Math.round(structuralScore * 10) / 10,
    roadType,
    footfallCategory,
    nearestZone,
    nearestDistM: Math.round(nearestDist),
  };
}

export function nearestNeighborRoute(zones: Zone[]): Zone[] {
  const remaining = [...zones];
  const first = remaining.shift();
  if (!first) return [];

  const route = [first];
  let current = first;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    remaining.forEach((zone, index) => {
      const distance = haversineM(current.lat, current.lon, zone.lat, zone.lon);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    current = remaining.splice(bestIndex, 1)[0];
    route.push(current);
  }

  return route;
}

export function allocateDeployment(zones: Zone[], nTeams: number, stopsPerTeam: number, areaBounds?: AreaBounds | null): DeploymentPlan {
  let pool = areaBounds
    ? zones.filter(
        (zone) =>
          zone.lat >= areaBounds.minLat &&
          zone.lat <= areaBounds.maxLat &&
          zone.lon >= areaBounds.minLon &&
          zone.lon <= areaBounds.maxLon,
      )
    : zones;

  pool = [...pool].sort((a, b) => b.impactScore - a.impactScore);

  let needed = nTeams * stopsPerTeam;
  let actualStopsPerTeam = stopsPerTeam;
  let warning: string | null = null;

  if (pool.length < needed) {
    actualStopsPerTeam = Math.max(1, Math.floor(pool.length / nTeams));
    needed = nTeams * actualStopsPerTeam;
    warning = `Only ${pool.length} zones are available in this area for ${nTeams} teams; reduced to ${actualStopsPerTeam} stops/team.`;
  }

  const selected = pool.slice(0, needed);
  const teamGroups = Array.from({ length: nTeams }, () => [] as Zone[]);
  selected.forEach((zone, index) => teamGroups[index % nTeams].push(zone));
  const teams = teamGroups.map((group) => nearestNeighborRoute(group));

  const totalSevere = zones.reduce((sum, zone) => sum + zone.violationCount * (zone.severeStopPct / 100), 0);
  const totalViolations = zones.reduce((sum, zone) => sum + zone.violationCount, 0);
  const coveredSevere = selected.reduce((sum, zone) => sum + zone.violationCount * (zone.severeStopPct / 100), 0);
  const coveredViolations = selected.reduce((sum, zone) => sum + zone.violationCount, 0);

  return {
    teams,
    warning,
    stats: {
      zonesCovered: selected.length,
      severeCoveragePct: Math.round((1000 * coveredSevere) / totalSevere) / 10,
      violationCoveragePct: Math.round((1000 * coveredViolations) / totalViolations) / 10,
      severeViolationsInPlan: Math.round(coveredSevere),
      totalViolationsInPlan: coveredViolations,
    },
  };
}
