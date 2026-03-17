import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import { AuthGuard } from "./components/AuthGuard";
import { GlobalFiltersProvider } from "./contexts/GlobalFiltersContext";
import Login from "./pages/Login";
import ProjectsHub from "./pages/ProjectsHub";
import AdminDashboard from "./pages/AdminDashboard";
import ProjectConfig from "./pages/ProjectConfig";
import PublicDashboard from "./pages/PublicDashboard";
import SalesTable from "./pages/SalesTable";
import CompareProjects from "./pages/CompareProjects";
import IntegrationStatus from "./pages/IntegrationStatus";
import UserManagement from "./pages/UserManagement";
import Guide from "./pages/Guide";
import NotFound from "./pages/NotFound";
import WhatsAppReports from "./pages/WhatsAppReports";
import LeadJourney from "./pages/LeadJourney";
import PixelAnalytics from "./pages/PixelAnalytics";
import BehaviorAnalytics from "./pages/BehaviorAnalytics";
import CustomDashboard from "./pages/CustomDashboard";
import ForecastPage from "./pages/ForecastPage";
import CohortLTVPage from "./pages/CohortLTVPage";
import AnomalyAlertsPage from "./pages/AnomalyAlertsPage";
import ScheduledReports from "./pages/ScheduledReports";
import TemporalComparison from "./pages/TemporalComparison";
import ConnectorHub from "./pages/ConnectorHub";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import { PermissionGuard } from "./components/PermissionGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GlobalFiltersProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
              <Route path="users" element={<PermissionGuard adminOnly><UserManagement /></PermissionGuard>} />
              <Route path="guide" element={<Guide />} />
            </Route>
            <Route path="/" element={<Navigate to="/admin/projects" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </GlobalFiltersProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
