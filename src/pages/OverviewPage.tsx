import { AlertTriangle, Building2, MapPin, RadioTower, ShieldCheck, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MetricCard } from "../components/ui/MetricCard";
import { Panel } from "../components/ui/Panel";
import { Badge } from "../components/ui/Badge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useDashboardData } from "../hooks/useDashboardData";
import { fmtNum, shortLocation } from "../utils/format";
import { useFilteredZones } from "../hooks/useFilteredZones";
import { impactColor } from "../utils/constants";

export function OverviewPage() {
  const { data } = useDashboardData();
  const { filteredZones } = useFilteredZones(data?.zones ?? []);

  if (!data) return null;

  const topZone = data.zones[0];
  const topCommercial = data.zones.find((zone) => zone.footfallCategory !== "none");
  const topEmerging = data.zones.find((zone) => zone.isEmerging);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" data-tour="kpis">
        <MetricCard label="Total Violations" value={fmtNum(data.summaryStats.totalViolationsRaw)} sub={`${fmtNum(data.summaryStats.totalViolationsClustered)} clustered`} icon={<ShieldCheck className="h-5 w-5" />} tone="blue" />
        <MetricCard label="Total Hotspots" value={fmtNum(data.summaryStats.totalZones)} sub={`${fmtNum(data.summaryStats.noisePointCount)} isolated records`} icon={<MapPin className="h-5 w-5" />} tone="neutral" />
        <MetricCard label="High Impact Zones" value={fmtNum(data.summaryStats.highImpactZones)} sub="Priority enforcement tier" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
        <MetricCard label="Emerging Hotspots" value={fmtNum(data.summaryStats.emergingHotspotCount)} sub="Rising enforcement activity" icon={<TrendingUp className="h-5 w-5" />} tone="amber" />
        <MetricCard label="Commercial Corridors" value={fmtNum(data.zones.filter((zone) => zone.footfallCategory !== "none").length)} sub="Retail, transit, institution linked" icon={<Building2 className="h-5 w-5" />} tone="green" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel className="p-5" id="executive-insight">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Top Insight</div>
              <h1 className="mt-2 max-w-4xl text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">
                {data.summaryStats.noDaytimeDataPct}% of zones have no logged 10am-6pm enforcement activity.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
                The highest scoring zones remain concentrated in late-night and early-morning patrol windows, while commercial operating hours are sparsely observed.
              </p>
            </div>
            <Link
              to="/workspace"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Open workspace
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[topZone, topCommercial, topEmerging].filter(Boolean).map((zone) => (
              <motion.div key={zone!.zoneId} layout className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone={zone!.impactCategory}>{zone!.impactCategory}</Badge>
                  <span className="font-mono text-xs text-zinc-500">#{zone!.priorityRank}</span>
                </div>
                <div className="mt-3 truncate text-sm font-bold text-zinc-950">{shortLocation(zone!.location, 2)}</div>
                <div className="mt-2 text-xs text-zinc-500">{fmtNum(zone!.violationCount)} violations | {zone!.patrolWindow}</div>
                <div className="mt-3">
                  <ProgressBar value={zone!.impactScore} color={impactColor(zone!.impactCategory)} />
                </div>
              </motion.div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <RadioTower className="h-4 w-4" />
            Most Important Recommendation
          </div>
          <div className="mt-3 text-xl font-bold text-zinc-950">Prioritize Zone #{topZone.zoneId}</div>
          <div className="mt-2 text-sm leading-6 text-zinc-600">
            {shortLocation(topZone.location, 3)} has the top impact rank with a recommended patrol window of <span className="font-semibold text-zinc-950">{topZone.patrolWindow}</span>.
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs font-semibold uppercase text-zinc-500">Impact score</div>
              <div className="mt-1 text-2xl font-bold" style={{ color: impactColor(topZone.impactCategory) }}>{topZone.impactScore}</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs font-semibold uppercase text-zinc-500">Filtered zones</div>
              <div className="mt-1 text-2xl font-bold text-zinc-950">{fmtNum(filteredZones.length)}</div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
