import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getNormalizedPlatformFee } from "@/lib/salesFinancials";

export function usePublicDashboardMetrics(projectId: string | undefined, viewToken: string | undefined) {
  const salesQuery = useQuery({
    queryKey: ["public_sales", projectId, viewToken],
    enabled: !!projectId && !!viewToken,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_sales", {
        _project_id: projectId!,
        _token: viewToken!,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 300000,
  });

  const leadEventsQuery = useQuery({
    queryKey: ["public_lead_events", projectId, viewToken],
    enabled: !!projectId && !!viewToken,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_lead_events", {
        _project_id: projectId!,
        _token: viewToken!,
      });
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

  const productsQuery = useQuery({
    queryKey: ["public_products", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("name, type, price")
        .eq("project_id", projectId!);
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

  const manualInvestmentsQuery = useQuery({
    queryKey: ["public_manual_investments", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_investments")
        .select("amount")
        .eq("project_id", projectId!);
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 300000,
  });

  const sales = (salesQuery.data || []).filter((s: any) => s.status === "approved" && !s.is_ignored);
  const meta = metaQuery.data || [];
  const google = googleQuery.data || [];
  const goals = goalsQuery.data || [];
  const leadEvents = leadEventsQuery.data || [];

  const producerRevenue = sales.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const grossRevenue = sales.reduce((s: number, e: any) => s + Number(e.gross_amount || 0), 0);

  const registeredProducts = productsQuery.data || [];
  const grossActionRevenue = sales.reduce((sum: number, sale: any) => {
    const saleName = (sale.product_name || "").toLowerCase();
    const saleType = sale.product_type || "main";
    const matched = registeredProducts.find(
      (p: any) => p.name.toLowerCase() === saleName && p.type === saleType
    ) || registeredProducts.find(
      (p: any) => p.name.toLowerCase() === saleName
    );
    return sum + Number(matched?.price || sale.gross_amount || 0);
  }, 0);

  const totalFees = sales.reduce((s: number, e: any) => s + getNormalizedPlatformFee(e), 0);
  const totalTaxes = sales.reduce((s: number, e: any) => s + Number(e.taxes || 0), 0);
  // Calculate coproducer commission using normalized formula (fixes Kiwify stored values)
  const totalCoproducerCommission = sales.reduce((s: number, e: any) => s + getNormalizedCoproducerCommission(e), 0);
  const totalRevenue = producerRevenue + totalCoproducerCommission;
  const salesCount = sales.length;
  const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0;

  const metaInvestment = meta.reduce((s: number, m: any) => s + Number(m.investment || 0), 0);
  const googleInvestment = google.reduce((s: number, m: any) => s + Number(m.investment || 0), 0);
  const manualInvestment = (manualInvestmentsQuery.data || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const totalInvestment = metaInvestment + googleInvestment + manualInvestment;

  const netProfitProject = totalRevenue - totalInvestment;
  const netProfitProducer = producerRevenue - totalInvestment;
  const netProfit = netProfitProject;
  const roi = totalInvestment > 0 ? (netProfitProject / totalInvestment) * 100 : 0;
  const roas = totalInvestment > 0 ? totalRevenue / totalInvestment : 0;
  const margin = grossRevenue > 0 ? (netProfitProject / grossRevenue) * 100 : 0;

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

  const metaAds = (metaAdsQuery.data || []).map((ad: any) => ({
    id: ad.ad_id, name: ad.ad_name, status: ad.status,
    spend: Number(ad.spend || 0), impressions: Number(ad.impressions || 0),
    clicks: Number(ad.clicks || 0), purchases: Number(ad.purchases || 0),
    leads: Number(ad.leads || 0), preview_link: ad.preview_link,
    hook_rate: Number(ad.hook_rate || 0), hold_rate: Number(ad.hold_rate || 0),
  }));
  const topAds = metaAds.slice(0, 10);

  // Lead journey data (no PII)
  const totalLeads = leadEvents.filter((e: any) => e.event_type === "lead").length;
  const conversionRate = totalLeads > 0 ? (salesCount / totalLeads) * 100 : 0;
  const avgCpl = totalLeads > 0 ? totalInvestment / totalLeads : 0;

  // RPL - unique buyers as leads (public RPC strips PII, use external_id as proxy)
  const uniqueSaleKeys = new Set(
    sales
      .map((s: any) => (s.external_id || "").toLowerCase().trim())
      .filter((e: string) => e.length > 0)
  );
  const rplLeads = uniqueSaleKeys.size || salesCount;
  const rpl = rplLeads > 0 ? totalRevenue / rplLeads : 0;

  // Sales by date
  const salesByDate = new Map<string, { count: number; revenue: number }>();
  sales.forEach((s: any) => {
    const raw = s.sale_date || s.created_at;
    if (!raw) return;
    const d = new Date(raw).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const existing = salesByDate.get(d) || { count: 0, revenue: 0 };
    salesByDate.set(d, { count: existing.count + 1, revenue: existing.revenue + Number(s.amount || 0) });
  });

  const salesChartData = Array.from(salesByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }),
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
    name, ...data, pct: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
  }));

  const platformChartData = [
    { name: "Kiwify", value: sales.filter((s: any) => s.platform === "kiwify").reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) },
    { name: "Hotmart", value: sales.filter((s: any) => s.platform === "hotmart").reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) },
  ].filter((d) => d.value > 0);

  const goalsProgress = goals.map((g: any) => {
    let current = 0;
    switch (g.type) {
      case "revenue": current = totalRevenue; break;
      case "sales": current = salesCount; break;
      case "roi": current = roi; break;
      case "margin": current = margin; break;
      case "leads": current = totalLeads; break;
    }
    return { type: g.type, target: g.target_value, current, period: g.period, pct: g.target_value > 0 ? (current / g.target_value) * 100 : 0 };
  });

  // Google Ads aggregate
  const gImpressions = google.reduce((s: number, m: any) => s + (m.impressions || 0), 0);
  const gClicks = google.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
  const gConversions = google.reduce((s: number, m: any) => s + (m.conversions || 0), 0);
  const gCpm = gImpressions > 0 ? (googleInvestment / gImpressions) * 1000 : 0;
  const gCtr = gImpressions > 0 ? (gClicks / gImpressions) * 100 : 0;
  const gCpc = gClicks > 0 ? googleInvestment / gClicks : 0;
  const gConversionRate = gClicks > 0 ? (gConversions / gClicks) * 100 : 0;
  const gCostPerConversion = gConversions > 0 ? googleInvestment / gConversions : 0;

  // Sales by day of week
  const salesByDayOfWeek = (() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const dayData = Array(7).fill(null).map((_, i) => ({ name: days[i], vendas: 0, revenue: 0 }));
    sales.forEach((s: any) => {
      const raw = s.sale_date || s.created_at;
      if (!raw) return;
      const dayIdx = new Date(raw).getDay();
      dayData[dayIdx].vendas += 1;
      dayData[dayIdx].revenue += Number(s.amount || 0);
    });
    return dayData;
  })();

  // Kiwify/Hotmart splits
  const kiwifySales = sales.filter((s: any) => s.platform === "kiwify");
  const hotmartSales = sales.filter((s: any) => s.platform === "hotmart");

  // Payment methods
  const paymentBreakdown = new Map<string, { count: number; revenue: number }>();
  sales.forEach((s: any) => {
    const method = s.payment_method || "Outro";
    const existing = paymentBreakdown.get(method) || { count: 0, revenue: 0 };
    paymentBreakdown.set(method, { count: existing.count + 1, revenue: existing.revenue + Number(s.amount || 0) });
  });
  const paymentMethodData = Array.from(paymentBreakdown.entries()).map(([method, data]) => ({
    method, ...data, pct: salesCount > 0 ? (data.count / salesCount) * 100 : 0,
  }));

  // Meta metrics per date for charts
  const metaMetrics = meta;
  const googleMetrics = google;

  return {
    isLoading: salesQuery.isLoading || metaQuery.isLoading || googleQuery.isLoading || goalsQuery.isLoading || productsQuery.isLoading || leadEventsQuery.isLoading,
    totalRevenue, grossRevenue, grossActionRevenue, totalFees, totalTaxes, totalCoproducerCommission, producerRevenue,
    salesCount, avgTicket,
    totalInvestment, metaInvestment, googleInvestment, manualInvestment,
    netProfit, netProfitProject, netProfitProducer, roi, roas, margin,
    metaImpressions, metaClicks, metaResults, metaPurchases, metaLinkClicks, metaLpViews, metaCheckouts,
    metaLeads, metaCostPerLead, metaCpm, metaCtr, metaCpc, metaCostPerResult, metaCostPerPurchase,
    metaLinkCtr, metaLinkCpc, metaConnectRate, metaPageConversion, metaCheckoutConversion,
    gImpressions, gClicks, gConversions, gCpm, gCtr, gCpc, gConversionRate, gCostPerConversion,
    topAds, salesChartData, productData, platformChartData, goalsProgress,
    totalLeads, conversionRate, avgCpl, metaLeadsCost: metaCostPerLead,
    rpl, rplLeads, isRplStrategy: true,
    salesByDayOfWeek, kiwifySales, hotmartSales, paymentMethodData,
    metaMetrics, googleMetrics,
    // Compatibility fields expected by DashboardTabs / OverviewSections
    pendingSalesCount: 0, cancelledSalesCount: 0, refundedSalesCount: 0, totalSalesCount: sales.length,
    pendingSales: [], refundedSales: [],
    conversionLabel: "lead → venda", conversionBase: totalLeads,
    demographicsLoaded: false, metaAdsLoaded: metaAdsQuery.isFetched,
    revenueChange: 0, salesCountChange: 0, roiChange: 0, investmentChange: 0,
  };
}
