import { AlertTriangle, Building2, Layers, MapPinned, TrendingUp } from "lucide-react";
import { MetricCard } from "../components/ui/MetricCard";
import { FilterPanel } from "../features/filters/FilterPanel";
import { HotspotMap } from "../features/map/HotspotMap";
import { PriorityList } from "../features/analytics/PriorityList";
import { ZoneDetailsDrawer } from "../features/analytics/ZoneDetailsDrawer";
import { useDashboardData } from "../hooks/useDashboardData";
import { useFilteredZones } from "../hooks/useFilteredZones";
import { useDashboardStore } from "../store/dashboardStore";
import { fmtNum } from "../utils/format";

export function WorkspacePage() {
  const { data } = useDashboardData();
  const selectedZoneId = useDashboardStore((state) => state.selectedZoneId);
  const { filteredZones, sortedZones, summary } = useFilteredZones(data?.zones ?? []);

  if (!data) return null;

  const selectedZone = data.zones.find((zone) => zone.zoneId === selectedZoneId) ?? filteredZones[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Filtered Zones" value={fmtNum(filteredZones.length)} sub={`${fmtNum(data.zones.length)} total zones`} icon={<Layers className="h-5 w-5" />} />
        <MetricCard label="Filtered Violations" value={fmtNum(summary.totalViolations)} sub="Clustered records in view" icon={<MapPinned className="h-5 w-5" />} tone="blue" />
        <MetricCard label="High Impact" value={fmtNum(summary.highImpact)} sub="Visible priority zones" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
        <MetricCard label="Emerging" value={fmtNum(summary.emerging)} sub="Rising activity" icon={<TrendingUp className="h-5 w-5" />} tone="amber" />
        <MetricCard label="Commercial" value={fmtNum(summary.commercial)} sub="Delivery corridor relevance" icon={<Building2 className="h-5 w-5" />} tone="green" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <FilterPanel zones={data.zones} />
        <HotspotMap zones={filteredZones} allZones={data.zones} selectedZone={selectedZone} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <PriorityList zones={sortedZones} />
        <ZoneDetailsDrawer zone={selectedZone} />
      </div>
    </div>
  );
}
