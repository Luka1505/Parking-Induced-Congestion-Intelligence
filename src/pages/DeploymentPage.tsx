import { DeploymentAllocator } from "../features/tools/DeploymentAllocator";
import { useDashboardData } from "../hooks/useDashboardData";

export function DeploymentPage() {
  const { data } = useDashboardData();
  if (!data) return null;
  return <DeploymentAllocator zones={data.zones} />;
}
