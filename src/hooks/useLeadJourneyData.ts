import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export function useLeadJourneyData(projectId: string | undefined) {
  const { data: events } = useQuery({
    queryKey: ["lead_events_summary", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_events")
        .select("event_type, utm_source, utm_campaign, utm_medium, event_source, amount, buyer_email, tracking_src, tracking_sck, event_date, event_detail")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 300000,
  });

  return useMemo(() => {
    if (!events || events.length === 0) return null;

    const purchases = events.filter((e) => e.event_type === "purchase");
    const adClicks = events.filter((e) => e.event_type === "ad_click");
    const totalRevenue = purchases.reduce((s, e) => s + Number(e.amount || 0), 0);
    const conversionRate = adClicks.length > 0 ? (purchases.length / adClicks.length) * 100 : 0;

    // Source chart
    const sourceMap = new Map<string, { clicks: number; purchases: number }>();
    events.forEach((e) => {
      const src = e.utm_source || e.event_source || "direto";
      const existing = sourceMap.get(src) || { clicks: 0, purchases: 0 };
      if (e.event_type === "ad_click") existing.clicks++;
      if (e.event_type === "purchase") existing.purchases++;
      sourceMap.set(src, existing);
    });

    const sourceChart = Array.from(sourceMap.entries())
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.purchases - a.purchases);

    const topSource = sourceChart[0]?.source || "—";

    return {
      totalLeads: adClicks.length,
      totalPurchases: purchases.length,
      conversionRate,
      totalRevenue,
      topSource,
      sourceChart,
    };
  }, [events]);
}
