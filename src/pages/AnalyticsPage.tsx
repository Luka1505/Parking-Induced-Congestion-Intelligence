import { AnalyticsCharts } from "../features/analytics/AnalyticsCharts";
import { PostEventLearningPanel } from "../features/analytics/PostEventLearningPanel";
import { useDashboardData } from "../hooks/useDashboardData";
import { useFilteredZones } from "../hooks/useFilteredZones";

export function AnalyticsPage() {
  const { data } = useDashboardData();
  const { filteredZones } = useFilteredZones(data?.zones ?? []);

  if (!data) return null;

  return (
    <div className="space-y-4">
      <PostEventLearningPanel data={data.postEventLearning} />
      <AnalyticsCharts data={data} zones={filteredZones} />
    </div>
  );
}
