import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOnboardingStatus(projectId: string | undefined) {
  return useQuery({
    queryKey: ["onboarding_status", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const completed = new Set<string>();

      // Check webhooks (sales_events exist)
      const { count: salesCount } = await supabase
        .from("sales_events")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId!);
      if (salesCount && salesCount > 0) completed.add("webhook");

      // Check ads (meta or google credentials)
      const { data: metaCreds } = await supabase
        .from("meta_credentials")
        .select("id")
        .eq("project_id", projectId!)
        .maybeSingle();
      const { data: googleCreds } = await supabase
        .from("google_credentials")
        .select("id")
        .eq("project_id", projectId!)
        .maybeSingle();
      if (metaCreds || googleCreds) completed.add("ads");

      // Check products
      const { count: productCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId!);
      if (productCount && productCount > 0) completed.add("products");

      // Check pixel (tracking events exist)
      const { count: pixelCount } = await supabase
        .from("tracking_events")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId!);
      if (pixelCount && pixelCount > 0) completed.add("pixel");

      // Check goals
      const { count: goalCount } = await supabase
        .from("project_goals")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId!);
      if (goalCount && goalCount > 0) completed.add("goals");

      // Dashboard is always "done" if they've visited
      if (completed.size >= 2) completed.add("dashboard");

      return completed;
    },
    staleTime: 60000,
  });
}
