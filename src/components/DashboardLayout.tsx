import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RefreshButton } from "@/components/RefreshButton";
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
      <div className="flex min-h-screen w-full bg-background/50">
        <AppSidebar />
        <main className="flex-1 overflow-auto relative">
          <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between gap-2 border-b bg-background/60 backdrop-blur-xl px-4 sm:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="shrink-0 hover:bg-primary/10 transition-colors" />
              <div className="h-6 w-[1px] bg-border/60 mx-1 hidden sm:block" />
              <OrganizationSwitcher />
              <div className="h-6 w-[1px] bg-border/60 mx-1 hidden md:block" />
              <Breadcrumbs />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <RefreshButton />
              <div className="flex items-center gap-1 px-2 py-1 bg-muted/40 rounded-full border border-border/40">
                <PushNotificationToggle />
                <NotificationBell />
              </div>
              <ThemeToggle />
            </div>
          </header>
          <div className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {projectId && (
              <div className="glass-card rounded-2xl p-1 modern-shadow">
                <GlobalFiltersBar />
              </div>
            )}
            <div className="pb-10">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
