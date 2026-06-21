import { motion } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  tone?: "red" | "amber" | "green" | "blue" | "neutral";
}

const toneClasses = {
  red: "text-red-700 bg-red-50 border-red-100",
  amber: "text-amber-700 bg-amber-50 border-amber-100",
  green: "text-emerald-700 bg-emerald-50 border-emerald-100",
  blue: "text-blue-700 bg-blue-50 border-blue-100",
  neutral: "text-zinc-700 bg-white border-zinc-200",
};

export function MetricCard({ label, value, sub, icon, tone = "neutral" }: MetricCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
          <div className="mt-2 text-2xl font-bold text-zinc-950">{value}</div>
        </div>
        {icon ? <div className={`rounded-lg border p-2 ${toneClasses[tone]}`}>{icon}</div> : null}
      </div>
      {sub ? <div className="mt-2 text-sm text-zinc-500">{sub}</div> : null}
    </motion.div>
  );
}
