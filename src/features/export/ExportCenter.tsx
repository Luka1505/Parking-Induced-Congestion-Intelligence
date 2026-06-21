import { Download, FileJson, FileText, Printer } from "lucide-react";
import type { Zone } from "../../types/domain";
import { Panel } from "../../components/ui/Panel";
import { Badge } from "../../components/ui/Badge";
import { exportSelectedZoneReport, exportZonesCsv, exportZonesJson, openPrintablePdfView } from "../../utils/exporters";
import { fmtNum, shortLocation } from "../../utils/format";

interface ExportCenterProps {
  allZones: Zone[];
  filteredZones: Zone[];
  selectedZone: Zone | null;
}

export function ExportCenter({ allZones, filteredZones, selectedZone }: ExportCenterProps) {
  const highImpact = allZones.filter((zone) => zone.impactCategory === "High");
  const emerging = allZones.filter((zone) => zone.isEmerging);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Filtered zones" value={fmtNum(filteredZones.length)} />
        <Metric label="High impact zones" value={fmtNum(highImpact.length)} />
        <Metric label="Emerging hotspots" value={fmtNum(emerging.length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ExportCard
          title="Filtered View"
          count={filteredZones.length}
          description="Current filters, search, and map state."
          actions={[
            { label: "CSV", icon: <Download className="h-4 w-4" />, onClick: () => exportZonesCsv(filteredZones, "filtered-zones") },
            { label: "JSON", icon: <FileJson className="h-4 w-4" />, onClick: () => exportZonesJson(filteredZones, "filtered-zones") },
            { label: "PDF", icon: <Printer className="h-4 w-4" />, onClick: () => openPrintablePdfView(filteredZones, "Filtered View") },
          ]}
        />
        <ExportCard
          title="High Impact Zones"
          count={highImpact.length}
          description="All zones in the high impact tier."
          actions={[
            { label: "CSV", icon: <Download className="h-4 w-4" />, onClick: () => exportZonesCsv(highImpact, "high-impact-zones") },
            { label: "JSON", icon: <FileJson className="h-4 w-4" />, onClick: () => exportZonesJson(highImpact, "high-impact-zones") },
          ]}
        />
        <ExportCard
          title="Emerging Hotspots"
          count={emerging.length}
          description="Zones marked as rising activity."
          actions={[
            { label: "CSV", icon: <Download className="h-4 w-4" />, onClick: () => exportZonesCsv(emerging, "emerging-hotspots") },
            { label: "JSON", icon: <FileJson className="h-4 w-4" />, onClick: () => exportZonesJson(emerging, "emerging-hotspots") },
          ]}
        />
      </div>

      <Panel title="Selected Zone Report" className="p-4">
        {selectedZone ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-zinc-950">Zone #{selectedZone.zoneId}</div>
                <Badge tone={selectedZone.impactCategory}>{selectedZone.impactCategory}</Badge>
              </div>
              <div className="mt-1 text-sm text-zinc-500">{shortLocation(selectedZone.location, 3)}</div>
            </div>
            <button
              type="button"
              onClick={() => exportSelectedZoneReport(selectedZone)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <FileText className="h-4 w-4" />
              Export report
            </button>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">Select a zone in the workspace to enable a zone-specific report.</div>
        )}
      </Panel>

      <div className="print:block hidden">
        <PrintableTable zones={filteredZones} />
      </div>
    </div>
  );
}

function ExportCard({
  title,
  count,
  description,
  actions,
}: {
  title: string;
  count: number;
  description: string;
  actions: Array<{ label: string; icon: React.ReactNode; onClick: () => void }>;
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-bold text-zinc-950">{title}</div>
          <div className="mt-1 text-sm text-zinc-500">{description}</div>
        </div>
        <div className="font-mono text-sm font-semibold text-zinc-500">{fmtNum(count)}</div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-zinc-950">{value}</div>
    </div>
  );
}

function PrintableTable({ zones }: { zones: Zone[] }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Parking Impact Intelligence - Filtered View</h1>
      <table className="mt-6 w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="border p-2 text-left">Rank</th>
            <th className="border p-2 text-left">Zone</th>
            <th className="border p-2 text-left">Location</th>
            <th className="border p-2 text-left">Impact</th>
            <th className="border p-2 text-left">Violations</th>
            <th className="border p-2 text-left">Patrol Window</th>
          </tr>
        </thead>
        <tbody>
          {zones.slice(0, 80).map((zone) => (
            <tr key={zone.zoneId}>
              <td className="border p-2">#{zone.priorityRank}</td>
              <td className="border p-2">{zone.zoneId}</td>
              <td className="border p-2">{zone.location}</td>
              <td className="border p-2">{zone.impactScore} ({zone.impactCategory})</td>
              <td className="border p-2">{zone.violationCount}</td>
              <td className="border p-2">{zone.patrolWindow}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
