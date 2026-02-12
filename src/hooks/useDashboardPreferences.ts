import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardPreferences(projectId: string | undefined, dashboardType: "admin" | "public") {
  return useQuery({
    queryKey: ["dashboard_preferences", projectId, dashboardType],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_dashboard_preferences" as any)
        .select("*")
        .eq("project_id", projectId!)
        .eq("user_id", user.id)
        .eq("dashboard_type", dashboardType)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useSaveDashboardPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      dashboardType,
      sectionOrder,
    }: {
      projectId: string;
      dashboardType: "admin" | "public";
      sectionOrder: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("user_dashboard_preferences" as any)
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .eq("dashboard_type", dashboardType)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_dashboard_preferences" as any)
          .update({ section_order: sectionOrder } as any)
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_dashboard_preferences" as any)
          .insert({
            project_id: projectId,
            user_id: user.id,
            dashboard_type: dashboardType,
            section_order: sectionOrder,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["dashboard_preferences", vars.projectId, vars.dashboardType],
      });
    },
  });
}
