import { RiskEvaluator } from "../features/tools/RiskEvaluator";
import { useDashboardData } from "../hooks/useDashboardData";

export function RiskEvaluatorPage() {
  const { data } = useDashboardData();
  if (!data) return null;
  return <RiskEvaluator zones={data.zones} />;
}
