import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { DashboardFilters, ImpactCategory, Zone } from "../types/domain";
import { DEFAULT_FILTERS, useDashboardStore } from "../store/dashboardStore";

function parseImpact(value: string | null): ImpactCategory | "All" {
  if (value === "High" || value === "Medium" || value === "Low") return value;
  if (value === "high-impact") return "High";
  if (value === "medium-impact") return "Medium";
  if (value === "low-impact") return "Low";
  return "All";
}

function truthyParam(value: string | null): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function filtersFromParams(params: URLSearchParams): Partial<DashboardFilters> {
  const filters: Partial<DashboardFilters> = {};
  if (params.has("impact") || params.has("filter")) filters.impactCategory = parseImpact(params.get("impact") ?? params.get("filter"));
  if (params.has("road")) filters.roadTypes = params.get("road")!.split(",").filter(Boolean);
  if (params.has("confidence")) filters.confidenceTiers = params.get("confidence")!.split(",").filter(Boolean) as DashboardFilters["confidenceTiers"];
  if (params.has("commercial")) filters.commercialOnly = truthyParam(params.get("commercial"));
  if (params.has("emerging")) filters.emergingOnly = truthyParam(params.get("emerging"));
  if (params.has("priority")) filters.highPriorityOnly = truthyParam(params.get("priority"));
  if (params.has("minv")) filters.minViolations = Number(params.get("minv")) || 0;
  if (params.has("maxv")) filters.maxViolations = Number(params.get("maxv")) || DEFAULT_FILTERS.maxViolations;
  if (params.has("patrol")) {
    const value = params.get("patrol");
    if (value === "Daytime" || value === "Evening" || value === "Night" || value === "All") filters.patrolWindow = value;
  }
  return filters;
}

function writeFilters(params: URLSearchParams, filters: DashboardFilters) {
  if (filters.impactCategory !== "All") params.set("impact", filters.impactCategory);
  if (filters.roadTypes.length) params.set("road", filters.roadTypes.join(","));
  if (filters.confidenceTiers.length) params.set("confidence", filters.confidenceTiers.join(","));
  if (filters.commercialOnly) params.set("commercial", "1");
  if (filters.emergingOnly) params.set("emerging", "1");
  if (filters.highPriorityOnly) params.set("priority", "1");
  if (filters.minViolations > DEFAULT_FILTERS.minViolations) params.set("minv", String(filters.minViolations));
  if (filters.maxViolations < DEFAULT_FILTERS.maxViolations) params.set("maxv", String(filters.maxViolations));
  if (filters.patrolWindow !== "All") params.set("patrol", filters.patrolWindow);
}

export function useShareableState(zones: Zone[]) {
  const location = useLocation();
  const navigate = useNavigate();
  const hydrated = useRef(false);
  const selectedZoneId = useDashboardStore((state) => state.selectedZoneId);
  const filters = useDashboardStore((state) => state.filters);
  const mapState = useDashboardStore((state) => state.mapState);
  const setSelectedZone = useDashboardStore((state) => state.setSelectedZone);
  const setFilters = useDashboardStore((state) => state.setFilters);
  const setMapState = useDashboardStore((state) => state.setMapState);

  useEffect(() => {
    if (hydrated.current || zones.length === 0) return;
    const params = new URLSearchParams(location.search);
    const zoneId = Number(params.get("zone"));
    if (zoneId && zones.some((zone) => zone.zoneId === zoneId)) setSelectedZone(zoneId);

    const lat = Number(params.get("lat"));
    const lon = Number(params.get("lon"));
    const zoom = Number(params.get("zoom"));
    if (lat && lon) setMapState({ center: [lat, lon], zoom: zoom || mapState.zoom });

    setFilters(filtersFromParams(params));
    hydrated.current = true;
  }, [location.search, mapState.zoom, setFilters, setMapState, setSelectedZone, zones]);

  useEffect(() => {
    if (!hydrated.current) return;
    const params = new URLSearchParams();
    if (selectedZoneId) params.set("zone", String(selectedZoneId));
    writeFilters(params, filters);
    params.set("lat", mapState.center[0].toFixed(5));
    params.set("lon", mapState.center[1].toFixed(5));
    params.set("zoom", String(Math.round(mapState.zoom * 10) / 10));
    const nextSearch = `?${params.toString()}`;
    if (nextSearch !== location.search) {
      navigate(`${location.pathname}${nextSearch}`, { replace: true });
    }
  }, [filters, location.pathname, location.search, mapState.center, mapState.zoom, navigate, selectedZoneId]);
}

export function createShareableUrl() {
  return window.location.href;
}
