import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import { AuthGuard } from "./components/AuthGuard";
import { GlobalFiltersProvider } from "./contexts/GlobalFiltersContext";
import { PermissionGuard } from "./components/PermissionGuard";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-loaded pages
const Login = lazy(() => import("./pages/Login"));
const Index = lazy(() => import("./pages/Index"));
const Presentation = lazy(() => import("./pages/Presentation"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicDashboard = lazy(() => import("./pages/PublicDashboard"));
const ProjectsHub = lazy(() => import("./pages/ProjectsHub"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ProjectConfig = lazy(() => import("./pages/ProjectConfig"));
const SalesTable = lazy(() => import("./pages/SalesTable"));
const CompareProjects = lazy(() => import("./pages/CompareProjects"));
const IntegrationStatus = lazy(() => import("./pages/IntegrationStatus"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Guide = lazy(() => import("./pages/Guide"));
const WhatsAppReports = lazy(() => import("./pages/WhatsAppReports"));
const LeadJourney = lazy(() => import("./pages/LeadJourney"));
const PixelAnalytics = lazy(() => import("./pages/PixelAnalytics"));
const BehaviorAnalytics = lazy(() => import("./pages/BehaviorAnalytics"));
const CustomDashboard = lazy(() => import("./pages/CustomDashboard"));
const ForecastPage = lazy(() => import("./pages/ForecastPage"));
const CohortLTVPage = lazy(() => import("./pages/CohortLTVPage"));
const AnomalyAlertsPage = lazy(() => import("./pages/AnomalyAlertsPage"));
const ScheduledReports = lazy(() => import("./pages/ScheduledReports"));
const TemporalComparison = lazy(() => import("./pages/TemporalComparison"));
const ConnectorHub = lazy(() => import("./pages/ConnectorHub"));
const AGSellConfig = lazy(() => import("./pages/AGSellConfig"));
const AGSellMetrics = lazy(() => import("./pages/AGSellMetrics"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const WorkspaceSettings = lazy(() => import("./pages/WorkspaceSettings"));
const AdvancedProjection = lazy(() => import("./pages/AdvancedProjection"));
const ChannelROIReport = lazy(() => import("./pages/ChannelROIReport"));
const AdvancedAttribution = lazy(() => import("./pages/AdvancedAttribution"));
const Debriefing = lazy(() => import("./pages/Debriefing"));
const PerpetualPanel = lazy(() => import("./pages/PerpetualPanel"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="space-y-4 w-full max-w-md px-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-4 grid-cols-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GlobalFiltersProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/view/:slug" element={<PublicDashboard />} />
              <Route
                path="/admin"
                element={
                  <AuthGuard>
                    <DashboardLayout />
                  </AuthGuard>
                }
              >
                <Route index element={<Navigate to="projects" replace />} />
                <Route path="projects" element={<PermissionGuard permission="projects.view"><ProjectsHub /></PermissionGuard>} />
                <Route path="compare" element={<PermissionGuard permission="projects.view"><CompareProjects /></PermissionGuard>} />
                <Route path="projects/:projectId/dashboard" element={<PermissionGuard permission="projects.view"><AdminDashboard /></PermissionGuard>} />
                <Route path="projects/:projectId/sales" element={<PermissionGuard permission="sales.view"><SalesTable /></PermissionGuard>} />
                <Route path="projects/:projectId/config" element={<PermissionGuard permission="projects.edit"><ProjectConfig /></PermissionGuard>} />
                <Route path="projects/:projectId/integrations" element={<PermissionGuard permission="integrations.manage"><IntegrationStatus /></PermissionGuard>} />
                <Route path="projects/:projectId/whatsapp-reports" element={<PermissionGuard permission="projects.edit"><WhatsAppReports /></PermissionGuard>} />
                <Route path="projects/:projectId/lead-journey" element={<PermissionGuard permission="projects.view"><LeadJourney /></PermissionGuard>} />
                <Route path="projects/:projectId/pixel-analytics" element={<PermissionGuard permission="projects.view"><PixelAnalytics /></PermissionGuard>} />
                <Route path="projects/:projectId/behavior" element={<PermissionGuard permission="projects.view"><BehaviorAnalytics /></PermissionGuard>} />
                <Route path="projects/:projectId/custom-dashboard" element={<PermissionGuard permission="projects.view"><CustomDashboard /></PermissionGuard>} />
                <Route path="projects/:projectId/forecast" element={<PermissionGuard permission="projects.view"><ForecastPage /></PermissionGuard>} />
                <Route path="projects/:projectId/cohort-ltv" element={<PermissionGuard permission="projects.view"><CohortLTVPage /></PermissionGuard>} />
                <Route path="projects/:projectId/anomaly-alerts" element={<PermissionGuard permission="projects.view"><AnomalyAlertsPage /></PermissionGuard>} />
                <Route path="projects/:projectId/scheduled-reports" element={<PermissionGuard permission="projects.edit"><ScheduledReports /></PermissionGuard>} />
                <Route path="projects/:projectId/temporal-comparison" element={<PermissionGuard permission="projects.view"><TemporalComparison /></PermissionGuard>} />
                <Route path="projects/:projectId/connectors" element={<PermissionGuard permission="integrations.manage"><ConnectorHub /></PermissionGuard>} />
                <Route path="projects/:projectId/agsell" element={<PermissionGuard permission="integrations.manage"><AGSellConfig /></PermissionGuard>} />
                <Route path="projects/:projectId/ai-insights" element={<PermissionGuard permission="projects.view"><AIInsights /></PermissionGuard>} />
                <Route path="projects/:projectId/channel-roi" element={<PermissionGuard permission="projects.view"><ChannelROIReport /></PermissionGuard>} />
                <Route path="projects/:projectId/advanced-attribution" element={<PermissionGuard permission="projects.view"><AdvancedAttribution /></PermissionGuard>} />
                <Route path="projects/:projectId/debriefing" element={<PermissionGuard permission="projects.view"><Debriefing /></PermissionGuard>} />
                <Route path="projects/:projectId/perpetual-panel" element={<PermissionGuard permission="projects.view"><PerpetualPanel /></PermissionGuard>} />
                <Route path="projection" element={<PermissionGuard permission="projects.view"><AdvancedProjection /></PermissionGuard>} />
                <Route path="users" element={<PermissionGuard adminOnly><UserManagement /></PermissionGuard>} />
                <Route path="settings" element={<PermissionGuard adminOnly><WorkspaceSettings /></PermissionGuard>} />
                <Route path="guide" element={<Guide />} />
              </Route>
              <Route path="/" element={<Index />} />
              <Route path="/apresentacao" element={<Presentation />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </GlobalFiltersProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
