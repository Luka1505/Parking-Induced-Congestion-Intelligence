interface ProgressBarProps {
  value: number;
  color?: string;
  label?: string;
}

export function ProgressBar({ value, color = "#2563eb", label }: ProgressBarProps) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
          <span>{label}</span>
          <span className="font-mono">{bounded.toFixed(1)}%</span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full" style={{ width: `${bounded}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
