import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { GlobalFiltersBar } from "@/components/GlobalFiltersBar";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { Outlet, useParams } from "react-router-dom";

export function DashboardLayout() {
  const { projectId } = useParams();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-30 flex h-12 sm:h-14 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <OrganizationSwitcher />
            </div>
            <div className="flex items-center gap-2">
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
