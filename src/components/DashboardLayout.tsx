import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { GlobalFiltersBar } from "@/components/GlobalFiltersBar";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { Outlet, useParams, useLocation, Link } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
import { ChevronRight, FolderKanban } from "lucide-react";

function Breadcrumbs() {
  const { projectId } = useParams();
  const location = useLocation();
  const { data: project } = useProject(projectId);

  if (!projectId) return null;

  const path = location.pathname;
  let currentPage = "Dashboard";
  if (path.includes("/sales")) currentPage = "Vendas";
  else if (path.includes("/config")) currentPage = "Configurações";
  else if (path.includes("/integrations")) currentPage = "Integrações";
  else if (path.includes("/lead-journey")) currentPage = "Jornada do Lead";
  else if (path.includes("/pixel-analytics")) currentPage = "Pixel Analytics";
  else if (path.includes("/behavior")) currentPage = "Comportamento";
  else if (path.includes("/cohort-ltv")) currentPage = "Cohort & LTV";
  else if (path.includes("/temporal-comparison")) currentPage = "Comparação Temporal";
  else if (path.includes("/channel-roi")) currentPage = "ROI por Canal";
  else if (path.includes("/advanced-attribution")) currentPage = "Atribuição Avançada";
  else if (path.includes("/custom-dashboard")) currentPage = "Dashboard Custom";
  else if (path.includes("/ai-insights")) currentPage = "Inteligência IA";
  else if (path.includes("/forecast")) currentPage = "Forecasting IA";
  else if (path.includes("/anomaly-alerts")) currentPage = "Alertas";
  else if (path.includes("/scheduled-reports")) currentPage = "Relatórios";
  else if (path.includes("/whatsapp-reports")) currentPage = "WhatsApp";
  else if (path.includes("/connectors")) currentPage = "Conectores";
  else if (path.includes("/agsell")) currentPage = "AG Sell";

  return (
    <nav className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
      <Link to="/admin/projects" className="hover:text-foreground transition-colors flex items-center gap-1">
        <FolderKanban className="h-3 w-3" />
        Projetos
      </Link>
      <ChevronRight className="h-3 w-3" />
      <Link
        to={`/admin/projects/${projectId}/dashboard`}
        className="hover:text-foreground transition-colors max-w-[120px] truncate"
      >
        {project?.name || "..."}
      </Link>
      <ChevronRight className="h-3 w-3" />
      <span className="text-foreground font-medium">{currentPage}</span>
    </nav>
  );
}

export function DashboardLayout() {
  const { projectId } = useParams();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-30 flex h-12 sm:h-14 items-center justify-between gap-2 border-b bg-background/80 backdrop-blur-sm px-3 sm:px-6">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="shrink-0" />
              <OrganizationSwitcher />
              <Breadcrumbs />
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <PushNotificationToggle />
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          <div className="p-4 sm:p-6 space-y-4">
            {projectId && <GlobalFiltersBar />}
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
