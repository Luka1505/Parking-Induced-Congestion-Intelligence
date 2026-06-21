import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";

const OverviewPage = lazy(() => import("./pages/OverviewPage").then((module) => ({ default: module.OverviewPage })));
const WorkspacePage = lazy(() => import("./pages/WorkspacePage").then((module) => ({ default: module.WorkspacePage })));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage })));
const RiskEvaluatorPage = lazy(() => import("./pages/RiskEvaluatorPage").then((module) => ({ default: module.RiskEvaluatorPage })));
const InterventionsPage = lazy(() => import("./pages/InterventionsPage").then((module) => ({ default: module.InterventionsPage })));
const DeploymentPage = lazy(() => import("./pages/DeploymentPage").then((module) => ({ default: module.DeploymentPage })));
const ExportPage = lazy(() => import("./pages/ExportPage").then((module) => ({ default: module.ExportPage })));

function RouteFallback() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-600">
      Loading view
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Suspense fallback={<RouteFallback />}><OverviewPage /></Suspense>} />
        <Route path="workspace" element={<Suspense fallback={<RouteFallback />}><WorkspacePage /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={<RouteFallback />}><AnalyticsPage /></Suspense>} />
        <Route path="tools/risk" element={<Suspense fallback={<RouteFallback />}><RiskEvaluatorPage /></Suspense>} />
        <Route path="tools/interventions" element={<Suspense fallback={<RouteFallback />}><InterventionsPage /></Suspense>} />
        <Route path="tools/deployment" element={<Suspense fallback={<RouteFallback />}><DeploymentPage /></Suspense>} />
        <Route path="export" element={<Suspense fallback={<RouteFallback />}><ExportPage /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
