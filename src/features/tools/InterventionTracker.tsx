import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import type { InterventionTracking } from "../../types/domain";
import { Panel } from "../../components/ui/Panel";
import { Badge } from "../../components/ui/Badge";
import { fmtNum, titleize } from "../../utils/format";

interface InterventionTrackerProps {
  data: InterventionTracking | null;
}

export function InterventionTracker({ data }: InterventionTrackerProps) {
  const [confirmation, setConfirmation] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [action, setAction] = useState("Increased patrol frequency");
  const [duration, setDuration] = useState("7");

  if (!data) {
    return <Panel className="p-6">No intervention data available.</Panel>;
  }

  function logIntervention() {
    setConfirmation(`Logged Zone #${zoneId || "unspecified"}: ${action} for ${duration || 0} days.`);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Natural events" value={fmtNum(data.totalEventsFound)} />
        <Metric label="With follow-up" value={fmtNum(data.eventsWithFollowup)} />
        <Metric label="Dropped sharply" value={fmtNum(data.categoryCounts.dropped_sharply ?? 0)} tone="green" />
      </div>

      <Panel title="Sample Intervention Events">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Zone</th>
                <th className="px-4 py-3">Baseline</th>
                <th className="px-4 py-3">Spike</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.sampleEvents.map((event) => (
                <tr key={`${event.zoneId}-${event.spikeMonth}`}>
                  <td className="px-4 py-3 font-semibold text-zinc-900">{event.location} <span className="text-zinc-500">#{event.zoneId}</span></td>
                  <td className="px-4 py-3 font-mono text-zinc-600">{event.baselineMonth}: {event.baselineCount}</td>
                  <td className="px-4 py-3 font-mono text-zinc-600">{event.spikeMonth}: {event.spikeCount}</td>
                  <td className="px-4 py-3 font-mono text-zinc-600">{event.followupMonth ?? "-"}: {event.followupCount ?? "-"}</td>
                  <td className="px-4 py-3"><Badge tone={event.followupCategory === "dropped_sharply" ? "Low" : event.followupCategory === "sustained_high" ? "High" : "Medium"}>{titleize(event.followupCategory)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Panel title="Log a Real Intervention" className="p-4">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-zinc-700">
              Zone ID
              <input value={zoneId} onChange={(event) => setZoneId(event.target.value)} type="number" className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-semibold text-zinc-700">
              Action Taken
              <select value={action} onChange={(event) => setAction(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option>Increased patrol frequency</option>
                <option>Towing enforcement drive</option>
                <option>Barricade / no-parking signage installed</option>
                <option>Designated parking bay created</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-zinc-700">
              Duration (days)
              <input value={duration} onChange={(event) => setDuration(event.target.value)} type="number" min={1} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </label>
            <button type="button" onClick={logIntervention} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              <ClipboardCheck className="h-4 w-4" />
              Log intervention
            </button>
            {confirmation ? <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">{confirmation}</div> : null}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="max-w-3xl text-sm leading-6 text-zinc-600">
            These historical events are observational natural experiments, not controlled trials. The tracker preserves the original framing: follow-up categories describe post-spike patterns and should not be treated as proof of causal impact.
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "green" | "neutral" }) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tone === "green" ? "border-emerald-100 bg-emerald-50" : "border-zinc-200 bg-white"}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-zinc-950">{value}</div>
    </div>
  );
}
