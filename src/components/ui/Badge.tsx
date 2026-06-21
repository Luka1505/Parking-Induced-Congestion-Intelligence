import type { ConfidenceTier, ImpactCategory } from "../../types/domain";
import { CONFIDENCE_COLORS, IMPACT_COLORS } from "../../utils/constants";

type BadgeTone = ImpactCategory | ConfidenceTier | "Neutral" | "Info";

interface BadgeProps {
  tone?: BadgeTone;
  variant?: "impact" | "confidence" | "neutral";
  children: React.ReactNode;
  className?: string;
}

function toneStyles(tone: BadgeTone, variant: BadgeProps["variant"]) {
  if (tone === "High" || tone === "Medium" || tone === "Low") {
    const color = variant === "confidence" ? CONFIDENCE_COLORS[tone as ConfidenceTier] : IMPACT_COLORS[tone as ImpactCategory];
    return { color, borderColor: color, backgroundColor: `${color}18` };
  }
  if (tone === "Info") return { color: "#2563eb", borderColor: "#93c5fd", backgroundColor: "#eff6ff" };
  return { color: "#475569", borderColor: "#cbd5e1", backgroundColor: "#f8fafc" };
}

export function Badge({ tone = "Neutral", variant = "impact", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${className}`}
      style={toneStyles(tone, variant)}
    >
      {children}
    </span>
  );
}
