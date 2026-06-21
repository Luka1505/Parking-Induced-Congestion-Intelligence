import { Copy, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Zone } from "../../types/domain";
import { useDashboardStore } from "../../store/dashboardStore";
import { Badge } from "../../components/ui/Badge";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { CONFIDENCE_TEXT, footfallLabel, impactColor } from "../../utils/constants";
import { getConfidenceTier } from "../../utils/analytics";
import { fmtNum, titleize } from "../../utils/format";

interface ZoneDetailsDrawerProps {
  zone: Zone | null;
}

export function ZoneDetailsDrawer({ zone }: ZoneDetailsDrawerProps) {
  const setSelectedZone = useDashboardStore((state) => state.setSelectedZone);

  async function copyZoneLink() {
    if (!zone) return;
    const url = new URL(window.location.href);
    url.searchParams.set("zone", String(zone.zoneId));
    await navigator.clipboard?.writeText(url.toString());
  }

  return (
    <AnimatePresence mode="wait">
      {zone ? (
        <motion.aside
          key={zone.zoneId}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.18 }}
          className="rounded-lg border border-zinc-200 bg-white shadow-sm"
          data-tour="details"
        >
          <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <div>
              <div className="font-mono text-xs font-semibold uppercase text-zinc-500">
                Zone #{zone.zoneId} | Rank #{zone.priorityRank}
              </div>
              <h2 className="mt-1 text-base font-bold leading-snug text-zinc-950">{zone.location}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="Copy zone link"
                title="Copy zone link"
                onClick={copyZoneLink}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Close details"
                title="Close details"
                onClick={() => setSelectedZone(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-5 p-4">
            <div className="flex items-end gap-3">
              <div className="text-5xl font-bold leading-none" style={{ color: impactColor(zone.impactCategory) }}>
                {zone.impactScore}
              </div>
              <div className="pb-1 text-sm text-zinc-500">/ 100 impact score</div>
              <div className="ml-auto flex flex-col items-end gap-1">
                <Badge tone={zone.impactCategory}>{zone.impactCategory}</Badge>
                <Badge tone={getConfidenceTier(zone)} variant="confidence">{CONFIDENCE_TEXT[zone.windowConfidence]?.text ?? zone.windowConfidence}</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Score breakdown</div>
              <ProgressBar label="Density" value={zone.contribDensity} color="#2563eb" />
              <ProgressBar label="Severity" value={zone.contribSeverity} color="#cf3f38" />
              <ProgressBar label="Road criticality" value={zone.contribRoad} color="#b87416" />
              <ProgressBar label="Commercial proximity" value={zone.contribCommercial} color="#218763" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Violations" value={fmtNum(zone.violationCount)} />
              <Metric label="Severe stops" value={`${zone.severeStopPct}%`} />
              <Metric label="Rush-hour share" value={`${zone.rushHourPct}%`} />
              <Metric label="Road type" value={titleize(zone.roadType)} />
              <Metric label="Commercial" value={footfallLabel(zone.footfallCategory) || "None"} />
              <Metric label="Emerging" value={zone.isEmerging ? "Yes" : "No"} />
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Recommended patrol window</div>
              <div className="mt-2 text-base font-bold text-zinc-950">{zone.patrolWindow}</div>
              {zone.noDaytimeData ? (
                <div className="mt-2 text-sm text-zinc-600">
                  No violations are logged 10am-6pm at this zone; daytime spot-checking remains important because citywide enforcement has a daytime blind spot.
                </div>
              ) : null}
            </div>
          </div>
        </motion.aside>
      ) : (
        <motion.aside
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500"
        >
          Select a zone from the map or list.
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-zinc-950">{value}</div>
    </div>
  );
}
