import { Outlet } from "react-router-dom";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useShareableState } from "../../hooks/useShareableState";
import { EmptyState } from "../ui/EmptyState";
import { OnboardingTour } from "../../features/onboarding/OnboardingTour";

export function AppShell() {
  const { data, isLoading, isError } = useDashboardData();
  useShareableState(data?.zones ?? []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4 text-sm font-medium text-zinc-700 shadow-sm">
          Loading parking intelligence data
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <EmptyState title="Dashboard data could not be loaded." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-950">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-16 lg:pb-0">
        <TopNav zones={data.zones} dateRange={data.summaryStats.dateRange} totalViolations={data.summaryStats.totalViolationsRaw} />
        <main className="mx-auto w-full max-w-[1800px] px-4 py-4 lg:px-6">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <OnboardingTour />
    </div>
  );
}
