import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardTab, WidgetConfig } from "@/types/widgets";

export function useDashboardLayouts(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["dashboard_layouts", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<DashboardTab[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !projectId) return [];
      const { data, error } = await supabase
        .from("dashboard_layouts" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .order("tab_order", { ascending: true });
      if (error) throw error;
      return ((data as any[]) || []).map((d: any) => ({
        id: d.id,
        tab_name: d.tab_name,
        tab_order: d.tab_order,
        widgets: (d.widgets || []) as WidgetConfig[],
      }));
    },
  });

  const upsertTab = useMutation({
    mutationFn: async (tab: DashboardTab) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !projectId) throw new Error("Not authenticated");
      const { error } = await supabase.from("dashboard_layouts" as any).upsert(
        {
          id: tab.id,
          user_id: user.id,
          project_id: projectId,
          tab_name: tab.tab_name,
          tab_order: tab.tab_order,
          widgets: tab.widgets as any,
        } as any,
        { onConflict: "id" }
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard_layouts", projectId] }),
  });

  const deleteTab = useMutation({
    mutationFn: async (tabId: string) => {
      const { error } = await supabase.from("dashboard_layouts" as any).delete().eq("id", tabId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard_layouts", projectId] }),
  });

  return { tabs: query.data || [], isLoading: query.isLoading, upsertTab, deleteTab };
}
