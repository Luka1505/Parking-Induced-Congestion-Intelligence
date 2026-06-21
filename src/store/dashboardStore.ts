import { create } from "zustand";
import type { DashboardFilters, MapState, SortMode, Zone } from "../types/domain";
import { DEFAULT_CENTER } from "../utils/constants";

const defaultFilters: DashboardFilters = {
  impactCategory: "All",
  roadTypes: [],
  confidenceTiers: [],
  commercialOnly: false,
  emergingOnly: false,
  highPriorityOnly: false,
  minViolations: 0,
  maxViolations: 10000,
  patrolWindow: "All",
};

interface DashboardStore {
  selectedZoneId: number | null;
  filters: DashboardFilters;
  searchQuery: string;
  sortMode: SortMode;
  mapState: MapState;
  onboardingDismissed: boolean;
  setSelectedZone: (zoneId: number | null) => void;
  selectZone: (zone: Zone | null) => void;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  resetFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSortMode: (mode: SortMode) => void;
  setMapState: (state: Partial<MapState>) => void;
  setOnboardingDismissed: (dismissed: boolean) => void;
}

function readOnboardingDismissed() {
  return false;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  selectedZoneId: null,
  filters: defaultFilters,
  searchQuery: "",
  sortMode: "priority",
  mapState: { center: DEFAULT_CENTER, zoom: 11 },
  onboardingDismissed: readOnboardingDismissed(),
  setSelectedZone: (zoneId) => set({ selectedZoneId: zoneId }),
  selectZone: (zone) =>
    set((state) => ({
      selectedZoneId: zone?.zoneId ?? null,
      mapState: zone ? { ...state.mapState, center: [zone.lat, zone.lon], zoom: Math.max(state.mapState.zoom, 13) } : state.mapState,
    })),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultFilters, searchQuery: "" }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortMode: (sortMode) => set({ sortMode }),
  setMapState: (statePatch) => set((state) => ({ mapState: { ...state.mapState, ...statePatch } })),
  setOnboardingDismissed: (dismissed) => {
    set({ onboardingDismissed: dismissed });
  },
}));

export const DEFAULT_FILTERS = defaultFilters;
