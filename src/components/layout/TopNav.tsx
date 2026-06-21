import { Bell, Copy, RotateCcw } from "lucide-react";
import type { Zone } from "../../types/domain";
import { useDashboardStore } from "../../store/dashboardStore";
import { fmtNum } from "../../utils/format";
import { GlobalSearch } from "../../features/search/GlobalSearch";
import { IconButton } from "../ui/IconButton";

interface TopNavProps {
  zones: Zone[];
  dateRange: string;
  totalViolations: number;
}

export function TopNav({ zones, dateRange, totalViolations }: TopNavProps) {
  const resetFilters = useDashboardStore((state) => state.resetFilters);

  async function copyLink() {
    await navigator.clipboard?.writeText(window.location.href);
  }

  return (
    <header className="sticky top-0 z-[800] border-b border-zinc-200 bg-zinc-50/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-3 px-4 lg:px-6">
        <div className="min-w-0 flex-1 lg:hidden">
          <div className="truncate text-sm font-bold text-zinc-950">Parking Impact Intelligence</div>
          <div className="text-xs text-zinc-500">{dateRange}</div>
        </div>
        <div className="hidden min-w-64 lg:block">
          <div className="text-sm font-semibold text-zinc-950">Bengaluru Traffic Police</div>
          <div className="text-xs text-zinc-500">
            {dateRange} | {fmtNum(totalViolations)} violations analyzed
          </div>
        </div>
        <div className="hidden flex-1 md:block">
          <GlobalSearch zones={zones} />
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Reset filters" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4" />
          </IconButton>
          <IconButton label="Copy shareable link" onClick={copyLink}>
            <Copy className="h-4 w-4" />
          </IconButton>
          <IconButton label="Operational alerts">
            <Bell className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      <div className="border-t border-zinc-200 px-4 py-2 md:hidden">
        <GlobalSearch zones={zones} />
      </div>
    </header>
  );
}
