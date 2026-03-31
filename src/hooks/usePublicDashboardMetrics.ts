import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getNormalizedPlatformFee, getNormalizedCoproducerCommission } from "@/lib/salesFinancials";

export function usePublicDashboardMetrics(projectId: string | undefined, viewToken: string | undefined, strategy?: string) {
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

  const allSales = (salesQuery.data || []).filter((s: any) => !s.is_ignored);
  const sales = allSales.filter((s: any) => s.status === "approved");
  const pendingSales = allSales.filter((s: any) => s.status === "pending");
  const refundedSales = allSales.filter((s: any) => s.status === "refunded");
  const cancelledSales = allSales.filter((s: any) => s.status === "cancelled");
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

  // Leads: use same formula as private dashboard (meta + google leads from metrics)
  const googleLeads = google.reduce((s: number, m: any) => s + (m.conversions || 0), 0);
  const totalLeads = metaLeads + googleLeads;

  // Strategy-aware conversion (mirrors private dashboard exactly)
  const isPerpertuo = strategy === "perpetuo";
  const isRplStrategy = strategy === "perpetuo" || strategy === "lancamento_pago";

  // Page views for perpétuo conversion
  const totalPageViews = meta.reduce((s: number, m: any) => s + (m.landing_page_views || 0), 0)
    + google.reduce((s: number, m: any) => s + (m.clicks || 0), 0);

  // RPL - unique buyers (public RPC strips buyer_email, use external_id as proxy)
  const uniqueSaleKeys = new Set(
    sales
      .map((s: any) => (s.external_id || "").toLowerCase().trim())
      .filter((e: string) => e.length > 0)
  );
  const rplLeads = isRplStrategy ? (uniqueSaleKeys.size || salesCount) : totalLeads;
  const rpl = rplLeads > 0 ? totalRevenue / rplLeads : 0;
  const rplGross = rplLeads > 0 ? grossRevenue / rplLeads : 0;
  const cplBase = isRplStrategy ? rplLeads : totalLeads;
  const avgCpl = cplBase > 0 ? totalInvestment / cplBase : 0;
  const avgPurchasesPerLead = cplBase > 0 ? salesCount / cplBase : 0;

  // Conversion rate uses same base as CPL/RPL for consistency (mirrors private)
  const conversionBase = isPerpertuo ? totalPageViews : cplBase;
  const conversionRate = conversionBase > 0 ? (salesCount / conversionBase) * 100 : 0;
  const conversionLabel = isPerpertuo ? "Views → Compras" : "Leads → Compras";

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

  // Kiwify/Hotmart splits
  const kiwifySales = sales.filter((s: any) => s.platform === "kiwify");
  const hotmartSales = sales.filter((s: any) => s.platform === "hotmart");

  // Payment method breakdown using payment_method field
  const paymentBreakdownCalc = { pix: { count: 0, revenue: 0 }, card: { count: 0, revenue: 0 }, cardCash: { count: 0, revenue: 0 }, cardInstallment: { count: 0, revenue: 0 }, boleto: { count: 0, revenue: 0 } };
  sales.forEach((s: any) => {
    const method = (s.payment_method || "").toLowerCase();
    const amount = Number(s.gross_amount || s.amount || 0);
    if (method === "pix") {
      paymentBreakdownCalc.pix.count++;
      paymentBreakdownCalc.pix.revenue += amount;
    } else if (["boleto", "billet", "bank_slip", "boleto_bancario"].includes(method)) {
      paymentBreakdownCalc.boleto.count++;
      paymentBreakdownCalc.boleto.revenue += amount;
    } else if (method) {
      paymentBreakdownCalc.card.count++;
      paymentBreakdownCalc.card.revenue += amount;
      paymentBreakdownCalc.cardCash.count++;
      paymentBreakdownCalc.cardCash.revenue += amount;
    }
  });

  const paymentPieData = [
    { name: "Cartão de Crédito", value: paymentBreakdownCalc.card.count },
    { name: "PIX", value: paymentBreakdownCalc.pix.count },
    { name: "Boleto", value: paymentBreakdownCalc.boleto.count },
  ].filter((d) => d.value > 0);

  const installmentBarData = [
    { name: "Cartão de Crédito", avista: paymentBreakdownCalc.cardCash.count, parcelado: paymentBreakdownCalc.cardInstallment.count },
    { name: "PIX", avista: paymentBreakdownCalc.pix.count, parcelado: 0 },
    { name: "Boleto", avista: paymentBreakdownCalc.boleto.count, parcelado: 0 },
  ];

  const cardCashPct = paymentBreakdownCalc.card.count > 0 ? (paymentBreakdownCalc.cardCash.count / paymentBreakdownCalc.card.count) * 100 : 0;
  const cardInstallmentPct = paymentBreakdownCalc.card.count > 0 ? (paymentBreakdownCalc.cardInstallment.count / paymentBreakdownCalc.card.count) * 100 : 0;

  // Boleto metrics
  const isBoleto = (method: string): boolean => ["boleto", "billet", "bank_slip", "boleto_bancario"].includes(method);
  const boletoAllSales = allSales.filter((s: any) => isBoleto((s.payment_method || "").toLowerCase()));
  const boletoTotal = boletoAllSales.length;
  const boletoPaid = boletoAllSales.filter((s: any) => s.status === "approved").length;
  const boletoPending = boletoAllSales.filter((s: any) => s.status === "pending").length;
  const boletoConversionRate = boletoTotal > 0 ? (boletoPaid / boletoTotal) * 100 : 0;
  const boletoRevenue = boletoAllSales.filter((s: any) => s.status === "approved").reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
  const boletoByPlatform = {
    kiwify: { total: 0, paid: 0, pending: 0, revenue: 0 },
    hotmart: { total: 0, paid: 0, pending: 0, revenue: 0 },
  };
  boletoAllSales.forEach((s: any) => {
    const p = s.platform === "kiwify" ? boletoByPlatform.kiwify : boletoByPlatform.hotmart;
    p.total++;
    if (s.status === "approved") { p.paid++; p.revenue += Number(s.amount || 0); }
    if (s.status === "pending") p.pending++;
  });

  // Temporal analysis - sales by day of week and hour
  const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const salesByDayOfWeek = Array.from({ length: 7 }, (_, i) => ({ name: DAY_NAMES[i], vendas: 0, revenue: 0 }));
  const salesByHour = Array.from({ length: 24 }, (_, i) => ({ name: `${String(i).padStart(2, "0")}:00`, vendas: 0, revenue: 0 }));
  sales.forEach((s: any) => {
    const dateStr = s.sale_date || s.created_at;
    if (!dateStr) return;
    const d = new Date(dateStr);
    salesByDayOfWeek[d.getDay()].vendas++;
    salesByDayOfWeek[d.getDay()].revenue += Number(s.amount || 0);
    salesByHour[d.getHours()].vendas++;
    salesByHour[d.getHours()].revenue += Number(s.amount || 0);
  });
  const bestDay = salesByDayOfWeek.reduce((best, cur) => cur.vendas > best.vendas ? cur : best, salesByDayOfWeek[0]);
  const bestHour = salesByHour.reduce((best, cur) => cur.vendas > best.vendas ? cur : best, salesByHour[0]);

  // Payment method data for charts
  const paymentMethodData = Array.from(
    sales.reduce((map: Map<string, { count: number; revenue: number }>, s: any) => {
      const method = s.payment_method || "Outro";
      const existing = map.get(method) || { count: 0, revenue: 0 };
      map.set(method, { count: existing.count + 1, revenue: existing.revenue + Number(s.amount || 0) });
      return map;
    }, new Map<string, { count: number; revenue: number }>()).entries()
  ).map(([method, data]) => ({
    method, ...data, pct: salesCount > 0 ? (data.count / salesCount) * 100 : 0,
  }));

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
    rpl, rplGross, rplLeads, isRplStrategy, avgPurchasesPerLead,
    salesByDayOfWeek, salesByHour, kiwifySales, hotmartSales, paymentMethodData,
    metaMetrics, googleMetrics, metaAds: topAds,
    // Status counts
    pendingSalesCount: pendingSales.length, cancelledSalesCount: cancelledSales.length,
    refundedSalesCount: refundedSales.length, totalSalesCount: allSales.length,
    pendingSales, refundedSales,
    conversionLabel, conversionBase,
    demographicsLoaded: false, metaAdsLoaded: metaAdsQuery.isFetched,
    revenueChange: 0, salesCountChange: 0, roiChange: 0, investmentChange: 0, leadsChange: 0,
    // Boleto
    boletoTotal, boletoPaid, boletoPending, boletoConversionRate, boletoRevenue, boletoByPlatform,
    // Payment breakdown
    paymentBreakdown: paymentBreakdownCalc,
    paymentChartData: paymentPieData, paymentMethodBreakdownChart: installmentBarData,
    paymentPieData, cardCashPct, cardInstallmentPct, installmentBarData,
    bestDay, bestHour,
  };
}
