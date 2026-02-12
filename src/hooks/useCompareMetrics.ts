import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DateFilter {
  from?: Date;
  to?: Date;
}

function inRange(dateStr: string | null, filter: DateFilter): boolean {
  if (!filter.from && !filter.to) return true;
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (filter.from && d < filter.from) return false;
  if (filter.to) {
    const end = new Date(filter.to);
    end.setHours(23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}

export interface ProjectCompareMetrics {
  projectId: string;
  projectName: string;
  strategy: string;
  roi: number;
  investment: number;
  revenue: number;
  salesCount: number;
  results: number;
  costPerResult: number;
  clicks: number;
  ctr: number;
  cpc: number;
  connectRate: number;
  leads: number;
  cpl: number;
  impressions: number;
  isLoading: boolean;
}

export function useCompareMetrics(
  projects: { id: string; name: string; strategy: string }[],
  dateFilter?: DateFilter
) {
  const df = dateFilter || {};

  const salesQueries = useQueries({
    queries: projects.map((p) => ({
      queryKey: ["compare_sales", p.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("sales_events")
          .select("amount, status, sale_date, created_at")
          .eq("project_id", p.id);
        if (error) throw error;
        return data || [];
      },
    })),
  });

  const metaQueries = useQueries({
    queries: projects.map((p) => ({
      queryKey: ["compare_meta", p.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("meta_metrics")
          .select("date, investment, results, clicks, impressions, ctr, link_clicks, landing_page_views, leads, cost_per_result")
          .eq("project_id", p.id);
        if (error) throw error;
        return data || [];
      },
    })),
  });

  const googleQueries = useQueries({
    queries: projects.map((p) => ({
      queryKey: ["compare_google", p.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("google_metrics")
          .select("date, investment, clicks, impressions, conversions")
          .eq("project_id", p.id);
        if (error) throw error;
        return data || [];
      },
    })),
  });

  const manualQueries = useQueries({
    queries: projects.map((p) => ({
      queryKey: ["compare_manual", p.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("manual_investments")
          .select("date, amount")
          .eq("project_id", p.id);
        if (error) throw error;
        return data || [];
      },
    })),
  });

  return projects.map((p, i): ProjectCompareMetrics => {
    const isLoading =
      salesQueries[i]?.isLoading ||
      metaQueries[i]?.isLoading ||
      googleQueries[i]?.isLoading ||
      manualQueries[i]?.isLoading;

    const sales = (salesQueries[i]?.data || []).filter((s: any) =>
      inRange(s.sale_date || s.created_at, df)
    );
    const meta = (metaQueries[i]?.data || []).filter((m: any) => inRange(m.date, df));
    const google = (googleQueries[i]?.data || []).filter((m: any) => inRange(m.date, df));
    const manual = (manualQueries[i]?.data || []).filter((m: any) => inRange(m.date, df));

    const approved = sales.filter((s: any) => s.status === "approved");
    const revenue = approved.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
    const salesCount = approved.length;

    const metaInv = meta.reduce((sum: number, m: any) => sum + Number(m.investment || 0), 0);
    const googleInv = google.reduce((sum: number, m: any) => sum + Number(m.investment || 0), 0);
    const manualInv = manual.reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);
    const investment = metaInv + googleInv + manualInv;

    const roi = investment > 0 ? ((revenue - investment) / investment) * 100 : 0;

    const metaResults = meta.reduce((sum: number, m: any) => sum + (m.results || 0), 0);
    const metaClicks = meta.reduce((sum: number, m: any) => sum + (m.clicks || 0), 0);
    const metaImpressions = meta.reduce((sum: number, m: any) => sum + (m.impressions || 0), 0);
    const metaLinkClicks = meta.reduce((sum: number, m: any) => sum + (m.link_clicks || 0), 0);
    const metaLpViews = meta.reduce((sum: number, m: any) => sum + (m.landing_page_views || 0), 0);
    const metaLeads = meta.reduce((sum: number, m: any) => sum + (m.leads || 0), 0);

    const gClicks = google.reduce((sum: number, m: any) => sum + (m.clicks || 0), 0);
    const gImpressions = google.reduce((sum: number, m: any) => sum + (m.impressions || 0), 0);
    const gConversions = google.reduce((sum: number, m: any) => sum + (m.conversions || 0), 0);

    const totalClicks = metaClicks + gClicks;
    const totalImpressions = metaImpressions + gImpressions;
    const totalResults = metaResults + gConversions;
    const totalLeads = metaLeads + gConversions;

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? investment / totalClicks : 0;
    const costPerResult = totalResults > 0 ? investment / totalResults : 0;
    const connectRate = metaLinkClicks > 0 ? (metaLpViews / metaLinkClicks) * 100 : 0;
    const cpl = totalLeads > 0 ? investment / totalLeads : 0;

    return {
      projectId: p.id,
      projectName: p.name,
      strategy: p.strategy,
      roi,
      investment,
      revenue,
      salesCount,
      results: totalResults,
      costPerResult,
      clicks: totalClicks,
      ctr,
      cpc,
      connectRate,
      leads: totalLeads,
      cpl,
      impressions: totalImpressions,
      isLoading,
    };
  });
}
