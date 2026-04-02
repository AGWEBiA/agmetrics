import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SalesEvent, AdDemographic, DateFilter } from "@/types/database";
import type { GlobalFilters } from "@/contexts/GlobalFiltersContext";
import { getNormalizedPlatformFee, getNormalizedCoproducerCommission } from "@/lib/salesFinancials";

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

function matchesGlobalFilters(s: SalesEvent, gf?: GlobalFilters): boolean {
  if (!gf) return true;
  if (gf.platform !== "all" && s.platform !== gf.platform) return false;
  if (gf.status !== "all" && s.status !== gf.status) return false;
  if (gf.utmSource && !(s as any).utm_source?.toLowerCase().includes(gf.utmSource.toLowerCase())) return false;
  if (gf.utmMedium && !(s as any).utm_medium?.toLowerCase().includes(gf.utmMedium.toLowerCase())) return false;
  if (gf.utmCampaign && !(s as any).utm_campaign?.toLowerCase().includes(gf.utmCampaign.toLowerCase())) return false;
  if (gf.productName && !(s.product_name || "").toLowerCase().includes(gf.productName.toLowerCase())) return false;
  return true;
}

export function useDashboardMetrics(projectId: string | undefined, dateFilter?: DateFilter, strategy?: string, globalFilters?: GlobalFilters) {
  const salesQuery = useQuery({
    queryKey: ["sales_events", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const pageSize = 1000;
      let from = 0;
      let allData: SalesEvent[] = [];

      while (true) {
        const { data, error } = await supabase
          .from("sales_events")
          .select("*")
          .eq("project_id", projectId!)
          .eq("is_ignored", false)
          .order("sale_date", { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;

        const page = (data as unknown as SalesEvent[]) || [];
        allData = allData.concat(page);

        if (page.length < pageSize) break;
        from += pageSize;
      }

      return allData;
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

  const demographicsQuery = useQuery({
    queryKey: ["ad_demographics", projectId],
    enabled: false, // loaded on demand via refetch
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_demographics")
        .select("*")
        .eq("project_id", projectId!);
      if (error) throw error;
      return (data as unknown as AdDemographic[]) || [];
    },
    refetchInterval: 300000,
  });

  const metaAdsQuery = useQuery({
    queryKey: ["meta_ads", projectId],
    enabled: false, // loaded on demand via refetch
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

  const productsQuery = useQuery({
    queryKey: ["products", projectId],
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

  const df = dateFilter || {};

  // Apply date + global filters
  const allSales = salesQuery.data || [];
  const sales = allSales.filter((s) => inRange(s.sale_date || s.created_at, df) && matchesGlobalFilters(s, globalFilters));
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
  const cancelledSales = sales.filter((s) => s.status === "cancelled");
  const refundedSales = sales.filter((s) => s.status === "refunded");

  const producerRevenue = approvedSales.reduce((s, e) => s + Number(e.amount), 0);
  const grossRevenue = approvedSales.reduce((s, e) => s + Number(e.gross_amount), 0);

  // Receita Bruta da Ação: usa o preço base cadastrado do produto; fallback para gross_amount
  const registeredProducts = productsQuery.data || [];
  const grossActionRevenue = approvedSales.reduce((sum, sale) => {
    const saleName = (sale.product_name || "").toLowerCase();
    const saleType = sale.product_type || "main";
    const matched = registeredProducts.find(
      (p: any) => p.name.toLowerCase() === saleName && p.type === saleType
    ) || registeredProducts.find(
      (p: any) => p.name.toLowerCase() === saleName
    );
    return sum + Number(matched?.price || sale.gross_amount || 0);
  }, 0);

  const totalFees = approvedSales.reduce((s, e) => s + getNormalizedPlatformFee(e), 0);
  const totalTaxes = approvedSales.reduce((s, e) => s + Number((e as any).taxes || 0), 0);
  // Calculate coproducer commission using normalized formula (fixes Kiwify stored values)
  const totalCoproducerCommission = approvedSales.reduce((s, e) => s + getNormalizedCoproducerCommission(e as any), 0);
  const totalRevenue = producerRevenue + totalCoproducerCommission;
  const salesCount = approvedSales.length;
  const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0;

  const kiwifySales = approvedSales.filter((s) => s.platform === "kiwify");
  const hotmartSales = approvedSales.filter((s) => s.platform === "hotmart");

  const metaInvestment = metaMetrics.reduce((s: number, m: any) => s + Number(m.investment), 0);
  const googleInvestment = googleMetrics.reduce((s: number, m: any) => s + Number(m.investment), 0);
  const manualInvestment = manualInvestments.reduce((s: number, m: any) => s + Number(m.amount), 0);
  const totalInvestment = metaInvestment + googleInvestment + manualInvestment;

  const netProfitProject = totalRevenue - totalInvestment;
  const netProfitProducer = producerRevenue - totalInvestment;
  const netProfit = netProfitProject; // backward compat
  const roi = totalInvestment > 0 ? (netProfitProject / totalInvestment) * 100 : 0;
  const roas = totalInvestment > 0 ? totalRevenue / totalInvestment : 0;
  const margin = grossRevenue > 0 ? (netProfitProject / grossRevenue) * 100 : 0;

  const metaLeads = metaMetrics.reduce((s: number, m: any) => s + (m.leads || 0), 0);
  const googleLeads = googleMetrics.reduce((s: number, m: any) => s + (m.conversions || 0), 0);
  const totalLeads = metaLeads + googleLeads;

  // Perpétuo: conversão = views de página → compras
  // Lançamento pago: conversão = compradores únicos → compras
  // Outros: conversão = leads (Meta+Google) → compras
  const isPerpertuo = strategy === "perpetuo";
  const totalPageViews = metaMetrics.reduce((s: number, m: any) => s + (m.landing_page_views || 0), 0)
    + googleMetrics.reduce((s: number, m: any) => s + (m.clicks || 0), 0);

  // RPL (Revenue Per Lead) - for perpétuo and lançamento pago, each unique buyer = 1 lead
  const isRplStrategy = strategy === "perpetuo" || strategy === "lancamento_pago";
  const uniqueBuyerEmails = new Set(
    approvedSales
      .map((s) => (s.buyer_email || "").toLowerCase().trim())
      .filter((e) => e.length > 0)
  );
  const rplLeads = isRplStrategy ? uniqueBuyerEmails.size : totalLeads;
  const rpl = rplLeads > 0 ? totalRevenue / rplLeads : 0;
  const rplGross = rplLeads > 0 ? grossRevenue / rplLeads : 0;
  const cplBase = isRplStrategy ? rplLeads : totalLeads;
  const avgCpl = cplBase > 0 ? totalInvestment / cplBase : 0;
  const avgPurchasesPerLead = cplBase > 0 ? salesCount / cplBase : 0;

  // Conversion rate uses same base as CPL/RPL for consistency
  const conversionBase = isPerpertuo ? totalPageViews : cplBase;
  const conversionRate = conversionBase > 0 ? (salesCount / conversionBase) * 100 : 0;
  const conversionLabel = isPerpertuo ? "Views → Compras" : "Leads → Compras";

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
    const raw = s.sale_date || s.created_at;
    const d = new Date(raw).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD in BRT
    const existing = salesByDate.get(d) || { count: 0, revenue: 0 };
    salesByDate.set(d, { count: existing.count + 1, revenue: existing.revenue + Number(s.amount) });
  });

  const salesChartData = Array.from(salesByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }),
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

  // Payment method metrics — use payment_method column for consistency with public dashboard
  const paymentBreakdown = { pix: { count: 0, revenue: 0 }, card: { count: 0, revenue: 0 }, cardCash: { count: 0, revenue: 0 }, cardInstallment: { count: 0, revenue: 0 }, boleto: { count: 0, revenue: 0 } };
  const getPaymentMethod = (s: SalesEvent): string => ((s as any).payment_method || "").toLowerCase().trim();
  const getInstallments = (s: SalesEvent): number => {
    const method = getPaymentMethod(s);
    const numericMatch = method.match(/(\d+)/);
    if (numericMatch) return Number(numericMatch[1]);
    if (method.includes("parcel") || method.includes("installment")) return 2;
    return 1;
  };
  approvedSales.forEach((s) => {
    const method = getPaymentMethod(s);
    const installments = getInstallments(s);
    const amount = Number(s.gross_amount || 0);
    if (method === "pix") {
      paymentBreakdown.pix.count++;
      paymentBreakdown.pix.revenue += amount;
    } else if (["boleto", "billet", "bank_slip", "boleto_bancario"].includes(method)) {
      paymentBreakdown.boleto.count++;
      paymentBreakdown.boleto.revenue += amount;
    } else if (method) {
      paymentBreakdown.card.count++;
      paymentBreakdown.card.revenue += amount;
      if (installments <= 1) {
        paymentBreakdown.cardCash.count++;
        paymentBreakdown.cardCash.revenue += amount;
      } else {
        paymentBreakdown.cardInstallment.count++;
        paymentBreakdown.cardInstallment.revenue += amount;
      }
    }
  });

  const isBoleto = (method: string): boolean =>
    ["boleto", "billet", "bank_slip", "boleto_bancario"].includes(method);

  const boletoSales = sales.filter((s) => isBoleto(getPaymentMethod(s)));
  const boletoTotal = boletoSales.length;
  const boletoPaid = boletoSales.filter((s) => s.status === "approved").length;
  const boletoPending = boletoSales.filter((s) => s.status === "pending").length;
  const boletoConversionRate = boletoTotal > 0 ? (boletoPaid / boletoTotal) * 100 : 0;
  const boletoRevenue = boletoSales.filter((s) => s.status === "approved").reduce((sum, s) => sum + Number(s.amount || 0), 0);

  // Boleto breakdown by platform
  const boletoByPlatform = {
    kiwify: { total: 0, paid: 0, pending: 0, revenue: 0 },
    hotmart: { total: 0, paid: 0, pending: 0, revenue: 0 },
  };
  boletoSales.forEach((s) => {
    const p = s.platform === "kiwify" ? boletoByPlatform.kiwify : boletoByPlatform.hotmart;
    p.total++;
    if (s.status === "approved") { p.paid++; p.revenue += Number(s.amount || 0); }
    if (s.status === "pending") p.pending++;
  });
  const paymentPieData = [
    { name: "Cartão de Crédito", value: paymentBreakdown.card.count },
    { name: "PIX", value: paymentBreakdown.pix.count },
    { name: "Boleto", value: paymentBreakdown.boleto.count },
  ].filter((d) => d.value > 0);
  const installmentBarData = [
    { name: "Cartão de Crédito", avista: paymentBreakdown.cardCash.count, parcelado: paymentBreakdown.cardInstallment.count },
    { name: "PIX", avista: paymentBreakdown.pix.count, parcelado: 0 },
    { name: "Boleto", avista: paymentBreakdown.boleto.count, parcelado: 0 },
  ];
  const totalPaymentSales = paymentBreakdown.pix.count + paymentBreakdown.card.count + paymentBreakdown.boleto.count;
  const pixPct = totalPaymentSales > 0 ? (paymentBreakdown.pix.count / totalPaymentSales) * 100 : 0;
  const cardPct = totalPaymentSales > 0 ? (paymentBreakdown.card.count / totalPaymentSales) * 100 : 0;
  const cardCashPct = paymentBreakdown.card.count > 0 ? (paymentBreakdown.cardCash.count / paymentBreakdown.card.count) * 100 : 0;
  const cardInstallmentPct = paymentBreakdown.card.count > 0 ? (paymentBreakdown.cardInstallment.count / paymentBreakdown.card.count) * 100 : 0;

  // Temporal analysis - sales by day of week and hour
  const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const salesByDayOfWeek = Array.from({ length: 7 }, (_, i) => ({ name: DAY_NAMES[i], vendas: 0, revenue: 0 }));
  const salesByHour = Array.from({ length: 24 }, (_, i) => ({ name: `${String(i).padStart(2, "0")}:00`, vendas: 0, revenue: 0 }));
  approvedSales.forEach((s) => {
    const dateStr = s.sale_date || s.created_at;
    if (!dateStr) return;
    const d = new Date(dateStr);
    salesByDayOfWeek[d.getDay()].vendas++;
    salesByDayOfWeek[d.getDay()].revenue += Number(s.amount);
    salesByHour[d.getHours()].vendas++;
    salesByHour[d.getHours()].revenue += Number(s.amount);
  });
  const bestDay = salesByDayOfWeek.reduce((best, cur) => cur.vendas > best.vendas ? cur : best, salesByDayOfWeek[0]);
  const bestHour = salesByHour.reduce((best, cur) => cur.vendas > best.vendas ? cur : best, salesByHour[0]);

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

  // Demographics data
  const adDemographics = demographicsQuery.data || [];
  const metaDemographics = adDemographics.filter(d => d.platform === "meta");
  const googleDemographics = adDemographics.filter(d => d.platform === "google");

  // Buyer location breakdown from sales
  const buyerLocationMap = new Map<string, { count: number; revenue: number }>();
  approvedSales.forEach((s) => {
    const state = s.buyer_state || (s as any).payload?.estado || "";
    if (!state) return;
    const existing = buyerLocationMap.get(state) || { count: 0, revenue: 0 };
    buyerLocationMap.set(state, { count: existing.count + 1, revenue: existing.revenue + Number(s.amount || 0) });
  });
  const buyerLocationData = Array.from(buyerLocationMap.entries())
    .map(([state, data]) => ({ name: state, ...data, pct: salesCount > 0 ? (data.count / salesCount) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);

  const metaAds = metaAdsQuery.data || [];

  return {
    isLoading: salesQuery.isLoading || metaQuery.isLoading || googleQuery.isLoading || investmentsQuery.isLoading || productsQuery.isLoading,
    // Lazy-load triggers for secondary data
    loadDemographics: demographicsQuery.refetch,
    loadMetaAds: metaAdsQuery.refetch,
    demographicsLoaded: demographicsQuery.isFetched,
    metaAdsLoaded: metaAdsQuery.isFetched,
    totalRevenue, grossRevenue, grossActionRevenue, totalFees, totalTaxes, totalCoproducerCommission, salesCount, avgTicket,
    pendingSalesCount: pendingSales.length, cancelledSalesCount: cancelledSales.length, refundedSalesCount: refundedSales.length,
    totalSalesCount: sales.length, kiwifySales, hotmartSales, pendingSales, refundedSales,
    metaInvestment, googleInvestment, manualInvestment, totalInvestment,
    roi, roas, margin, netProfit, netProfitProject, netProfitProducer, producerRevenue,
    totalLeads, metaLeads, googleLeads, conversionRate, conversionLabel, conversionBase, avgCpl,
    rpl, rplGross, rplLeads, isRplStrategy, avgPurchasesPerLead,
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
    paymentBreakdown, paymentPieData, installmentBarData, pixPct, cardPct, cardCashPct, cardInstallmentPct,
    boletoTotal, boletoPaid, boletoPending, boletoConversionRate, boletoRevenue, boletoByPlatform,
    salesByDayOfWeek, salesByHour, bestDay, bestHour,
    metaDemographics, googleDemographics, buyerLocationData,
    metaAds,
    ...changes,
  };
}
