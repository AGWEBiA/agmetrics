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
  Shield,
  FileBarChart,
  GitCompare,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useParams, useNavigate } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AppSidebar() {
  const { projectId } = useParams();
  const navigate = useNavigate();
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
    { title: "Usuários", url: "/admin/users", icon: Users, visible: isAdmin },
    { title: "Guia", url: "/admin/guide", icon: BookOpen, visible: true },
  ].filter((item) => item.visible);

  const projectItems = projectId
    ? [
        {
          title: "Dashboard",
          url: `/admin/projects/${projectId}/dashboard`,
          icon: LayoutDashboard,
          visible: can("projects.view"),
        },
        {
          title: "Vendas",
          url: `/admin/projects/${projectId}/sales`,
          icon: ShoppingCart,
          visible: can("sales.view"),
        },
        {
          title: "Jornada do Lead",
          url: `/admin/projects/${projectId}/lead-journey`,
          icon: Route,
          visible: can("projects.view"),
        },
        {
          title: "Analytics do Pixel",
          url: `/admin/projects/${projectId}/pixel-analytics`,
          icon: Activity,
          visible: can("projects.view"),
        },
        {
          title: "Comportamento",
          url: `/admin/projects/${projectId}/behavior`,
          icon: MousePointer2,
          visible: can("projects.view"),
        },
        {
          title: "Dashboard Custom",
          url: `/admin/projects/${projectId}/custom-dashboard`,
          icon: LayoutGrid,
          visible: can("projects.view"),
        },
        {
          title: "Forecasting IA",
          url: `/admin/projects/${projectId}/forecast`,
          icon: Brain,
          visible: can("projects.view"),
        },
        {
          title: "Cohort & LTV",
          url: `/admin/projects/${projectId}/cohort-ltv`,
          icon: Users,
          visible: can("projects.view"),
        },
        {
          title: "Alertas Anomalia",
          url: `/admin/projects/${projectId}/anomaly-alerts`,
          icon: Shield,
          visible: can("projects.view"),
        },
        {
          title: "Relatórios Agendados",
          url: `/admin/projects/${projectId}/scheduled-reports`,
          icon: FileBarChart,
          visible: can("projects.edit"),
        },
        {
          title: "Comparação Temporal",
          url: `/admin/projects/${projectId}/temporal-comparison`,
          icon: GitCompare,
          visible: can("projects.view"),
        },
        {
          title: "Relatórios WhatsApp",
          url: `/admin/projects/${projectId}/whatsapp-reports`,
          icon: MessageSquare,
          visible: can("projects.edit"),
        },
        {
          title: "Configurações",
          url: `/admin/projects/${projectId}/config`,
          icon: Settings,
          visible: can("projects.edit"),
        },
        {
          title: "Integrações",
          url: `/admin/projects/${projectId}/integrations`,
          icon: Plug,
          visible: can("integrations.manage"),
        },
      ].filter((item) => item.visible)
    : [];

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-base font-semibold tracking-tight">
                AGMetrics
              </span>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      onClick={closeSidebar}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {projectId && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-4">
              {project?.name || "Projeto"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={false}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        onClick={closeSidebar}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {project?.view_token && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a
                        href={`https://agmetrics.lovable.app/view/${project.slug || project.view_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center hover:bg-sidebar-accent"
                        onClick={closeSidebar}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        <span>Dashboard Público</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
