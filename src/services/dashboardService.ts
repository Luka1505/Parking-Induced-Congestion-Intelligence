import type { DashboardData } from "../types/domain";

export async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch("/data/dashboardData.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load dashboard data: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as DashboardData;
}
