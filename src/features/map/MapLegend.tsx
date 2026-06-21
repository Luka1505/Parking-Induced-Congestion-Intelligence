import type { Zone } from "../../types/domain";
import { getCategoryCounts } from "../../utils/analytics";
import { IMPACT_COLORS } from "../../utils/constants";

interface MapLegendProps {
  zones: Zone[];
}

export function MapLegend({ zones }: MapLegendProps) {
  const counts = getCategoryCounts(zones);
  return (
    <div className="absolute bottom-4 left-4 z-[500] rounded-lg border border-zinc-200 bg-white/95 p-3 text-xs shadow-panel backdrop-blur">
      <div className="mb-2 font-semibold text-zinc-900">Impact</div>
      <div className="space-y-1.5">
        {(["High", "Medium", "Low"] as const).map((category) => (
          <div key={category} className="flex items-center justify-between gap-4 text-zinc-600">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: IMPACT_COLORS[category] }} />
              {category}
            </span>
            <span className="font-mono text-zinc-500">{counts[category]}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-zinc-200 pt-2 text-[11px] text-zinc-500">
        Rings encode confidence. Larger halos indicate higher violation volume.
      </div>
    </div>
  );
}
