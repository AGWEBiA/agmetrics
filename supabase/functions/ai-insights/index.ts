import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id } = await req.json();
    if (!project_id) throw new Error("project_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString().slice(0, 10);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);

    // Collect all data in parallel
    const [
      { data: project },
      { data: salesRecent },
      { data: salesPrev },
      { data: salesAll90d },
      { data: metaMetrics },
      { data: googleMetrics },
      { data: topAds },
      { data: leadEvents },
      { data: goals },
      { data: products },
      { data: adDemographics },
      { data: manualInvestments },
      { data: customApiMetrics },
      { data: whatsappGroups },
    ] = await Promise.all([
      supabase.from("projects").select("name, strategy, budget, start_date, end_date, cart_open_date, description, agsell_form_field_mapping").eq("id", project_id).single(),
      supabase.from("sales_events").select("amount, status, product_name, product_type, payment_method, buyer_state, buyer_email, sale_date, tracking_src, tracking_sck, utm_source, utm_medium, utm_campaign, refund_reason").eq("project_id", project_id).eq("is_ignored", false).gte("sale_date", thirtyDaysAgo).order("sale_date", { ascending: false }).limit(1000),
      supabase.from("sales_events").select("amount, status, sale_date").eq("project_id", project_id).eq("is_ignored", false).gte("sale_date", sixtyDaysAgo).lt("sale_date", thirtyDaysAgo).limit(500),
      supabase.from("sales_events").select("amount, status, buyer_email, sale_date, utm_source, utm_medium, payment_method, buyer_state, refund_reason, product_type").eq("project_id", project_id).eq("is_ignored", false).gte("sale_date", ninetyDaysAgo).order("sale_date", { ascending: false }).limit(1000),
      supabase.from("meta_metrics").select("date, investment, impressions, clicks, leads, purchases, ctr, cpc, cpm, link_clicks, landing_page_views, checkouts_initiated").eq("project_id", project_id).gte("date", ninetyDaysAgo).order("date", { ascending: false }).limit(90),
      supabase.from("google_metrics").select("date, investment, impressions, clicks, conversions, ctr, cpc").eq("project_id", project_id).gte("date", ninetyDaysAgo).order("date", { ascending: false }).limit(90),
      supabase.from("meta_ads").select("ad_id, ad_name, spend, impressions, clicks, link_clicks, purchases, leads, cpc, ctr, hook_rate, hold_rate, landing_page_views, checkouts_initiated, date_start, date_end").eq("project_id", project_id).order("spend", { ascending: false }).limit(20),
      supabase.from("lead_events").select("event_type, event_source, utm_source, utm_medium, utm_campaign, amount, event_date").eq("project_id", project_id).gte("event_date", thirtyDaysAgo).limit(300),
      supabase.from("project_goals").select("type, target_value, period").eq("project_id", project_id).eq("is_active", true),
      supabase.from("products").select("name, type, platform, price").eq("project_id", project_id),
      supabase.from("ad_demographics").select("breakdown_type, dimension_1, dimension_2, spend, impressions, clicks, conversions, leads, purchases").eq("project_id", project_id).gte("date_start", thirtyDaysAgo).limit(100),
      supabase.from("manual_investments").select("amount, date, description").eq("project_id", project_id).gte("date", thirtyDaysAgo),
      supabase.from("custom_api_metrics").select("metric_type, data, synced_at").eq("project_id", project_id).order("synced_at", { ascending: false }).limit(10),
      supabase.from("whatsapp_groups").select("name, member_count, peak_members, members_left, engagement_rate").eq("project_id", project_id),
    ]);

    // === BASE METRICS ===
    const approvedSales = (salesRecent || []).filter(s => s.status === "approved");
    const refundedSales = (salesRecent || []).filter(s => s.status === "refunded");
    const prevApproved = (salesPrev || []).filter(s => s.status === "approved");
    const totalRevenue = approvedSales.reduce((s, v) => s + (v.amount || 0), 0);
    const prevRevenue = prevApproved.reduce((s, v) => s + (v.amount || 0), 0);

    const metaLast30 = (metaMetrics || []).filter(m => m.date >= thirtyDaysAgo);
    const googleLast30 = (googleMetrics || []).filter(m => m.date >= thirtyDaysAgo);
    const totalInvestment = metaLast30.reduce((s, v) => s + (v.investment || 0), 0) + googleLast30.reduce((s, v) => s + (v.investment || 0), 0);
    const totalClicks = metaLast30.reduce((s, v) => s + (v.clicks || 0), 0) + googleLast30.reduce((s, v) => s + (v.clicks || 0), 0);
    const totalImpressions = metaLast30.reduce((s, v) => s + (v.impressions || 0), 0) + googleLast30.reduce((s, v) => s + (v.impressions || 0), 0);
    const totalLeads = metaLast30.reduce((s, v) => s + (v.leads || 0), 0);
    const totalPurchases = metaLast30.reduce((s, v) => s + (v.purchases || 0), 0);
    const totalLPViews = metaLast30.reduce((s, v) => s + (v.landing_page_views || 0), 0);
    const totalCheckouts = metaLast30.reduce((s, v) => s + (v.checkouts_initiated || 0), 0);

    const paymentMethods: Record<string, number> = {};
    approvedSales.forEach(s => { paymentMethods[s.payment_method || "unknown"] = (paymentMethods[s.payment_method || "unknown"] || 0) + 1; });

    const utmSources: Record<string, { count: number; revenue: number; refunds: number }> = {};
    (salesRecent || []).forEach(s => {
      const src = s.utm_source || s.tracking_src;
      if (!src) return;
      if (!utmSources[src]) utmSources[src] = { count: 0, revenue: 0, refunds: 0 };
      if (s.status === "approved") { utmSources[src].count++; utmSources[src].revenue += (s.amount || 0); }
      if (s.status === "refunded") utmSources[src].refunds++;
    });

    const states: Record<string, { sales: number; revenue: number }> = {};
    approvedSales.filter(s => s.buyer_state).forEach(s => {
      if (!states[s.buyer_state!]) states[s.buyer_state!] = { sales: 0, revenue: 0 };
      states[s.buyer_state!].sales++;
      states[s.buyer_state!].revenue += (s.amount || 0);
    });
    const topStates = Object.entries(states).sort((a, b) => b[1].sales - a[1].sales).slice(0, 8);

    const adsSummary = (topAds || []).slice(0, 10).map(a => ({
      name: a.ad_name, spend: a.spend, clicks: a.link_clicks || a.clicks,
      purchases: a.purchases, leads: a.leads, cpc: a.cpc, ctr: a.ctr,
      hook_rate: a.hook_rate, hold_rate: a.hold_rate, lpv: a.landing_page_views,
      checkouts: a.checkouts_initiated, date_start: a.date_start, date_end: a.date_end,
    }));

    const roi = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment * 100) : 0;
    const roas = totalInvestment > 0 ? (totalRevenue / totalInvestment) : 0;
    const cpa = approvedSales.length > 0 ? (totalInvestment / approvedSales.length) : 0;
    const refundRate = (approvedSales.length + refundedSales.length) > 0 ? (refundedSales.length / (approvedSales.length + refundedSales.length) * 100) : 0;

    // === PRODUCTS ===
    const mainProducts = (products || []).filter(p => p.type === "main");
    const orderBumps = (products || []).filter(p => p.type === "order_bump");
    const hasOrderBump = orderBumps.length > 0;
    const salesByProduct: Record<string, { count: number; revenue: number; type: string }> = {};
    approvedSales.forEach(s => {
      const key = s.product_name || "Desconhecido";
      if (!salesByProduct[key]) salesByProduct[key] = { count: 0, revenue: 0, type: s.product_type || "main" };
      salesByProduct[key].count++;
      salesByProduct[key].revenue += (s.amount || 0);
    });
    const mainSalesCount = approvedSales.filter(s => s.product_type === "main" || !s.product_type).length;
    const bumpSalesCount = approvedSales.filter(s => s.product_type === "order_bump").length;
    const bumpAdoptionRate = mainSalesCount > 0 ? (bumpSalesCount / mainSalesCount * 100) : 0;

    // === HEATMAP TEMPORAL (day of week + hour) ===
    const dayHourMap: Record<string, number> = {};
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    approvedSales.forEach(s => {
      if (!s.sale_date) return;
      const d = new Date(s.sale_date);
      const day = dayNames[d.getDay()];
      const hour = d.getHours();
      const key = `${day}-${hour}h`;
      dayHourMap[key] = (dayHourMap[key] || 0) + 1;
    });
    const topSalesTimes = Object.entries(dayHourMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // === RECOMPRA / LTV ===
    const buyerPurchases: Record<string, { count: number; total: number; first: string; last: string }> = {};
    (salesAll90d || []).filter(s => s.status === "approved" && s.buyer_email).forEach(s => {
      const email = s.buyer_email!;
      if (!buyerPurchases[email]) buyerPurchases[email] = { count: 0, total: 0, first: s.sale_date!, last: s.sale_date! };
      buyerPurchases[email].count++;
      buyerPurchases[email].total += (s.amount || 0);
      if (s.sale_date! < buyerPurchases[email].first) buyerPurchases[email].first = s.sale_date!;
      if (s.sale_date! > buyerPurchases[email].last) buyerPurchases[email].last = s.sale_date!;
    });
    const totalBuyers = Object.keys(buyerPurchases).length;
    const repeatBuyers = Object.values(buyerPurchases).filter(b => b.count > 1);
    const repeatRate = totalBuyers > 0 ? (repeatBuyers.length / totalBuyers * 100) : 0;
    const avgLTV = totalBuyers > 0 ? Object.values(buyerPurchases).reduce((s, b) => s + b.total, 0) / totalBuyers : 0;
    const topBuyersLTV = Object.values(buyerPurchases).sort((a, b) => b.total - a.total).slice(0, 5);

    // === REFUND PATTERNS ===
    const refundsBySource: Record<string, number> = {};
    const refundsByPayment: Record<string, number> = {};
    const refundReasons: Record<string, number> = {};
    (salesAll90d || []).filter(s => s.status === "refunded").forEach(s => {
      const src = s.utm_source || "orgânico";
      refundsBySource[src] = (refundsBySource[src] || 0) + 1;
      const pm = s.payment_method || "unknown";
      refundsByPayment[pm] = (refundsByPayment[pm] || 0) + 1;
      if (s.refund_reason) refundReasons[s.refund_reason] = (refundReasons[s.refund_reason] || 0) + 1;
    });

    // === CREATIVE FATIGUE (CTR trend per ad) ===
    const adsByWeek: Record<string, { week: string; ctr: number; cpc: number }[]> = {};
    (metaMetrics || []).forEach(m => {
      const weekNum = Math.floor((now.getTime() - new Date(m.date).getTime()) / (7 * 86400000));
      const weekLabel = `S-${weekNum}`;
      // aggregate by week for overall fatigue signal
      if (!adsByWeek["global"]) adsByWeek["global"] = [];
      const existing = adsByWeek["global"].find(w => w.week === weekLabel);
      if (existing) {
        existing.ctr = (existing.ctr + (m.ctr || 0)) / 2;
        existing.cpc = (existing.cpc + (m.cpc || 0)) / 2;
      } else {
        adsByWeek["global"].push({ week: weekLabel, ctr: m.ctr || 0, cpc: m.cpc || 0 });
      }
    });

    // === BUDGET PACING ===
    const budget = project?.budget || 0;
    const manualInvTotal = (manualInvestments || []).reduce((s, v) => s + (v.amount || 0), 0);
    const totalSpent = totalInvestment + manualInvTotal;
    const budgetUsedPct = budget > 0 ? (totalSpent / budget * 100) : 0;
    const daysElapsed = project?.start_date ? Math.max(1, Math.round((now.getTime() - new Date(project.start_date).getTime()) / 86400000)) : 30;
    const totalDays = project?.start_date && project?.end_date ? Math.max(1, Math.round((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / 86400000)) : 30;
    const expectedPacePct = budget > 0 ? (daysElapsed / totalDays * 100) : 0;
    const dailySpendAvg = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
    const projectedTotalSpend = dailySpendAvg * totalDays;

    // === UTM QUALITY SCORE ===
    const utmQuality = Object.entries(utmSources).map(([src, d]) => ({
      source: src,
      sales: d.count,
      revenue: d.revenue,
      refunds: d.refunds,
      avgTicket: d.count > 0 ? d.revenue / d.count : 0,
      refundRate: (d.count + d.refunds) > 0 ? (d.refunds / (d.count + d.refunds) * 100) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    // === GEOGRAPHIC ROI ===
    const geoROI = topStates.map(([state, data]) => {
      // We can correlate with demographic spend if available
      const demoSpend = (adDemographics || [])
        .filter(d => d.breakdown_type === "region" && d.dimension_1 === state)
        .reduce((s, d) => s + (d.spend || 0), 0);
      return { state, sales: data.sales, revenue: data.revenue, adSpend: demoSpend, roi: demoSpend > 0 ? ((data.revenue - demoSpend) / demoSpend * 100) : null };
    });

    // === WHATSAPP CORRELATION ===
    const whatsappSummary = (whatsappGroups || []).map(g => ({
      name: g.name, members: g.member_count, peak: g.peak_members, left: g.members_left, engagement: g.engagement_rate,
    }));

    // === CUSTOM API / EMAIL METRICS ===
    const emailMetrics = (customApiMetrics || []).filter(m => m.metric_type.toLowerCase().includes("email") || m.metric_type.toLowerCase().includes("newsletter"));

    // === FORM FIELDS (AGSell) ===
    const formFieldMapping = project?.agsell_form_field_mapping || [];

    // === STRATEGY CONTEXT ===
    const strategyLabels: Record<string, string> = {
      perpetuo: "Perpétuo (vendas contínuas, sem data de encerramento)",
      lancamento: "Lançamento (captação de leads → evento → abertura de carrinho por tempo limitado)",
      lancamento_pago: "Lançamento Pago (venda de ingressos baratos → workshop/evento → venda do produto principal de maior valor)",
      funis: "Funis (sequência automatizada de páginas e ofertas)",
      evento_presencial: "Evento Presencial (vendas de ingressos + upsells no evento)",
    };
    const strategyDescription = strategyLabels[project?.strategy || ""] || project?.strategy || "N/A";

    let launchContext = "";
    if (project?.strategy && project.strategy !== "perpetuo") {
      if (project.cart_open_date) {
        const cartDate = new Date(project.cart_open_date);
        const diffDays = Math.round((cartDate.getTime() - now.getTime()) / 86400000);
        if (diffDays > 0) launchContext = `\nAbertura do carrinho em ${diffDays} dias (${project.cart_open_date})`;
        else if (diffDays === 0) launchContext = `\nCarrinho ABERTO HOJE (${project.cart_open_date})`;
        else launchContext = `\nCarrinho abriu há ${Math.abs(diffDays)} dias (${project.cart_open_date})`;
      }
      if (project.start_date) launchContext += `\nInício: ${project.start_date}`;
      if (project.end_date) launchContext += ` | Fim: ${project.end_date}`;
    }

    const dataContext = `
## Dados do Projeto: ${project?.name || "N/A"}
Estratégia: ${strategyDescription}
${project?.description ? `Descrição: ${project.description}` : ""}
Orçamento: R$ ${budget || "N/A"}${launchContext}
Período de análise: últimos 30 dias (com histórico de 90 dias para tendências)

## Produtos Cadastrados
${mainProducts.length > 0 ? mainProducts.map(p => `- [PRINCIPAL] ${p.name} (${p.platform}) — R$ ${(p.price || 0).toFixed(2)}`).join("\n") : "Nenhum produto principal cadastrado"}
${hasOrderBump ? orderBumps.map(p => `- [ORDER BUMP] ${p.name} (${p.platform}) — R$ ${(p.price || 0).toFixed(2)}`).join("\n") : "⚠️ Nenhum Order Bump cadastrado"}
Total de produtos: ${(products || []).length} (${mainProducts.length} principal, ${orderBumps.length} order bump)

## Vendas por Produto (30 dias)
${Object.entries(salesByProduct).sort((a,b) => b[1].revenue - a[1].revenue).map(([name, d]) => `- ${name} [${d.type}]: ${d.count} vendas, R$ ${d.revenue.toFixed(2)}`).join("\n") || "Sem vendas no período"}
${hasOrderBump ? `Taxa de adoção Order Bump: ${bumpAdoptionRate.toFixed(1)}% (${bumpSalesCount} bumps em ${mainSalesCount} vendas principais)` : ""}

## Métricas de Performance (30 dias)
- Receita Total: R$ ${totalRevenue.toFixed(2)}
- Receita período anterior (30d): R$ ${prevRevenue.toFixed(2)}
- Variação receita: ${prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : "N/A"}%
- Vendas aprovadas: ${approvedSales.length}
- Vendas período anterior: ${prevApproved.length}
- Reembolsos: ${refundedSales.length} (taxa: ${refundRate.toFixed(1)}%)
- Investimento total (ads): R$ ${totalInvestment.toFixed(2)}
- ROI: ${roi.toFixed(1)}%
- ROAS: ${roas.toFixed(2)}x
- CPA médio: R$ ${cpa.toFixed(2)}

## Funil de Conversão (Meta Ads)
- Impressões: ${totalImpressions}
- Cliques: ${totalClicks}
- CTR médio: ${totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : 0}%
- Landing Page Views: ${totalLPViews}
- Connect Rate: ${totalClicks > 0 ? (totalLPViews / totalClicks * 100).toFixed(1) : 0}%
- Leads: ${totalLeads}
- Checkouts: ${totalCheckouts}
- Compras (Meta): ${totalPurchases}
- Conv. Página: ${totalLPViews > 0 ? (totalCheckouts / totalLPViews * 100).toFixed(1) : 0}%
- Conv. Checkout: ${totalCheckouts > 0 ? (totalPurchases / totalCheckouts * 100).toFixed(1) : 0}%

## Top Anúncios (por investimento)
${adsSummary.map(a => `- ${a.name}: Gasto R$${(a.spend||0).toFixed(2)}, Cliques ${a.clicks||0}, Compras ${a.purchases||0}, Leads ${a.leads||0}, CPC R$${(a.cpc||0).toFixed(2)}, CTR ${(a.ctr||0).toFixed(2)}%, Hook ${(a.hook_rate||0).toFixed(1)}%, Hold ${(a.hold_rate||0).toFixed(1)}%, LPV ${a.lpv||0}, Checkouts ${a.checkouts||0}, Período: ${a.date_start||'?'}→${a.date_end||'?'}`).join("\n")}

## 📊 HEATMAP TEMPORAL — Melhores Horários de Venda
${topSalesTimes.map(([k,v]) => `- ${k}: ${v} vendas`).join("\n") || "Sem dados suficientes"}

## 🔄 RECOMPRA E LTV (90 dias)
- Total de compradores únicos: ${totalBuyers}
- Compradores recorrentes: ${repeatBuyers.length} (${repeatRate.toFixed(1)}%)
- LTV médio: R$ ${avgLTV.toFixed(2)}
- Top 5 LTVs: ${topBuyersLTV.map(b => `R$ ${b.total.toFixed(2)} (${b.count}x)`).join(", ") || "N/A"}

## 🔙 PADRÕES DE REEMBOLSO (90 dias)
- Por fonte: ${Object.entries(refundsBySource).sort((a,b) => b[1]-a[1]).slice(0,5).map(([k,v]) => `${k}: ${v}`).join(", ") || "N/A"}
- Por pagamento: ${Object.entries(refundsByPayment).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}: ${v}`).join(", ") || "N/A"}
- Motivos: ${Object.entries(refundReasons).sort((a,b) => b[1]-a[1]).slice(0,5).map(([k,v]) => `${k}: ${v}`).join(", ") || "Sem motivos registrados"}

## 📉 FADIGA DE CRIATIVOS (tendência CTR/CPC semanal - 90 dias)
${(adsByWeek["global"] || []).sort((a,b) => a.week.localeCompare(b.week)).map(w => `- ${w.week}: CTR ${w.ctr.toFixed(2)}%, CPC R$ ${w.cpc.toFixed(2)}`).join("\n") || "Sem dados de tendência"}

## 🎯 UTM QUALITY SCORE
${utmQuality.slice(0,8).map(u => `- ${u.source}: ${u.sales} vendas, R$ ${u.revenue.toFixed(2)}, Ticket R$ ${u.avgTicket.toFixed(2)}, Reembolsos: ${u.refunds} (${u.refundRate.toFixed(1)}%)`).join("\n") || "Sem dados UTM"}

## 🗺️ ROI GEOGRÁFICO
${geoROI.map(g => `- ${g.state}: ${g.sales} vendas, R$ ${g.revenue.toFixed(2)}${g.adSpend > 0 ? `, Invest R$ ${g.adSpend.toFixed(2)}, ROI ${g.roi?.toFixed(1)}%` : ""}`).join("\n") || "Sem dados geográficos"}

## 💰 BUDGET PACING
- Orçamento total: R$ ${budget.toFixed(2)}
- Gasto total (30d): R$ ${totalSpent.toFixed(2)} (${budgetUsedPct.toFixed(1)}% do orçamento)
- Gasto diário médio: R$ ${dailySpendAvg.toFixed(2)}
- Projeção total: R$ ${projectedTotalSpend.toFixed(2)}
- Pacing esperado: ${expectedPacePct.toFixed(1)}% | Real: ${budgetUsedPct.toFixed(1)}%
${budgetUsedPct > expectedPacePct + 10 ? "⚠️ ACIMA DO RITMO ESPERADO" : budgetUsedPct < expectedPacePct - 10 ? "⚠️ ABAIXO DO RITMO ESPERADO" : "✅ No ritmo"}

## 📱 WHATSAPP (comunidades)
${whatsappSummary.length > 0 ? whatsappSummary.map(g => `- ${g.name}: ${g.members} membros (pico: ${g.peak}, saídas: ${g.left}, engajamento: ${(g.engagement||0).toFixed(1)}%)`).join("\n") : "Sem grupos WhatsApp configurados"}

## 📧 MÉTRICAS DE E-MAIL / AUTOMAÇÃO
${emailMetrics.length > 0 ? emailMetrics.map(m => `- ${m.metric_type}: ${JSON.stringify(m.data).slice(0, 200)}`).join("\n") : "Sem métricas de e-mail sincronizadas"}

## 📝 CAMPOS DE FORMULÁRIO (AGSell)
${Array.isArray(formFieldMapping) && formFieldMapping.length > 0 ? `Campos mapeados: ${JSON.stringify(formFieldMapping).slice(0, 300)}` : "Nenhum campo de formulário configurado"}

## Métodos de Pagamento
${Object.entries(paymentMethods).sort((a,b) => b[1]-a[1]).map(([k,v]) => `- ${k}: ${v}`).join("\n")}

## Metas Ativas
${(goals || []).map(g => `- ${g.type} ${g.period}: ${g.target_value}`).join("\n") || "Nenhuma meta definida"}
`;

    const systemPrompt = `Você é um consultor especialista em marketing digital, performance de anúncios, otimização de conversões e inteligência de dados para infoprodutos no mercado brasileiro.

Analise TODOS os dados fornecidos e gere insights acionáveis organizados nas categorias disponíveis. Para CADA insight, inclua:
- Um título curto e impactante
- Uma análise detalhada do que os dados mostram
- Ações concretas e específicas a serem tomadas
- O impacto estimado (alto/médio/baixo)
- A prioridade (urgente/importante/oportunidade)

Responda EXCLUSIVAMENTE usando a function tool "generate_insights" fornecida. Gere entre 8 e 15 insights de alta qualidade.

CATEGORIAS DISPONÍVEIS — tente gerar insights em TODAS as categorias que tiverem dados relevantes:

1. **vendas** — Performance de vendas, ticket médio, tendências de conversão
2. **anuncios** — Otimização de criativos, investimento em ads, fadiga de criativos
3. **funil** — Análise de funil completo (impressão → clique → LP → checkout → compra)
4. **leads** — Captação, qualidade e conversão de leads
5. **financeiro** — ROI, ROAS, CPA, budget pacing, projeção financeira
6. **tracking** — Qualidade de rastreamento UTM/SRC, atribuição de vendas
7. **produtos** — Order bumps, downsells, precificação, estrutura de produtos
8. **recompra** — Recompra, LTV, retenção de clientes, frequência de compra
9. **reembolsos** — Padrões de reembolso, correlação com fontes e métodos de pagamento
10. **criativos** — Fadiga de criativos, deterioração de CTR/CPC ao longo do tempo
11. **geografico** — ROI por estado/região, segmentação geográfica
12. **temporal** — Melhores dias/horários de venda, padrões sazonais
13. **comunidade** — WhatsApp, engajamento de comunidade, correlação com vendas
14. **email** — Métricas de e-mail marketing, automação, campos de formulário

CONTEXTO ESTRATÉGICO — adapte sua análise conforme a estratégia:
1. **Perpétuo**: Foco em CPA, escala, retenção e LTV.
2. **Lançamento**: CPL, volume de leads, preparação para abertura do carrinho.
3. **Lançamento Pago**: Vendas iniciais = INGRESSOS baratos (R$47-R$197). Produto principal vendido no workshop. Analise CPA do ingresso vs preço, projeção de conversão 5-15%.
4. **Funis**: Analise cada etapa separadamente. Identifique vazamentos.
5. **Evento Presencial**: Ingressos front-end, upsells back-end.

ANÁLISES AVANÇADAS OBRIGATÓRIAS (quando houver dados):
- **Fadiga de Criativos**: Compare CTR/CPC semana a semana. Queda de CTR >20% = fadiga.
- **Heatmap Temporal**: Identifique os 3 melhores dias/horários e sugira concentração de budget.
- **Recompra/LTV**: Analise taxa de recompra (benchmark: >5% é bom para infoprodutos). Sugira estratégias de retenção.
- **Score UTM**: Ranqueie fontes por qualidade (ticket médio alto + baixo reembolso = melhor).
- **Budget Pacing**: Se gasto está acima/abaixo do ritmo, alerte com urgência.
- **ROI Geográfico**: Identifique estados com melhor/pior retorno.
- **Padrões de Reembolso**: Correlacione reembolsos com fontes e métodos de pagamento.
- **Produtos**: SEMPRE gere pelo menos 1 insight. Sugira order bumps, downsells, precificação.
- **E-mail/Formulários**: Se houver dados, analise métricas de e-mail e campos demográficos.
- **Comunidade WhatsApp**: Se houver dados, analise correlação crescimento × vendas.

Regras:
- Seja específico: cite números, anúncios por nome, percentuais reais
- Priorize insights com maior potencial de impacto em receita
- Considere benchmarks do mercado brasileiro de infoprodutos
- Se alguma métrica estiver zerada ou ausente, sugira como começar a rastrear
- Adapte completamente sua análise à estratégia do projeto`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: dataContext },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_insights",
              description: "Generate actionable marketing insights based on the data analysis",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Um parágrafo resumindo a saúde geral do projeto e os principais pontos de atenção"
                  },
                  health_score: {
                    type: "number",
                    description: "Nota de 0-100 representando a saúde geral do projeto baseada nos dados"
                  },
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: ["vendas", "anuncios", "funil", "leads", "financeiro", "tracking", "produtos", "recompra", "reembolsos", "criativos", "geografico", "temporal", "comunidade", "email"]
                        },
                        title: { type: "string" },
                        analysis: { type: "string" },
                        actions: { type: "array", items: { type: "string" } },
                        impact: { type: "string", enum: ["alto", "medio", "baixo"] },
                        priority: { type: "string", enum: ["urgente", "importante", "oportunidade"] },
                        metric_reference: { type: "string", description: "A métrica principal relacionada a este insight" }
                      },
                      required: ["category", "title", "analysis", "actions", "impact", "priority"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["summary", "health_score", "insights"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao seu workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured insights");
    }

    const insights = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
