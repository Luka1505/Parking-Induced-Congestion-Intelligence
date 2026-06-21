import { useState } from "react";
import { LocateFixed, SearchCheck } from "lucide-react";
import type { RiskEvaluation, Zone } from "../../types/domain";
import { Panel } from "../../components/ui/Panel";
import { Badge } from "../../components/ui/Badge";
import { evaluateZoneRisk } from "../../utils/analytics";
import { confidenceTier, footfallLabel, impactColor } from "../../utils/constants";
import { fmtNum, titleize } from "../../utils/format";

interface RiskEvaluatorProps {
  zones: Zone[];
}

export function RiskEvaluator({ zones }: RiskEvaluatorProps) {
  const [lat, setLat] = useState("12.9716");
  const [lon, setLon] = useState("77.6197");
  const [roadType, setRoadType] = useState("local_road");
  const [landmark, setLandmark] = useState("");
  const [result, setResult] = useState<RiskEvaluation | null>(null);

  function runEvaluation() {
    const next = evaluateZoneRisk(zones, Number(lat), Number(lon), roadType, landmark);
    setResult(next);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel title="Zone Risk Evaluator" className="self-start p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-zinc-700">
              Latitude
              <input
                value={lat}
                onChange={(event) => setLat(event.target.value)}
                type="number"
                step="0.0001"
                className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="text-sm font-semibold text-zinc-700">
              Longitude
              <input
                value={lon}
                onChange={(event) => setLon(event.target.value)}
                type="number"
                step="0.0001"
                className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold text-zinc-700">
            Road Type
            <select
              value={roadType}
              onChange={(event) => setRoadType(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="arterial">Arterial / Main Road</option>
              <option value="junction">Junction</option>
              <option value="local_road">Local Road</option>
              <option value="residential">Residential</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-zinc-700">
            Nearby Landmark
            <input
              value={landmark}
              onChange={(event) => setLandmark(event.target.value)}
              placeholder="e.g. MG Road Metro Station"
              className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="button"
            onClick={runEvaluation}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <LocateFixed className="h-4 w-4" />
            Evaluate risk
          </button>
        </div>
      </Panel>

      <Panel className="p-5">
        {result ? <RiskResult result={result} /> : <div className="flex min-h-64 items-center justify-center text-sm text-zinc-500">Enter a location and run the evaluator.</div>}
      </Panel>
    </div>
  );
}

function RiskResult({ result }: { result: RiskEvaluation }) {
  if (result.case === "matched_existing_zone") {
    const zone = result.zone;
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <SearchCheck className="h-5 w-5" />
          Within {result.distanceM}m of an existing monitored hotspot. Historical data is used.
        </div>
        <div className="flex items-end gap-3">
          <div className="text-5xl font-bold" style={{ color: impactColor(zone.impactCategory) }}>{zone.impactScore}</div>
          <div className="pb-1 text-sm text-zinc-500">/ 100 impact score</div>
          <Badge tone={zone.impactCategory}>{zone.impactCategory}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Matched zone" value={`#${zone.zoneId}`} />
          <Metric label="Violations" value={fmtNum(zone.violationCount)} />
          <Metric label="Severe stop rate" value={`${zone.severeStopPct}%`} />
          <Metric label="Confidence" value={confidenceTier(zone.windowConfidence)} />
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Patrol window</div>
          <div className="mt-2 text-base font-bold text-zinc-950">{zone.patrolWindow}</div>
          <div className="mt-2 text-sm text-zinc-600">{zone.location}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        No monitored hotspot within 150m. Nearest is {result.nearestDistM}m away at Zone #{result.nearestZone.zoneId}. This structural estimate excludes density and severity because no violation history exists at the entered location.
      </div>
      <div className="flex items-end gap-3">
        <div className="text-5xl font-bold text-amber-700">{result.structuralScore}</div>
        <div className="pb-1 text-sm text-zinc-500">/ 100 structural risk estimate</div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Road type" value={titleize(result.roadType)} />
        <Metric label="Landmark category" value={footfallLabel(result.footfallCategory) || "None"} />
        <Metric label="Nearest monitored zone" value={`#${result.nearestZone.zoneId}`} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-lg font-bold text-zinc-950">{value}</div>
    </div>
  );
}
