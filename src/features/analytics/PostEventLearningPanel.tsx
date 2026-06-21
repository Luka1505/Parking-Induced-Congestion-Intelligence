import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, GitCompare, Target } from "lucide-react";
import type { PostEventLearning } from "../../types/domain";
import { Panel } from "../../components/ui/Panel";
import { Badge } from "../../components/ui/Badge";
import { fmtNum } from "../../utils/format";

interface PostEventLearningPanelProps {
  data: PostEventLearning | null;
}

const tooltipStyle = {
  border: "1px solid #e4e4e7",
  borderRadius: 8,
  boxShadow: "0 12px 30px rgb(15 23 42 / 0.12)",
};

export function PostEventLearningPanel({ data }: PostEventLearningPanelProps) {
  if (!data) {
    return (
      <Panel title="Post-Event Learning">
        <div className="p-5 text-sm text-zinc-500">
          No post-event backtest output is available yet. Run `08_post_event_learning.py` before `07_export_for_ui.py` or run the full pipeline.
        </div>
      </Panel>
    );
  }

  const hitRates = [
    { model: "Random", value: data.randomBaselineHitRate, color: "#64748b" },
    { model: "Impact score", value: data.compositeScoreHitRate, color: "#2563eb" },
    { model: "Raw volume", value: data.naiveVolumeHitRate, color: "#218763" },
  ];

  return (
    <Panel title="Post-Event Learning Backtest">
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="Info">Model validation</Badge>
            <Badge tone="Neutral">{data.trainMonths} train</Badge>
            <Badge tone="Neutral">{data.testMonths} test</Badge>
          </div>

          <h2 className="mt-4 text-xl font-bold text-zinc-950">
            Impact score beats random selection in the holdout period.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            This panel uses the output from `08_post_event_learning.py`. It computes impact scores on the training months, then checks whether those same zones stayed active in the test months.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Metric icon={<Target className="h-4 w-4" />} label="Zones tested" value={fmtNum(data.zonesTestedBoth)} />
            <Metric icon={<Activity className="h-4 w-4" />} label="Spearman correlation" value={String(data.spearmanCorr)} />
            <Metric icon={<GitCompare className="h-4 w-4" />} label="Impact lift vs random" value={`${(data.compositeScoreHitRate - data.randomBaselineHitRate).toFixed(1)} pts`} />
          </div>

          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Raw volume does better on this narrow future-volume task, which is expected. The impact score intentionally includes severity, road criticality, and commercial proximity, so it is not optimized only for predicting which zones will stay busiest.
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hitRates} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis dataKey="model" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, "Top-decile hit rate"]} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {hitRates.map((entry) => (
                  <Cell key={entry.model} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-zinc-950">{value}</div>
    </div>
  );
}
