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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
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
  const { isMobile, setOpenMobile } = useSidebar();

  const closeSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const mainItems = [
    { title: "Projetos", url: "/admin/projects", icon: FolderKanban },
    { title: "Usuários", url: "/admin/users", icon: Users },
    { title: "Guia", url: "/admin/guide", icon: BookOpen },
  ];

  const projectItems = projectId
    ? [
        {
          title: "Dashboard",
          url: `/admin/projects/${projectId}/dashboard`,
          icon: LayoutDashboard,
        },
        {
          title: "Vendas",
          url: `/admin/projects/${projectId}/sales`,
          icon: ShoppingCart,
        },
        {
          title: "Configurações",
          url: `/admin/projects/${projectId}/config`,
          icon: Settings,
        },
        {
          title: "Integrações",
          url: `/admin/projects/${projectId}/integrations`,
          icon: Plug,
        },
      ]
    : [];

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-base font-semibold tracking-tight">
                LaunchMetrics
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
                        href={`/view/${project.view_token}`}
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
