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

export function useDashboardMetrics(projectId: string | undefined, dateFilter?: DateFilter) {
  const salesQuery = useQuery({
    queryKey: ["sales_events", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_events")
        .select("*")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data as unknown as SalesEvent[];
    },
    refetchInterval: 300000,
  });

  const metaQuery = useQuery({
    queryKey: ["meta_metrics", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_metrics")
        .select("*")
        .eq("project_id", projectId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 300000,
  });

  const googleQuery = useQuery({
    queryKey: ["google_metrics", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_metrics")
        .select("*")
        .eq("project_id", projectId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 300000,
  });

  const investmentsQuery = useQuery({
    queryKey: ["manual_investments", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_investments")
        .select("*")
        .eq("project_id", projectId!);
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 300000,
  });

  const df = dateFilter || {};

  // Apply date filters
  const allSales = salesQuery.data || [];
  const sales = allSales.filter((s) => inRange(s.sale_date || s.created_at, df));
  const metaMetrics = (metaQuery.data || []).filter((m: any) => inRange(m.date, df));
  const googleMetrics = (googleQuery.data || []).filter((m: any) => inRange(m.date, df));
  const manualInvestments = (investmentsQuery.data || []).filter((m: any) => inRange(m.date, df));

  // Calculate previous period for comparison
  const hasDates = df.from && df.to;
  let prevSales: SalesEvent[] = [];
  let prevMetaMetrics: any[] = [];
  let prevGoogleMetrics: any[] = [];
  let prevManualInvestments: any[] = [];

  if (hasDates && df.from && df.to) {
    const rangeMs = df.to.getTime() - df.from.getTime();
    const prevFrom = new Date(df.from.getTime() - rangeMs);
    const prevTo = new Date(df.from.getTime() - 1);
    const prevDf = { from: prevFrom, to: prevTo };
    prevSales = allSales.filter((s) => inRange(s.sale_date || s.created_at, prevDf));
    prevMetaMetrics = (metaQuery.data || []).filter((m: any) => inRange(m.date, prevDf));
    prevGoogleMetrics = (googleQuery.data || []).filter((m: any) => inRange(m.date, prevDf));
    prevManualInvestments = (investmentsQuery.data || []).filter((m: any) => inRange(m.date, prevDf));
  }

  const approvedSales = sales.filter((s) => s.status === "approved");
  const pendingSales = sales.filter((s) => s.status === "pending");

  const totalRevenue = approvedSales.reduce((s, e) => s + Number(e.amount), 0);
  const grossRevenue = approvedSales.reduce((s, e) => s + Number(e.gross_amount), 0);
  const totalFees = approvedSales.reduce((s, e) => s + Number(e.platform_fee), 0);
  const salesCount = approvedSales.length;
  const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0;

  const kiwifySales = approvedSales.filter((s) => s.platform === "kiwify");
  const hotmartSales = approvedSales.filter((s) => s.platform === "hotmart");

  const metaInvestment = metaMetrics.reduce((s: number, m: any) => s + Number(m.investment), 0);
  const googleInvestment = googleMetrics.reduce((s: number, m: any) => s + Number(m.investment), 0);
  const manualInvestment = manualInvestments.reduce((s: number, m: any) => s + Number(m.amount), 0);
  const totalInvestment = metaInvestment + googleInvestment + manualInvestment;

  const netProfit = totalRevenue - totalInvestment;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const roas = totalInvestment > 0 ? totalRevenue / totalInvestment : 0;
  const margin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  const metaLeads = metaMetrics.reduce((s: number, m: any) => s + (m.leads || 0), 0);
  const googleLeads = googleMetrics.reduce((s: number, m: any) => s + (m.conversions || 0), 0);
  const totalLeads = metaLeads + googleLeads;
  const conversionRate = totalLeads > 0 ? (salesCount / totalLeads) * 100 : 0;
  const avgCpl = totalLeads > 0 ? totalInvestment / totalLeads : 0;

  const metaImpressions = metaMetrics.reduce((s: number, m: any) => s + (m.impressions || 0), 0);
  const metaClicks = metaMetrics.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
  const metaResults = metaMetrics.reduce((s: number, m: any) => s + (m.results || 0), 0);
  const metaPurchases = metaMetrics.reduce((s: number, m: any) => s + (m.purchases || 0), 0);
  const metaLinkClicks = metaMetrics.reduce((s: number, m: any) => s + (m.link_clicks || 0), 0);
  const metaLpViews = metaMetrics.reduce((s: number, m: any) => s + (m.landing_page_views || 0), 0);
  const metaCheckouts = metaMetrics.reduce((s: number, m: any) => s + (m.checkouts_initiated || 0), 0);

  const gImpressions = googleMetrics.reduce((s: number, m: any) => s + (m.impressions || 0), 0);
  const gClicks = googleMetrics.reduce((s: number, m: any) => s + (m.clicks || 0), 0);
  const gConversions = googleMetrics.reduce((s: number, m: any) => s + (m.conversions || 0), 0);

  const salesByDate = new Map<string, { count: number; revenue: number }>();
  approvedSales.forEach((s) => {
    const d = s.sale_date ? s.sale_date.split("T")[0] : s.created_at.split("T")[0];
    const existing = salesByDate.get(d) || { count: 0, revenue: 0 };
    salesByDate.set(d, { count: existing.count + 1, revenue: existing.revenue + Number(s.amount) });
  });

  const salesChartData = Array.from(salesByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      vendas: data.count,
      receita: data.revenue,
    }));

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
    name, ...data,
    pct: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
  }));

  const platformChartData = [
    { name: "Kiwify", value: kiwifySales.reduce((s, e) => s + Number(e.amount), 0) },
    { name: "Hotmart", value: hotmartSales.reduce((s, e) => s + Number(e.amount), 0) },
  ].filter((d) => d.value > 0);

  // Previous period metrics for comparison
  const prevApproved = prevSales.filter((s) => s.status === "approved");
  const prevRevenue = prevApproved.reduce((s, e) => s + Number(e.amount), 0);
  const prevSalesCount = prevApproved.length;
  const prevMetaInv = prevMetaMetrics.reduce((s: number, m: any) => s + Number(m.investment), 0);
  const prevGoogleInv = prevGoogleMetrics.reduce((s: number, m: any) => s + Number(m.investment), 0);
  const prevManualInv = prevManualInvestments.reduce((s: number, m: any) => s + Number(m.amount), 0);
  const prevTotalInv = prevMetaInv + prevGoogleInv + prevManualInv;
  const prevRoi = prevTotalInv > 0 ? ((prevRevenue - prevTotalInv) / prevTotalInv) * 100 : 0;
  const prevLeads = prevMetaMetrics.reduce((s: number, m: any) => s + (m.leads || 0), 0)
    + prevGoogleMetrics.reduce((s: number, m: any) => s + (m.conversions || 0), 0);

  function pctChange(current: number, previous: number): number | null {
    if (!hasDates) return null;
    if (previous === 0) return current > 0 ? 100 : null;
    return ((current - previous) / Math.abs(previous)) * 100;
  }

  const changes = {
    revenueChange: pctChange(totalRevenue, prevRevenue),
    salesCountChange: pctChange(salesCount, prevSalesCount),
    roiChange: pctChange(roi, prevRoi),
    investmentChange: pctChange(totalInvestment, prevTotalInv),
    leadsChange: pctChange(totalLeads, prevLeads),
  };

  return {
    isLoading: salesQuery.isLoading || metaQuery.isLoading || googleQuery.isLoading || investmentsQuery.isLoading,
    totalRevenue, grossRevenue, totalFees, salesCount, avgTicket,
    pendingSalesCount: pendingSales.length, kiwifySales, hotmartSales,
    metaInvestment, googleInvestment, manualInvestment, totalInvestment,
    roi, roas, margin, netProfit,
    totalLeads, metaLeads, googleLeads, conversionRate, avgCpl,
    metaImpressions, metaClicks, metaResults, metaPurchases, metaLinkClicks, metaLpViews, metaCheckouts,
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
    gImpressions, gClicks, gConversions,
    gCpc: gClicks > 0 ? googleInvestment / gClicks : 0,
    gCtr: gImpressions > 0 ? (gClicks / gImpressions) * 100 : 0,
    gConversionRate: gClicks > 0 ? (gConversions / gClicks) * 100 : 0,
    gCostPerConversion: gConversions > 0 ? googleInvestment / gConversions : 0,
    salesChartData, productData, platformChartData, metaMetrics, googleMetrics,
    ...changes,
  };
}
