import { Filter, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import type { Zone } from "../../types/domain";
import { DEFAULT_FILTERS, useDashboardStore } from "../../store/dashboardStore";
import { getConfidenceTier } from "../../utils/analytics";
import { titleize } from "../../utils/format";

interface FilterPanelProps {
  zones: Zone[];
}

export function FilterPanel({ zones }: FilterPanelProps) {
  const filters = useDashboardStore((state) => state.filters);
  const setFilters = useDashboardStore((state) => state.setFilters);
  const resetFilters = useDashboardStore((state) => state.resetFilters);
  const roadTypes = [...new Set(zones.map((zone) => zone.roadType))].sort();
  const maxObserved = Math.max(...zones.map((zone) => zone.violationCount));

  function toggleRoadType(roadType: string) {
    const next = filters.roadTypes.includes(roadType)
      ? filters.roadTypes.filter((value) => value !== roadType)
      : [...filters.roadTypes, roadType];
    setFilters({ roadTypes: next });
  }

  function toggleConfidence(tier: "High" | "Medium" | "Low") {
    const next = filters.confidenceTiers.includes(tier)
      ? filters.confidenceTiers.filter((value) => value !== tier)
      : [...filters.confidenceTiers, tier];
    setFilters({ confidenceTiers: next });
  }

  return (
    <motion.aside
      layout
      className="rounded-lg border border-zinc-200 bg-white shadow-sm"
      data-tour="filters"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
      <div className="space-y-5 p-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Impact category</label>
          <select
            value={filters.impactCategory}
            onChange={(event) => setFilters({ impactCategory: event.target.value as typeof filters.impactCategory })}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="All">All impact tiers</option>
            <option value="High">High impact</option>
            <option value="Medium">Medium impact</option>
            <option value="Low">Low impact</option>
          </select>
        </div>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Road type</legend>
          <div className="grid grid-cols-2 gap-2">
            {roadTypes.map((roadType) => (
              <label key={roadType} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-2 py-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={filters.roadTypes.includes(roadType)}
                  onChange={() => toggleRoadType(roadType)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="truncate">{titleize(roadType)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Confidence tier</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["High", "Medium", "Low"] as const).map((tier) => (
              <label key={tier} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-2 py-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={filters.confidenceTiers.includes(tier)}
                  onChange={() => toggleConfidence(tier)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                {tier}
              </label>
            ))}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            Current data: {zones.filter((zone) => getConfidenceTier(zone) === "High").length} high-confidence zones
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-2">
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
            Commercial zone
            <input
              type="checkbox"
              checked={filters.commercialOnly}
              onChange={(event) => setFilters({ commercialOnly: event.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
            Emerging hotspot
            <input
              type="checkbox"
              checked={filters.emergingOnly}
              onChange={(event) => setFilters({ emergingOnly: event.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
            High-priority zones
            <input
              type="checkbox"
              checked={filters.highPriorityOnly}
              onChange={(event) => setFilters({ highPriorityOnly: event.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Violation volume</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              value={filters.minViolations}
              onChange={(event) => setFilters({ minViolations: Number(event.target.value) || 0 })}
              className="h-10 rounded-lg border border-zinc-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              aria-label="Minimum violations"
            />
            <input
              type="number"
              min={0}
              max={maxObserved}
              value={filters.maxViolations}
              onChange={(event) => setFilters({ maxViolations: Number(event.target.value) || DEFAULT_FILTERS.maxViolations })}
              className="h-10 rounded-lg border border-zinc-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              aria-label="Maximum violations"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Patrol window</label>
          <select
            value={filters.patrolWindow}
            onChange={(event) => setFilters({ patrolWindow: event.target.value as typeof filters.patrolWindow })}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="All">All patrol windows</option>
            <option value="Daytime">Daytime</option>
            <option value="Evening">Evening</option>
            <option value="Night">Night</option>
          </select>
        </div>
      </div>
    </motion.aside>
  );
}
