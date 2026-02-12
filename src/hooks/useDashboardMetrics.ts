import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SalesEvent {
  id: string;
  project_id: string;
  platform: "kiwify" | "hotmart";
  product_name: string | null;
  product_type: "main" | "order_bump" | null;
  amount: number;
  gross_amount: number;
  platform_fee: number;
  status: "approved" | "pending" | "cancelled" | "refunded";
  buyer_email: string | null;
  buyer_name: string | null;
  sale_date: string | null;
  created_at: string;
}

interface MetaMetric {
  id: string;
  date: string;
  investment: number;
  impressions: number;
  clicks: number;
  leads: number;
  results: number;
  purchases: number;
  link_clicks: number;
  landing_page_views: number;
  checkouts_initiated: number;
  cpm: number;
  ctr: number;
  cpc: number;
  cost_per_lead: number;
  cost_per_result: number;
  cost_per_purchase: number;
  link_ctr: number;
  link_cpc: number;
  connect_rate: number;
  page_conversion_rate: number;
  checkout_conversion_rate: number;
}

interface GoogleMetric {
  id: string;
  date: string;
  investment: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpc: number;
  ctr: number;
  conversion_rate: number;
  cost_per_conversion: number;
}

interface ManualInvestment {
  id: string;
  amount: number;
  date: string;
  description: string | null;
}

export function useDashboardMetrics(projectId: string | undefined) {
  const salesQuery = useQuery({
    queryKey: ["sales_events", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_events" as any)
        .select("*")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data as unknown as SalesEvent[];
    },
    refetchInterval: 300000, // 5 min
  });

  const metaQuery = useQuery({
    queryKey: ["meta_metrics", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_metrics" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return data as unknown as MetaMetric[];
    },
    refetchInterval: 300000,
  });

  const googleQuery = useQuery({
    queryKey: ["google_metrics", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_metrics" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return data as unknown as GoogleMetric[];
    },
    refetchInterval: 300000,
  });

  const investmentsQuery = useQuery({
    queryKey: ["manual_investments", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_investments" as any)
        .select("*")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data as unknown as ManualInvestment[];
    },
    refetchInterval: 300000,
  });

  // Compute metrics
  const sales = salesQuery.data || [];
  const metaMetrics = metaQuery.data || [];
  const googleMetrics = googleQuery.data || [];
  const manualInvestments = investmentsQuery.data || [];

  const approvedSales = sales.filter((s) => s.status === "approved");
  const pendingSales = sales.filter((s) => s.status === "pending");

  // Sales metrics
  const totalRevenue = approvedSales.reduce((s, e) => s + Number(e.amount), 0);
  const grossRevenue = approvedSales.reduce((s, e) => s + Number(e.gross_amount), 0);
  const totalFees = approvedSales.reduce((s, e) => s + Number(e.platform_fee), 0);
  const salesCount = approvedSales.length;
  const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0;

  // Platform breakdown
  const kiwifySales = approvedSales.filter((s) => s.platform === "kiwify");
  const hotmartSales = approvedSales.filter((s) => s.platform === "hotmart");

  // Investment metrics
  const metaInvestment = metaMetrics.reduce((s, m) => s + Number(m.investment), 0);
  const googleInvestment = googleMetrics.reduce((s, m) => s + Number(m.investment), 0);
  const manualInvestment = manualInvestments.reduce((s, m) => s + Number(m.amount), 0);
  const totalInvestment = metaInvestment + googleInvestment + manualInvestment;

  // ROI metrics
  const netProfit = totalRevenue - totalInvestment;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const roas = totalInvestment > 0 ? totalRevenue / totalInvestment : 0;
  const margin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  // Lead metrics
  const metaLeads = metaMetrics.reduce((s, m) => s + (m.leads || 0), 0);
  const googleLeads = googleMetrics.reduce((s, m) => s + (m.conversions || 0), 0);
  const totalLeads = metaLeads + googleLeads;
  const conversionRate = totalLeads > 0 ? (salesCount / totalLeads) * 100 : 0;
  const avgCpl = totalLeads > 0 ? totalInvestment / totalLeads : 0;

  // Meta aggregated
  const metaImpressions = metaMetrics.reduce((s, m) => s + (m.impressions || 0), 0);
  const metaClicks = metaMetrics.reduce((s, m) => s + (m.clicks || 0), 0);
  const metaResults = metaMetrics.reduce((s, m) => s + (m.results || 0), 0);
  const metaPurchases = metaMetrics.reduce((s, m) => s + (m.purchases || 0), 0);
  const metaLinkClicks = metaMetrics.reduce((s, m) => s + (m.link_clicks || 0), 0);
  const metaLpViews = metaMetrics.reduce((s, m) => s + (m.landing_page_views || 0), 0);
  const metaCheckouts = metaMetrics.reduce((s, m) => s + (m.checkouts_initiated || 0), 0);

  // Google aggregated
  const gImpressions = googleMetrics.reduce((s, m) => s + (m.impressions || 0), 0);
  const gClicks = googleMetrics.reduce((s, m) => s + (m.clicks || 0), 0);
  const gConversions = googleMetrics.reduce((s, m) => s + (m.conversions || 0), 0);

  // Sales by date (for charts)
  const salesByDate = new Map<string, { count: number; revenue: number }>();
  approvedSales.forEach((s) => {
    const d = s.sale_date ? s.sale_date.split("T")[0] : s.created_at.split("T")[0];
    const existing = salesByDate.get(d) || { count: 0, revenue: 0 };
    salesByDate.set(d, {
      count: existing.count + 1,
      revenue: existing.revenue + Number(s.amount),
    });
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
  approvedSales.forEach((s) => {
    const name = s.product_name || "Sem nome";
    const existing = productBreakdown.get(name) || { count: 0, revenue: 0, type: s.product_type };
    productBreakdown.set(name, {
      count: existing.count + 1,
      revenue: existing.revenue + Number(s.amount),
      type: s.product_type || existing.type,
    });
  });

  const productData = Array.from(productBreakdown.entries()).map(([name, data]) => ({
    name,
    ...data,
    pct: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
  }));

  // Platform chart data
  const platformChartData = [
    { name: "Kiwify", value: kiwifySales.reduce((s, e) => s + Number(e.amount), 0) },
    { name: "Hotmart", value: hotmartSales.reduce((s, e) => s + Number(e.amount), 0) },
  ].filter((d) => d.value > 0);

  return {
    isLoading: salesQuery.isLoading || metaQuery.isLoading || googleQuery.isLoading || investmentsQuery.isLoading,
    // Sales
    totalRevenue,
    grossRevenue,
    totalFees,
    salesCount,
    avgTicket,
    pendingSalesCount: pendingSales.length,
    kiwifySales,
    hotmartSales,
    // Investment
    metaInvestment,
    googleInvestment,
    manualInvestment,
    totalInvestment,
    // ROI
    roi,
    roas,
    margin,
    netProfit,
    // Leads
    totalLeads,
    metaLeads,
    googleLeads,
    conversionRate,
    avgCpl,
    // Meta
    metaImpressions,
    metaClicks,
    metaResults,
    metaPurchases,
    metaLinkClicks,
    metaLpViews,
    metaCheckouts,
    metaInvestment_total: metaInvestment,
    metaCpm: metaImpressions > 0 ? (metaInvestment / metaImpressions) * 1000 : 0,
    metaCtr: metaImpressions > 0 ? (metaClicks / metaImpressions) * 100 : 0,
    metaCpc: metaClicks > 0 ? metaInvestment / metaClicks : 0,
    metaCostPerResult: metaResults > 0 ? metaInvestment / metaResults : 0,
    metaCostPerPurchase: metaPurchases > 0 ? metaInvestment / metaPurchases : 0,
    metaCostPerLead: metaLeads > 0 ? metaInvestment / metaLeads : 0,
    metaLinkCtr: metaImpressions > 0 ? (metaLinkClicks / metaImpressions) * 100 : 0,
    metaLinkCpc: metaLinkClicks > 0 ? metaInvestment / metaLinkClicks : 0,
    metaConnectRate: metaLinkClicks > 0 ? (metaLpViews / metaLinkClicks) * 100 : 0,
    metaPageConversion: metaLpViews > 0 ? (metaCheckouts / metaLpViews) * 100 : 0,
    metaCheckoutConversion: metaCheckouts > 0 ? (metaPurchases / metaCheckouts) * 100 : 0,
    // Google
    gImpressions,
    gClicks,
    gConversions,
    gCpc: gClicks > 0 ? googleInvestment / gClicks : 0,
    gCtr: gImpressions > 0 ? (gClicks / gImpressions) * 100 : 0,
    gConversionRate: gClicks > 0 ? (gConversions / gClicks) * 100 : 0,
    gCostPerConversion: gConversions > 0 ? googleInvestment / gConversions : 0,
    // Charts
    salesChartData,
    productData,
    platformChartData,
    metaMetrics,
    googleMetrics,
  };
}
