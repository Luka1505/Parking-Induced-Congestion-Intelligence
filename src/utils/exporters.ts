import { saveAs } from "file-saver";
import Papa from "papaparse";
import type { Zone } from "../types/domain";
import { safeFileName } from "./format";

export type ExportScope = "filtered" | "selected" | "high-impact" | "emerging";

function zoneRows(zones: Zone[]) {
  return zones.map((zone) => ({
    zoneId: zone.zoneId,
    priorityRank: zone.priorityRank,
    location: zone.location,
    junction: zone.junction,
    lat: zone.lat,
    lon: zone.lon,
    impactScore: zone.impactScore,
    impactCategory: zone.impactCategory,
    violationCount: zone.violationCount,
    severeStopPct: zone.severeStopPct,
    rushHourPct: zone.rushHourPct,
    roadType: zone.roadType,
    footfallCategory: zone.footfallCategory,
    patrolWindow: zone.patrolWindow,
    windowConfidence: zone.windowConfidence,
    isEmerging: zone.isEmerging,
    contribDensity: zone.contribDensity,
    contribSeverity: zone.contribSeverity,
    contribRoad: zone.contribRoad,
    contribCommercial: zone.contribCommercial,
  }));
}

export function exportZonesCsv(zones: Zone[], label: string) {
  const csv = Papa.unparse(zoneRows(zones));
  saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${safeFileName(label)}.csv`);
}

export function exportZonesJson(zones: Zone[], label: string) {
  const json = JSON.stringify(zoneRows(zones), null, 2);
  saveAs(new Blob([json], { type: "application/json;charset=utf-8" }), `${safeFileName(label)}.json`);
}

export function exportSelectedZoneReport(zone: Zone) {
  const markdown = [
    `# Selected Zone Report: Zone ${zone.zoneId}`,
    "",
    `Location: ${zone.location}`,
    `Priority rank: ${zone.priorityRank}`,
    `Impact score: ${zone.impactScore} (${zone.impactCategory})`,
    `Violations: ${zone.violationCount}`,
    `Severe stop share: ${zone.severeStopPct}%`,
    `Rush-hour share: ${zone.rushHourPct}%`,
    `Road type: ${zone.roadType}`,
    `Commercial category: ${zone.footfallCategory}`,
    `Recommended patrol window: ${zone.patrolWindow}`,
    `Confidence: ${zone.windowConfidence}`,
    `Emerging hotspot: ${zone.isEmerging ? "yes" : "no"}`,
    "",
    "Score contributions:",
    `- Density: ${zone.contribDensity}%`,
    `- Severity: ${zone.contribSeverity}%`,
    `- Road criticality: ${zone.contribRoad}%`,
    `- Commercial proximity: ${zone.contribCommercial}%`,
  ].join("\n");

  saveAs(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), `zone-${zone.zoneId}-report.md`);
}

export function openPrintablePdfView(zones: Zone[], label: string) {
  const previousTitle = document.title;
  document.title = `Parking Intelligence - ${label}`;
  window.setTimeout(() => {
    window.print();
    document.title = previousTitle;
  }, 0);
}
