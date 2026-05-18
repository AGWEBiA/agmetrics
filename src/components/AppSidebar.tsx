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
  ClipboardCheck,
  FileCode2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { AGSellIcon } from "@/components/agsell/AGSellLogo";
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

  const PERPETUAL_STRATEGIES = ["perpetuo", "funis", "evento_presencial", "lancamento_pago"];
  const showPerpetualPanel = project?.strategy && PERPETUAL_STRATEGIES.includes(project.strategy);

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
    { title: "Diagnóstico", url: "/admin/debug", icon: Activity, visible: isAdmin },
    { title: "Guia", url: "/admin/guide", icon: BookOpen, visible: true },
  ].filter((item) => item.visible);

  const analysisItems = projectId
    ? [
        { title: "Dashboard", url: `/admin/projects/${projectId}/dashboard`, icon: LayoutDashboard, visible: can("projects.view") },
        { title: "Painel do Perpétuo", url: `/admin/projects/${projectId}/perpetual-panel`, icon: TrendingUp, visible: can("projects.view") && !!showPerpetualPanel },
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
        { title: "Métricas AG Sell", url: `/admin/projects/${projectId}/agsell-metrics`, icon: AGSellIcon as any, visible: can("projects.view") },
        { title: "Debriefing", url: `/admin/projects/${projectId}/debriefing`, icon: ClipboardCheck, visible: can("projects.view") },
      ].filter((item) => item.visible)
    : [];

  const configItems = projectId
    ? [
        { title: "Configurações", url: `/admin/projects/${projectId}/config`, icon: Settings, visible: can("projects.edit") },
        { title: "Integrações", url: `/admin/projects/${projectId}/integrations`, icon: Plug, visible: can("integrations.manage") },
        { title: "Hub de Conectores", url: `/admin/projects/${projectId}/connectors`, icon: Zap, visible: can("integrations.manage") },
        { title: "AG Sell", url: `/admin/projects/${projectId}/agsell`, icon: AGSellIcon as any, visible: can("integrations.manage") },
      ].filter((item) => item.visible)
    : [];

  // Check if any item in a group is active
  const isGroupActive = (items: typeof mainItems) =>
    items.some((item) => location.pathname.startsWith(item.url));

  const renderMenuItems = (items: typeof mainItems) => (
    <SidebarMenu className="px-2">
      {items.map((item) => {
        const isActive = location.pathname === item.url || (item.url.includes("/dashboard") && location.pathname.includes("/dashboard"));
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild tooltip={item.title}>
              <NavLink
                to={item.url}
                end={false}
                className={`group flex items-center px-3 py-2 my-0.5 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? "bg-primary/10 text-primary font-bold border-l-4 border-primary" 
                    : "hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                }`}
                activeClassName=""
                onClick={closeSidebar}
              >
                <item.icon className={`mr-3 h-4 w-4 transition-transform group-hover:scale-110 ${isActive ? "text-primary" : ""}`} />
                <span className="truncate text-xs">{item.title}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar className="border-r border-border/40 bg-sidebar/80 backdrop-blur-xl">
      <SidebarContent className="overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* App header */}
        <SidebarGroup className="py-6">
          <SidebarGroupLabel className="px-5 mb-2">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-gradient">AG Metrics</span>
                <p className="text-[10px] text-muted-foreground font-medium -mt-1 opacity-70">INTELIGÊNCIA DE DADOS</p>
              </div>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {mainItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end
                        className={`group flex items-center px-3 py-2.5 my-0.5 rounded-xl transition-all duration-200 ${
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]" 
                            : "hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                        }`}
                        activeClassName=""
                        onClick={closeSidebar}
                      >
                        <item.icon className={`mr-3 h-4.5 w-4.5 transition-transform group-hover:scale-110 ${isActive ? "text-primary-foreground" : ""}`} />
                        <span className="font-semibold text-sm">{item.title}</span>
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
