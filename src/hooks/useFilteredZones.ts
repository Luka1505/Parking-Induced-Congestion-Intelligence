import { useMemo } from "react";
import type { Zone } from "../types/domain";
import { filterZones, sortZones, summarizeZones } from "../utils/analytics";
import { useDashboardStore } from "../store/dashboardStore";

export function useFilteredZones(zones: Zone[]) {
  const filters = useDashboardStore((state) => state.filters);
  const searchQuery = useDashboardStore((state) => state.searchQuery);
  const sortMode = useDashboardStore((state) => state.sortMode);

  const filteredZones = useMemo(() => filterZones(zones, filters, searchQuery), [filters, searchQuery, zones]);
  const sortedZones = useMemo(() => sortZones(filteredZones, sortMode), [filteredZones, sortMode]);
  const summary = useMemo(() => summarizeZones(filteredZones), [filteredZones]);

  return { filteredZones, sortedZones, summary };
}
