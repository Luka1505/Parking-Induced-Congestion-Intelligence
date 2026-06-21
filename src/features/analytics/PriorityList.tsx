import { useRef } from "react";
import { ArrowDownUp } from "lucide-react";
import type { SortMode, Zone } from "../../types/domain";
import { useDashboardStore } from "../../store/dashboardStore";
import { useVirtualList } from "../../hooks/useVirtualList";
import { Badge } from "../../components/ui/Badge";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { getConfidenceTier } from "../../utils/analytics";
import { fmtNum, shortLocation } from "../../utils/format";
import { impactColor } from "../../utils/constants";

interface PriorityListProps {
  zones: Zone[];
}

const VIEWPORT_HEIGHT = 520;
const ROW_HEIGHT = 84;

export function PriorityList({ zones }: PriorityListProps) {
  const selectedZoneId = useDashboardStore((state) => state.selectedZoneId);
  const selectZone = useDashboardStore((state) => state.selectZone);
  const sortMode = useDashboardStore((state) => state.sortMode);
  const setSortMode = useDashboardStore((state) => state.setSortMode);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { totalHeight, visibleItems, setScrollTop } = useVirtualList(zones, ROW_HEIGHT, VIEWPORT_HEIGHT);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm" data-tour="priority-list">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">Priority list</h2>
          <div className="text-xs text-zinc-500">{fmtNum(zones.length)} filtered zones</div>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <ArrowDownUp className="h-4 w-4" />
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="priority">Priority</option>
            <option value="impact">Impact score</option>
            <option value="volume">Violation volume</option>
            <option value="confidence">Confidence</option>
          </select>
        </label>
      </div>
      <div
        ref={scrollerRef}
        className="relative overflow-y-auto"
        style={{ height: VIEWPORT_HEIGHT }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div style={{ height: totalHeight }}>
          {visibleItems.map(({ item: zone, top }) => {
            const selected = zone.zoneId === selectedZoneId;
            return (
              <button
                key={zone.zoneId}
                type="button"
                onClick={() => selectZone(zone)}
                className={`absolute left-0 right-0 grid min-h-[84px] grid-cols-[52px_1fr_auto] items-center gap-3 border-b border-zinc-100 px-4 py-3 text-left transition ${
                  selected ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "hover:bg-zinc-50"
                }`}
                style={{ top }}
              >
                <div className="font-mono text-xs font-semibold text-zinc-500">#{zone.priorityRank}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-950">{shortLocation(zone.location, 2)}</div>
                  <div className="mt-1 truncate text-xs text-zinc-500">
                    {fmtNum(zone.violationCount)} violations | {zone.patrolWindow}
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={zone.impactScore} color={impactColor(zone.impactCategory)} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-lg font-bold" style={{ color: impactColor(zone.impactCategory) }}>
                    {zone.impactScore}
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Badge tone={zone.impactCategory}>{zone.impactCategory}</Badge>
                    <Badge tone={getConfidenceTier(zone)} variant="confidence">{getConfidenceTier(zone)}</Badge>
                    {zone.isEmerging ? <Badge tone="Info">Rising</Badge> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
