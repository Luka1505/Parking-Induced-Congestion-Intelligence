import { ExportCenter } from "../features/export/ExportCenter";
import { useDashboardData } from "../hooks/useDashboardData";
import { useFilteredZones } from "../hooks/useFilteredZones";
import { useDashboardStore } from "../store/dashboardStore";

export function ExportPage() {
  const { data } = useDashboardData();
  const selectedZoneId = useDashboardStore((state) => state.selectedZoneId);
  const { filteredZones } = useFilteredZones(data?.zones ?? []);

  if (!data) return null;

  const selectedZone = data.zones.find((zone) => zone.zoneId === selectedZoneId) ?? null;
  return <ExportCenter allZones={data.zones} filteredZones={filteredZones} selectedZone={selectedZone} />;
}
