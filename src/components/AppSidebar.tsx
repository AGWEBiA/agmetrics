import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  ExternalLink,
  LogOut,
  BarChart3,
  ShoppingCart,
  Plug,
  Users,
  BookOpen,
  MessageSquare,
  Route,
  Activity,
  MousePointer2,
  LayoutGrid,
  Brain,
  Sparkles,
  Shield,
  FileBarChart,
  GitCompare,
  Paintbrush,
  Zap,
  ChevronDown,
  Rocket,
  TrendingUp,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
import { useCurrentUser, hasPermission } from "@/hooks/useCurrentUser";
import type { AppPermission } from "@/hooks/useAdminUsers";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";

export function AppSidebar() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: project } = useProject(projectId);
  const { data: currentUser } = useCurrentUser();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const can = (perm: AppPermission) => hasPermission(currentUser, perm);
  const isAdmin = currentUser?.role === "admin";

  const mainItems = [
    { title: "Projetos", url: "/admin/projects", icon: FolderKanban, visible: can("projects.view") },
    { title: "Projeção Avançada", url: "/admin/projection", icon: Brain, visible: can("projects.view") },
    { title: "Usuários", url: "/admin/users", icon: Users, visible: isAdmin },
    { title: "Workspace", url: "/admin/settings", icon: Paintbrush, visible: isAdmin },
    { title: "Guia", url: "/admin/guide", icon: BookOpen, visible: true },
  ].filter((item) => item.visible);

  const analysisItems = projectId
    ? [
        { title: "Dashboard", url: `/admin/projects/${projectId}/dashboard`, icon: LayoutDashboard, visible: can("projects.view") },
        { title: "Vendas", url: `/admin/projects/${projectId}/sales`, icon: ShoppingCart, visible: can("sales.view") },
        { title: "Jornada do Lead", url: `/admin/projects/${projectId}/lead-journey`, icon: Route, visible: can("projects.view") },
        { title: "Analytics do Pixel", url: `/admin/projects/${projectId}/pixel-analytics`, icon: Activity, visible: can("projects.view") },
        { title: "Comportamento", url: `/admin/projects/${projectId}/behavior`, icon: MousePointer2, visible: can("projects.view") },
        { title: "Cohort & LTV", url: `/admin/projects/${projectId}/cohort-ltv`, icon: Users, visible: can("projects.view") },
        { title: "Comparação Temporal", url: `/admin/projects/${projectId}/temporal-comparison`, icon: GitCompare, visible: can("projects.view") },
        { title: "ROI por Canal", url: `/admin/projects/${projectId}/channel-roi`, icon: TrendingUp, visible: can("projects.view") },
        { title: "Atribuição Avançada", url: `/admin/projects/${projectId}/advanced-attribution`, icon: GitCompare, visible: can("projects.view") },
      ].filter((item) => item.visible)
    : [];

  const reportItems = projectId
    ? [
        { title: "Dashboard Custom", url: `/admin/projects/${projectId}/custom-dashboard`, icon: LayoutGrid, visible: can("projects.view") },
        { title: "Inteligência IA", url: `/admin/projects/${projectId}/ai-insights`, icon: Sparkles, visible: can("projects.view") },
        { title: "Forecasting IA", url: `/admin/projects/${projectId}/forecast`, icon: Brain, visible: can("projects.view") },
        { title: "Alertas Anomalia", url: `/admin/projects/${projectId}/anomaly-alerts`, icon: Shield, visible: can("projects.view") },
        { title: "Relatórios Agendados", url: `/admin/projects/${projectId}/scheduled-reports`, icon: FileBarChart, visible: can("projects.edit") },
        { title: "Relatórios WhatsApp", url: `/admin/projects/${projectId}/whatsapp-reports`, icon: MessageSquare, visible: can("projects.edit") },
      ].filter((item) => item.visible)
    : [];

  const configItems = projectId
    ? [
        { title: "Configurações", url: `/admin/projects/${projectId}/config`, icon: Settings, visible: can("projects.edit") },
        { title: "Integrações", url: `/admin/projects/${projectId}/integrations`, icon: Plug, visible: can("integrations.manage") },
        { title: "Hub de Conectores", url: `/admin/projects/${projectId}/connectors`, icon: Zap, visible: can("integrations.manage") },
        { title: "AG Sell", url: `/admin/projects/${projectId}/agsell`, icon: Rocket, visible: can("integrations.manage") },
      ].filter((item) => item.visible)
    : [];

  // Check if any item in a group is active
  const isGroupActive = (items: typeof mainItems) =>
    items.some((item) => location.pathname.startsWith(item.url));

  const renderMenuItems = (items: typeof mainItems) => (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + "/");
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild>
              <NavLink
                to={item.url}
                end={false}
                className={`hover:bg-sidebar-accent transition-colors rounded-md ${isActive ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" : ""}`}
                activeClassName="bg-primary/10 text-primary font-medium"
                onClick={closeSidebar}
              >
                <item.icon className={`mr-2 h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                <span className="truncate">{item.title}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent className="overflow-y-auto overflow-x-hidden">
        {/* App header */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <span className="text-base font-semibold tracking-tight">AGMetrics</span>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={`hover:bg-sidebar-accent transition-colors rounded-md ${isActive ? "bg-primary/10 text-primary font-medium" : ""}`}
                        activeClassName="bg-primary/10 text-primary font-medium"
                        onClick={closeSidebar}
                      >
                        <item.icon className={`mr-2 h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {projectId && (
          <>
            <Separator className="mx-4 w-auto" />
            
            {/* Project name */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold truncate">
                {project?.name || "Projeto"}
              </p>
            </div>

            {/* Análises */}
            {analysisItems.length > 0 && (
              <Collapsible defaultOpen={isGroupActive(analysisItems)} className="group/collapsible">
                <SidebarGroup className="py-0">
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors text-xs uppercase tracking-wider text-muted-foreground px-4">
                      <span>Análises</span>
                      <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-data-[state=closed]/collapsible:rotate-[-90deg]" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      {renderMenuItems(analysisItems)}
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* Relatórios */}
            {reportItems.length > 0 && (
              <Collapsible defaultOpen={isGroupActive(reportItems)} className="group/collapsible">
                <SidebarGroup className="py-0">
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors text-xs uppercase tracking-wider text-muted-foreground px-4">
                      <span>Relatórios</span>
                      <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-data-[state=closed]/collapsible:rotate-[-90deg]" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      {renderMenuItems(reportItems)}
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* Configurações */}
            {configItems.length > 0 && (
              <Collapsible defaultOpen={isGroupActive(configItems)} className="group/collapsible">
                <SidebarGroup className="py-0">
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors text-xs uppercase tracking-wider text-muted-foreground px-4">
                      <span>Configurações</span>
                      <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-data-[state=closed]/collapsible:rotate-[-90deg]" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      {renderMenuItems(configItems)}
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* Dashboard Público link */}
            {project?.view_token && (
              <SidebarGroup className="py-0">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a
                          href={`https://agmetrics.lovable.app/view/${project.slug || project.view_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center hover:bg-sidebar-accent transition-colors rounded-md"
                          onClick={closeSidebar}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          <span>Dashboard Público</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 shrink-0">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
