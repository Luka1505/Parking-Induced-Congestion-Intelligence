import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardData, Zone } from "../../types/domain";
import { Panel } from "../../components/ui/Panel";
import { getCategoryCounts, getCommercialSummary, getRoadTypeCounts } from "../../utils/analytics";
import { HOUR_LABELS, IMPACT_COLORS } from "../../utils/constants";
import { fmtNum, titleize } from "../../utils/format";

interface AnalyticsChartsProps {
  data: DashboardData;
  zones: Zone[];
}

const tooltipStyle = {
  border: "1px solid #e4e4e7",
  borderRadius: 8,
  boxShadow: "0 12px 30px rgb(15 23 42 / 0.12)",
};

export function AnalyticsCharts({ data, zones }: AnalyticsChartsProps) {
  const hourly = data.citywideHourly.map((value, hour) => ({ hour, label: HOUR_LABELS[hour], violations: value }));
  const dow = data.citywideDow.map((value, index) => ({ day: data.dowLabels[index].slice(0, 3), violations: value }));
  const categoryCounts = getCategoryCounts(zones);
  const impactPie = (Object.keys(categoryCounts) as Array<keyof typeof categoryCounts>).map((category) => ({
    category,
    value: categoryCounts[category],
  }));
  const roadTypeCounts = getRoadTypeCounts(zones).slice(0, 8);
  const commercial = getCommercialSummary(zones);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Hourly Enforcement Pattern" className="p-4">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={fmtNum} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [fmtNum(value), "Violations"]} />
              <Bar dataKey="violations" radius={[4, 4, 0, 0]}>
                {hourly.map((entry) => (
                  <Cell key={entry.hour} fill={entry.hour >= 10 && entry.hour < 18 ? "#cf3f38" : "#2563eb"} opacity={entry.hour >= 10 && entry.hour < 18 ? 0.62 : 0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Day-of-Week Volume" className="p-4">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dow}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={fmtNum} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [fmtNum(value), "Violations"]} />
              <Line type="monotone" dataKey="violations" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Impact Mix" className="p-4">
        <div className="grid min-h-72 grid-cols-1 items-center gap-4 md:grid-cols-[240px_1fr]">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={impactPie} dataKey="value" nameKey="category" innerRadius={58} outerRadius={94} paddingAngle={2}>
                {impactPie.map((entry) => (
                  <Cell key={entry.category} fill={IMPACT_COLORS[entry.category]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [fmtNum(value), "Zones"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {impactPie.map((entry) => (
              <div key={entry.category} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: IMPACT_COLORS[entry.category] }} />
                  {entry.category}
                </span>
                <span className="font-mono text-sm text-zinc-500">{fmtNum(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Road-Type Concentration" className="p-4">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roadTypeCounts} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" width={110} dataKey="roadType" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={titleize} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [fmtNum(value), "Zones"]} labelFormatter={titleize} />
              <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Commercial Corridor Summary" className="xl:col-span-2">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Zones</th>
                <th className="px-4 py-3 text-right">Violations</th>
                <th className="px-4 py-3 text-right">Average impact</th>
                <th className="px-4 py-3 text-right">High impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {commercial.map((row) => (
                <tr key={row.category}>
                  <td className="px-4 py-3 font-semibold text-zinc-900">{titleize(row.category)}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-600">{fmtNum(row.zoneCount)}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-600">{fmtNum(row.totalViolations)}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-600">{row.avgImpactScore}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-600">{fmtNum(row.highImpactCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
