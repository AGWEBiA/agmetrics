import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePublicDashboardMetrics(projectId: string | undefined) {
  const salesQuery = useQuery({
    queryKey: ["public_sales", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      // Use only non-PII fields — buyer_email/buyer_name are excluded
      const { data, error } = await supabase
        .from("sales_events")
        .select("amount, gross_amount, platform_fee, product_name, product_type, platform, sale_date, created_at")
        .eq("project_id", projectId!)
        .eq("status", "approved");
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 300000,
  });

  const metaQuery = useQuery({
    queryKey: ["public_meta", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_metrics")
        .select("date, investment, impressions, clicks, results, purchases, link_clicks, landing_page_views, checkouts_initiated, leads")
        .eq("project_id", projectId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 300000,
  });

  const googleQuery = useQuery({
    queryKey: ["public_google", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_metrics")
        .select("date, investment, impressions, clicks, conversions")
        .eq("project_id", projectId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 300000,
  });

  const goalsQuery = useQuery({
    queryKey: ["public_goals", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_goals")
        .select("type, target_value, period, is_active")
        .eq("project_id", projectId!)
        .eq("is_active", true);
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 300000,
  });

  const metaAdsQuery = useQuery({
    queryKey: ["public_meta_ads", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_ads")
        .select("*")
        .eq("project_id", projectId!)
        .order("spend", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 300000,
  });

  const sales = salesQuery.data || [];
  const meta = metaQuery.data || [];
  const google = googleQuery.data || [];
  const goals = goalsQuery.data || [];

  const totalRevenue = sales.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const grossRevenue = sales.reduce((s: number, e: any) => s + Number(e.gross_amount || 0), 0);
  const totalFees = sales.reduce((s: number, e: any) => s + Number(e.platform_fee || 0), 0);
  const salesCount = sales.length;
  const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0;

  const metaInvestment = meta.reduce((s: number, m: any) => s + Number(m.investment || 0), 0);
  const googleInvestment = google.reduce((s: number, m: any) => s + Number(m.investment || 0), 0);
  const totalInvestment = metaInvestment + googleInvestment;

  const netProfit = totalRevenue - totalInvestment;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const roas = totalInvestment > 0 ? totalRevenue / totalInvestment : 0;
  const margin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  // Meta Ads aggregate metrics (excluding leads/CPL for privacy)
  const metaImpressions = meta.reduce((s: number, m: any) => s + (m.impressions || 0), 0);
  const metaClicks = meta.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
  const metaResults = meta.reduce((s: number, m: any) => s + (m.results || 0), 0);
  const metaPurchases = meta.reduce((s: number, m: any) => s + (m.purchases || 0), 0);
  const metaLinkClicks = meta.reduce((s: number, m: any) => s + (m.link_clicks || 0), 0);
  const metaLpViews = meta.reduce((s: number, m: any) => s + (m.landing_page_views || 0), 0);
  const metaCheckouts = meta.reduce((s: number, m: any) => s + (m.checkouts_initiated || 0), 0);
  const metaLeads = meta.reduce((s: number, m: any) => s + (m.leads || 0), 0);

  const metaCpm = metaImpressions > 0 ? (metaInvestment / metaImpressions) * 1000 : 0;
  const metaCtr = metaImpressions > 0 ? (metaClicks / metaImpressions) * 100 : 0;
  const metaCpc = metaClicks > 0 ? metaInvestment / metaClicks : 0;
  const metaCostPerResult = metaResults > 0 ? metaInvestment / metaResults : 0;
  const metaCostPerPurchase = metaPurchases > 0 ? metaInvestment / metaPurchases : 0;
  const metaCostPerLead = metaLeads > 0 ? metaInvestment / metaLeads : 0;
  const metaLinkCtr = metaImpressions > 0 ? (metaLinkClicks / metaImpressions) * 100 : 0;
  const metaLinkCpc = metaLinkClicks > 0 ? metaInvestment / metaLinkClicks : 0;
  const metaConnectRate = metaLinkClicks > 0 ? (metaLpViews / metaLinkClicks) * 100 : 0;
  const metaPageConversion = metaLpViews > 0 ? (metaCheckouts / metaLpViews) * 100 : 0;
  const metaCheckoutConversion = metaCheckouts > 0 ? (metaPurchases / metaCheckouts) * 100 : 0;

  // Top ads from meta_ads table
  const metaAds = (metaAdsQuery.data || []).map((ad: any) => ({
    id: ad.ad_id,
    name: ad.ad_name,
    status: ad.status,
    spend: Number(ad.spend || 0),
    impressions: Number(ad.impressions || 0),
    clicks: Number(ad.clicks || 0),
    purchases: Number(ad.purchases || 0),
    leads: Number(ad.leads || 0),
    preview_link: ad.preview_link,
  }));
  const topAds = metaAds.slice(0, 10);

  // Sales by date
  const salesByDate = new Map<string, { count: number; revenue: number }>();
  sales.forEach((s: any) => {
    const d = s.sale_date ? s.sale_date.split("T")[0] : s.created_at?.split("T")[0];
    if (!d) return;
    const existing = salesByDate.get(d) || { count: 0, revenue: 0 };
    salesByDate.set(d, { count: existing.count + 1, revenue: existing.revenue + Number(s.amount || 0) });
  });

  const salesChartData = Array.from(salesByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      vendas: data.count,
      receita: data.revenue,
    }));

  // Products breakdown
  const productBreakdown = new Map<string, { count: number; revenue: number; type: string | null }>();
  sales.forEach((s: any) => {
    const name = s.product_name || "Sem nome";
    const existing = productBreakdown.get(name) || { count: 0, revenue: 0, type: s.product_type };
    productBreakdown.set(name, {
      count: existing.count + 1,
      revenue: existing.revenue + Number(s.amount || 0),
      type: s.product_type || existing.type,
    });
  });

  const productData = Array.from(productBreakdown.entries()).map(([name, data]) => ({
    name,
    ...data,
    pct: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
  }));

  // Platform chart
  const platformChartData = [
    { name: "Kiwify", value: sales.filter((s: any) => s.platform === "kiwify").reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) },
    { name: "Hotmart", value: sales.filter((s: any) => s.platform === "hotmart").reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) },
  ].filter((d) => d.value > 0);

  // Goals progress
  const goalsProgress = goals.map((g: any) => {
    let current = 0;
    switch (g.type) {
      case "revenue": current = totalRevenue; break;
      case "sales": current = salesCount; break;
      case "roi": current = roi; break;
      case "margin": current = margin; break;
    }
    return { type: g.type, target: g.target_value, current, period: g.period, pct: g.target_value > 0 ? (current / g.target_value) * 100 : 0 };
  });

  // Google Ads aggregate metrics
  const gImpressions = google.reduce((s: number, m: any) => s + (m.impressions || 0), 0);
  const gClicks = google.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
  const gConversions = google.reduce((s: number, m: any) => s + (m.conversions || 0), 0);
  const gCpm = gImpressions > 0 ? (googleInvestment / gImpressions) * 1000 : 0;
  const gCtr = gImpressions > 0 ? (gClicks / gImpressions) * 100 : 0;
  const gCpc = gClicks > 0 ? googleInvestment / gClicks : 0;
  const gConversionRate = gClicks > 0 ? (gConversions / gClicks) * 100 : 0;
  const gCostPerConversion = gConversions > 0 ? googleInvestment / gConversions : 0;

  return {
    isLoading: salesQuery.isLoading || metaQuery.isLoading || googleQuery.isLoading || goalsQuery.isLoading,
    totalRevenue, grossRevenue, totalFees, salesCount, avgTicket,
    totalInvestment, metaInvestment, googleInvestment, netProfit, roi, roas, margin,
    metaImpressions, metaClicks, metaResults, metaPurchases, metaLinkClicks, metaLpViews, metaCheckouts,
    metaLeads, metaCostPerLead,
    metaCpm, metaCtr, metaCpc, metaCostPerResult, metaCostPerPurchase,
    metaLinkCtr, metaLinkCpc, metaConnectRate, metaPageConversion, metaCheckoutConversion,
    gImpressions, gClicks, gConversions, gCpm, gCtr, gCpc, gConversionRate, gCostPerConversion,
    topAds,
    salesChartData, productData, platformChartData, goalsProgress,
  };
}
