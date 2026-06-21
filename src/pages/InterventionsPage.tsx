import { InterventionTracker } from "../features/tools/InterventionTracker";
import { useDashboardData } from "../hooks/useDashboardData";

export function InterventionsPage() {
  const { data } = useDashboardData();
  if (!data) return null;
  return <InterventionTracker data={data.interventionTracking} />;
}
