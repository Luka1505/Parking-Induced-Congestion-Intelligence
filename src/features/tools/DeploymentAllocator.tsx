import { useMemo, useState } from "react";
import { Route } from "lucide-react";
import type { Zone } from "../../types/domain";
import { Panel } from "../../components/ui/Panel";
import { Badge } from "../../components/ui/Badge";
import { AREA_BOUNDS, impactColor } from "../../utils/constants";
import { allocateDeployment } from "../../utils/analytics";
import { fmtNum, shortLocation } from "../../utils/format";

interface DeploymentAllocatorProps {
  zones: Zone[];
}

export function DeploymentAllocator({ zones }: DeploymentAllocatorProps) {
  const [teams, setTeams] = useState(5);
  const [stops, setStops] = useState(3);
  const [area, setArea] = useState("all");
  const plan = useMemo(() => allocateDeployment(zones, teams, stops, AREA_BOUNDS[area]), [area, stops, teams, zones]);

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel title="Deployment Allocator" className="self-start p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-zinc-700">
              Patrol Teams
              <input value={teams} onChange={(event) => setTeams(Math.max(1, Number(event.target.value) || 1))} type="number" min={1} max={20} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="text-sm font-semibold text-zinc-700">
              Stops / Team
              <input value={stops} onChange={(event) => setStops(Math.max(1, Number(event.target.value) || 1))} type="number" min={1} max={10} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </label>
          </div>
          <label className="block text-sm font-semibold text-zinc-700">
            Target Area
            <select value={area} onChange={(event) => setArea(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="all">All zones</option>
              <option value="east">Bengaluru East</option>
              <option value="north">Bengaluru North</option>
              <option value="south">Bengaluru South</option>
            </select>
          </label>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
            Coverage is calculated from historical violation volume. It is not a predicted reduction.
          </div>
        </div>
      </Panel>

      <div className="space-y-4">
        {plan.warning ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{plan.warning}</div> : null}
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Zones covered" value={fmtNum(plan.stats.zonesCovered)} />
          <Metric label="Severe coverage" value={`${plan.stats.severeCoveragePct}%`} />
          <Metric label="Violation coverage" value={`${plan.stats.violationCoveragePct}%`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {plan.teams.map((route, index) => (
            <Panel key={index} title={`Patrol Team ${index + 1}`} className="overflow-hidden">
              <div className="divide-y divide-zinc-100">
                {route.length === 0 ? (
                  <div className="p-4 text-sm text-zinc-500">No zones assigned</div>
                ) : (
                  route.map((zone, stopIndex) => (
                    <div key={zone.zoneId} className="flex items-center gap-3 p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-bold text-white">{stopIndex + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-zinc-950">{shortLocation(zone.location, 2)}</div>
                        <div className="mt-1 text-xs text-zinc-500">Zone #{zone.zoneId} | {zone.patrolWindow}</div>
                      </div>
                      <Badge tone={zone.impactCategory}>
                        <span className="inline-flex items-center gap-1">
                          <Route className="h-3 w-3" />
                          <span style={{ color: impactColor(zone.impactCategory) }}>{zone.impactScore}</span>
                        </span>
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-zinc-950">{value}</div>
    </div>
  );
}
