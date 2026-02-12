import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import { AuthGuard } from "./components/AuthGuard";
import Login from "./pages/Login";
import ProjectsHub from "./pages/ProjectsHub";
import AdminDashboard from "./pages/AdminDashboard";
import ProjectConfig from "./pages/ProjectConfig";
import PublicDashboard from "./pages/PublicDashboard";
import SalesTable from "./pages/SalesTable";
import CompareProjects from "./pages/CompareProjects";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/view/:viewToken" element={<PublicDashboard />} />
          <Route
            path="/admin"
            element={
              <AuthGuard>
                <DashboardLayout />
              </AuthGuard>
            }
          >
            <Route index element={<Navigate to="projects" replace />} />
            <Route path="projects" element={<ProjectsHub />} />
            <Route path="compare" element={<CompareProjects />} />
            <Route path="projects/:projectId/dashboard" element={<AdminDashboard />} />
            <Route path="projects/:projectId/sales" element={<SalesTable />} />
            <Route path="projects/:projectId/config" element={<ProjectConfig />} />
          </Route>
          <Route path="/" element={<Navigate to="/admin/projects" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
