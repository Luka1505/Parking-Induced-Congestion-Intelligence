import { useQuery } from "@tanstack/react-query";
import { fetchDashboardData } from "../services/dashboardService";

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard-data"],
    queryFn: fetchDashboardData,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
