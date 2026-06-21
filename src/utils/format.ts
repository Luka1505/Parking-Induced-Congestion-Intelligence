export function fmtNum(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("en-IN");
}

export function fmtPct(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value.toFixed(fractionDigits)}%`;
}

export function titleize(value: string | null | undefined): string {
  if (!value) return "None";
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function shortLocation(location: string, parts = 2): string {
  return location.split(",").slice(0, parts).join(",").trim();
}

export function safeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
