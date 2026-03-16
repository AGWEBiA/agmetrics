import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OnboardingStepStatus {
  completed: boolean;
  detail?: string;
}

export type OnboardingStatusMap = Record<string, OnboardingStepStatus>;

export function useOnboardingStatus(projectId: string | undefined) {
  return useQuery({
    queryKey: ["onboarding_status", projectId],
    enabled: !!projectId,
    refetchInterval: 30000,
    queryFn: async () => {
      const status: OnboardingStatusMap = {};

      // Check webhooks — project has kiwify or hotmart credentials configured
      const { data: project } = await supabase
        .from("projects")
        .select("kiwify_webhook_token, hotmart_webhook_token, kiwify_client_id, hotmart_client_id")
        .eq("id", projectId!)
        .single();
      
      const hasWebhookConfig = !!(project?.kiwify_webhook_token || project?.hotmart_webhook_token || project?.kiwify_client_id || project?.hotmart_client_id);
      const { count: salesCount } = await supabase
        .from("sales_events")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId!);
      
      status.webhook = {
        completed: hasWebhookConfig,
        detail: hasWebhookConfig
          ? `${salesCount || 0} venda${(salesCount || 0) !== 1 ? "s" : ""} recebida${(salesCount || 0) !== 1 ? "s" : ""}`
          : "Nenhum webhook configurado",
      };

      // Check ads
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
      const platforms = [metaCreds ? "Meta" : null, googleCreds ? "Google" : null].filter(Boolean);
      status.ads = {
        completed: platforms.length > 0,
        detail: platforms.length > 0 ? platforms.join(" + ") + " conectado" : "Nenhuma plataforma conectada",
      };

      // Check products
      const { count: productCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId!);
      status.products = {
        completed: (productCount || 0) > 0,
        detail: (productCount || 0) > 0
          ? `${productCount} produto${productCount !== 1 ? "s" : ""}`
          : "Nenhum produto cadastrado",
      };

      // Check pixel
      const { data: pixelData, count: pixelCount } = await supabase
        .from("tracking_events")
        .select("created_at", { count: "exact" })
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(1);
      const lastPixelEvent = pixelData?.[0]?.created_at || null;
      const pixelActive = lastPixelEvent
        ? Date.now() - new Date(lastPixelEvent).getTime() < 24 * 60 * 60 * 1000
        : false;
      status.pixel = {
        completed: (pixelCount || 0) > 0,
        detail: pixelActive
          ? `Pixel Ativo · ${pixelCount} evento${(pixelCount || 0) !== 1 ? "s" : ""}`
          : (pixelCount || 0) > 0
            ? "Pixel Inativo"
            : "Pixel Inativo · Instalar pixel",
      };

      // Check goals
      const { count: goalCount } = await supabase
        .from("project_goals")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId!);
      status.goals = {
        completed: (goalCount || 0) > 0,
        detail: (goalCount || 0) > 0
          ? `${goalCount} meta${(goalCount || 0) !== 1 ? "s" : ""} definida${(goalCount || 0) !== 1 ? "s" : ""}`
          : "Nenhuma meta definida",
      };

      // Dashboard
      const completedCount = Object.values(status).filter((s) => s.completed).length;
      status.dashboard = {
        completed: completedCount >= 2,
        detail: completedCount >= 2 ? "Pronto para usar" : "Complete mais passos",
      };

      return status;
    },
    staleTime: 15000,
  });
}
