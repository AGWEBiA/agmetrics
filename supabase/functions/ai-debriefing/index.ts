import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id, period_start, period_end } = await req.json();
    if (!project_id || typeof project_id !== "string") {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const endDate = period_end || now.toISOString().slice(0, 10);
    const startDate = period_start || new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
    const periodMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    const prevStart = new Date(new Date(startDate).getTime() - periodMs).toISOString().slice(0, 10);
    const prevEnd = startDate;

    // Collect all data in parallel
    const [
      { data: project },
      { data: salesCurrent },
      { data: salesPrev },
      { data: metaMetrics },
      { data: metaPrev },
      { data: googleMetrics },
      { data: googlePrev },
      { data: topAds },
      { data: leadEvents },
      { data: goals },
      { data: products },
      { data: whatsappGroups },
      { data: previousDebriefing },
      { data: adDemographics },
    ] = await Promise.all([
      supabase.from("projects").select("name, strategy, budget, start_date, end_date, cart_open_date, description").eq("id", project_id).single(),
      supabase.from("sales_events").select("amount, gross_amount, platform_fee, coproducer_commission, taxes, status, product_name, product_type, payment_method, buyer_state, buyer_email, sale_date, tracking_src, utm_source, utm_medium, utm_campaign, refund_reason").eq("project_id", project_id).eq("is_ignored", false).gte("sale_date", startDate).lte("sale_date", endDate).order("sale_date", { ascending: false }).limit(1000),
      supabase.from("sales_events").select("amount, status, sale_date, product_name, buyer_email, refund_reason").eq("project_id", project_id).eq("is_ignored", false).gte("sale_date", prevStart).lt("sale_date", prevEnd).limit(1000),
      supabase.from("meta_metrics").select("date, investment, impressions, clicks, leads, purchases, ctr, cpc, cpm, link_clicks, landing_page_views, checkouts_initiated").eq("project_id", project_id).gte("date", startDate).lte("date", endDate).order("date", { ascending: false }).limit(200),
      supabase.from("meta_metrics").select("date, investment, impressions, clicks, leads, purchases").eq("project_id", project_id).gte("date", prevStart).lt("date", prevEnd).limit(200),
      supabase.from("google_metrics").select("date, investment, impressions, clicks, conversions, ctr, cpc").eq("project_id", project_id).gte("date", startDate).lte("date", endDate).order("date", { ascending: false }).limit(200),
      supabase.from("google_metrics").select("date, investment, clicks, conversions").eq("project_id", project_id).gte("date", prevStart).lt("date", prevEnd).limit(200),
      supabase.from("meta_ads").select("ad_name, spend, impressions, clicks, link_clicks, purchases, leads, cpc, ctr, hook_rate, hold_rate, landing_page_views, checkouts_initiated").eq("project_id", project_id).order("spend", { ascending: false }).limit(15),
      supabase.from("lead_events").select("event_type, event_source, utm_source, utm_medium, amount, event_date").eq("project_id", project_id).gte("event_date", startDate).limit(500),
      supabase.from("project_goals").select("type, target_value, period").eq("project_id", project_id).eq("is_active", true),
      supabase.from("products").select("name, type, platform, price").eq("project_id", project_id),
      supabase.from("whatsapp_groups").select("name, member_count, peak_members, members_left, engagement_rate").eq("project_id", project_id),
      supabase.from("project_debriefings").select("overall_score, summary, strengths, weaknesses, action_plan, created_at").eq("project_id", project_id).order("created_at", { ascending: false }).limit(1),
      supabase.from("ad_demographics").select("breakdown_type, dimension_1, dimension_2, spend, clicks, conversions, leads, purchases").eq("project_id", project_id).gte("date_start", startDate).limit(100),
    ]);

    // === CALCULATE METRICS ===
    const approved = (salesCurrent || []).filter(s => s.status === "approved");
    const refunded = (salesCurrent || []).filter(s => s.status === "refunded");
    const prevApproved = (salesPrev || []).filter(s => s.status === "approved");
    const prevRefunded = (salesPrev || []).filter(s => s.status === "refunded");

    const revenue = approved.reduce((s, v) => s + (v.amount || 0), 0);
    const grossRevenue = approved.reduce((s, v) => s + (v.gross_amount || v.amount || 0), 0);
    const prevRevenue = prevApproved.reduce((s, v) => s + (v.amount || 0), 0);
    const ticketMedio = approved.length > 0 ? revenue / approved.length : 0;

    const metaInvestment = (metaMetrics || []).reduce((s, v) => s + (v.investment || 0), 0);
    const googleInvestment = (googleMetrics || []).reduce((s, v) => s + (v.investment || 0), 0);
    const totalInvestment = metaInvestment + googleInvestment;
    const prevMetaInv = (metaPrev || []).reduce((s, v) => s + (v.investment || 0), 0);
    const prevGoogleInv = (googlePrev || []).reduce((s, v) => s + (v.investment || 0), 0);
    const prevTotalInv = prevMetaInv + prevGoogleInv;

    const totalClicks = (metaMetrics || []).reduce((s, v) => s + (v.clicks || 0), 0) + (googleMetrics || []).reduce((s, v) => s + (v.clicks || 0), 0);
    const totalImpressions = (metaMetrics || []).reduce((s, v) => s + (v.impressions || 0), 0) + (googleMetrics || []).reduce((s, v) => s + (v.impressions || 0), 0);
    const totalLeads = (metaMetrics || []).reduce((s, v) => s + (v.leads || 0), 0);
    const totalPurchases = (metaMetrics || []).reduce((s, v) => s + (v.purchases || 0), 0);
    const totalLPViews = (metaMetrics || []).reduce((s, v) => s + (v.landing_page_views || 0), 0);
    const totalCheckouts = (metaMetrics || []).reduce((s, v) => s + (v.checkouts_initiated || 0), 0);

    const roi = totalInvestment > 0 ? ((revenue - totalInvestment) / totalInvestment * 100) : 0;
    const roas = totalInvestment > 0 ? (revenue / totalInvestment) : 0;
    const cpa = approved.length > 0 ? (totalInvestment / approved.length) : 0;
    const cpl = totalLeads > 0 ? (totalInvestment / totalLeads) : 0;
    const refundRate = (approved.length + refunded.length) > 0 ? (refunded.length / (approved.length + refunded.length) * 100) : 0;
    const prevRefundRate = (prevApproved.length + prevRefunded.length) > 0 ? (prevRefunded.length / (prevApproved.length + prevRefunded.length) * 100) : 0;

    // Funnel rates
    const clickToLPRate = totalClicks > 0 && totalLPViews > 0 ? (totalLPViews / totalClicks * 100) : 0;
    const lpToCheckoutRate = totalLPViews > 0 && totalCheckouts > 0 ? (totalCheckouts / totalLPViews * 100) : 0;
    const checkoutToSaleRate = totalCheckouts > 0 && approved.length > 0 ? (approved.length / totalCheckouts * 100) : 0;

    // Products analysis
    const salesByProduct: Record<string, { count: number; revenue: number; refunds: number; type: string }> = {};
    (salesCurrent || []).forEach(s => {
      const key = s.product_name || "Desconhecido";
      if (!salesByProduct[key]) salesByProduct[key] = { count: 0, revenue: 0, refunds: 0, type: s.product_type || "main" };
      if (s.status === "approved") { salesByProduct[key].count++; salesByProduct[key].revenue += (s.amount || 0); }
      if (s.status === "refunded") salesByProduct[key].refunds++;
    });

    // UTM analysis
    const utmPerformance: Record<string, { sales: number; revenue: number; refunds: number }> = {};
    (salesCurrent || []).forEach(s => {
      const src = s.utm_source || s.tracking_src || "direto";
      if (!utmPerformance[src]) utmPerformance[src] = { sales: 0, revenue: 0, refunds: 0 };
      if (s.status === "approved") { utmPerformance[src].sales++; utmPerformance[src].revenue += (s.amount || 0); }
      if (s.status === "refunded") utmPerformance[src].refunds++;
    });

    // Payment methods
    const paymentMethods: Record<string, number> = {};
    approved.forEach(s => { paymentMethods[s.payment_method || "unknown"] = (paymentMethods[s.payment_method || "unknown"] || 0) + 1; });

    // Geographic
    const states: Record<string, { sales: number; revenue: number }> = {};
    approved.filter(s => s.buyer_state).forEach(s => {
      if (!states[s.buyer_state!]) states[s.buyer_state!] = { sales: 0, revenue: 0 };
      states[s.buyer_state!].sales++;
      states[s.buyer_state!].revenue += (s.amount || 0);
    });

    // Repeat buyers
    const buyerEmails = approved.map(s => s.buyer_email).filter(Boolean);
    const uniqueBuyers = new Set(buyerEmails).size;
    const repeatBuyerRate = uniqueBuyers > 0 ? ((buyerEmails.length - uniqueBuyers) / buyerEmails.length * 100) : 0;

    // Refund reasons
    const refundReasons: Record<string, number> = {};
    refunded.forEach(s => {
      const reason = s.refund_reason || "Não informado";
      refundReasons[reason] = (refundReasons[reason] || 0) + 1;
    });

    // Top ads summary
    const adsSummary = (topAds || []).slice(0, 8).map(a => ({
      name: a.ad_name, spend: a.spend, clicks: a.link_clicks || a.clicks,
      purchases: a.purchases, leads: a.leads, cpc: a.cpc, ctr: a.ctr,
      hook_rate: a.hook_rate, hold_rate: a.hold_rate,
      lpv: a.landing_page_views, checkouts: a.checkouts_initiated,
    }));

    // Goals check
    const goalsAnalysis = (goals || []).map(g => {
      let actual = 0;
      if (g.type === "revenue") actual = revenue;
      else if (g.type === "sales") actual = approved.length;
      else if (g.type === "roi") actual = roi;
      else if (g.type === "leads") actual = totalLeads;
      return { type: g.type, target: g.target_value, actual, achieved: actual >= g.target_value, pct: g.target_value > 0 ? (actual / g.target_value * 100) : 0 };
    });

    // Previous debriefing for comparison
    const prevDebriefing = previousDebriefing?.[0] || null;

    const metricsSnapshot = {
      revenue, grossRevenue, totalInvestment, roi, roas, cpa, cpl, ticketMedio,
      salesCount: approved.length, refundCount: refunded.length, refundRate,
      totalLeads, totalClicks, totalImpressions, totalLPViews, totalCheckouts,
      clickToLPRate, lpToCheckoutRate, checkoutToSaleRate,
      uniqueBuyers, repeatBuyerRate,
      period: { start: startDate, end: endDate },
    };

    // === AI PROMPT ===
    const strategyLabels: Record<string, string> = {
      perpetuo: "Perpétuo (vendas contínuas)",
      lancamento: "Lançamento (evento com abertura/fechamento de carrinho)",
      lancamento_pago: "Lançamento Pago (tráfego pago + evento)",
      funis: "Funis de Vendas",
      evento_presencial: "Evento Presencial",
    };

    const prompt = `Você é um consultor estratégico especialista em infoprodutos brasileiros. Faça um DEBRIEFING completo e detalhado do projeto "${project?.name || "Projeto"}".

ESTRATÉGIA: ${strategyLabels[project?.strategy || "perpetuo"] || project?.strategy}
PERÍODO ANALISADO: ${startDate} a ${endDate}
${project?.description ? `DESCRIÇÃO: ${project.description}` : ""}

=== MÉTRICAS DO PERÍODO ===
Vendas aprovadas: ${approved.length} | Receita líquida: R$${revenue.toFixed(2)} | Ticket médio: R$${ticketMedio.toFixed(2)}
Reembolsos: ${refunded.length} (${refundRate.toFixed(1)}%)
Investimento total: R$${totalInvestment.toFixed(2)} | ROI: ${roi.toFixed(1)}% | ROAS: ${roas.toFixed(2)}x
CPA: R$${cpa.toFixed(2)} | CPL: R$${cpl.toFixed(2)}
Impressões: ${totalImpressions} | Cliques: ${totalClicks} | Leads: ${totalLeads}
LP Views: ${totalLPViews} | Checkouts: ${totalCheckouts}
Compradores únicos: ${uniqueBuyers} | Taxa recompra: ${repeatBuyerRate.toFixed(1)}%

=== PERÍODO ANTERIOR (comparação) ===
Vendas: ${prevApproved.length} | Receita: R$${prevRevenue.toFixed(2)} | Investimento: R$${prevTotalInv.toFixed(2)}
Reembolsos: ${prevRefunded.length} (${prevRefundRate.toFixed(1)}%)

=== TAXAS DE CONVERSÃO DO FUNIL ===
Clique → LP: ${clickToLPRate.toFixed(1)}% | LP → Checkout: ${lpToCheckoutRate.toFixed(1)}% | Checkout → Venda: ${checkoutToSaleRate.toFixed(1)}%

=== PRODUTOS ===
${Object.entries(salesByProduct).map(([name, d]) => `${name} (${d.type}): ${d.count} vendas, R$${d.revenue.toFixed(2)}, ${d.refunds} reembolsos`).join("\n") || "Sem dados"}
Produtos cadastrados: ${(products || []).map(p => `${p.name} (${p.type}, R$${p.price || 0})`).join(", ") || "Nenhum"}

=== FONTES DE TRÁFEGO (UTM) ===
${Object.entries(utmPerformance).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10).map(([src, d]) => `${src}: ${d.sales} vendas, R$${d.revenue.toFixed(2)}, ${d.refunds} reembolsos`).join("\n") || "Sem dados"}

=== TOP ANÚNCIOS ===
${adsSummary.map(a => `${a.name}: R$${a.spend} gasto, ${a.clicks} cliques, ${a.purchases} compras, ${a.leads} leads, CPC R$${a.cpc}, CTR ${a.ctr}%, Hook ${a.hook_rate}%, Hold ${a.hold_rate}%`).join("\n") || "Sem dados"}

=== MEIOS DE PAGAMENTO ===
${Object.entries(paymentMethods).map(([m, c]) => `${m}: ${c}`).join(", ") || "Sem dados"}

=== GEOGRAFIA (Top estados) ===
${Object.entries(states).sort((a, b) => b[1].sales - a[1].sales).slice(0, 8).map(([s, d]) => `${s}: ${d.sales} vendas, R$${d.revenue.toFixed(2)}`).join(", ") || "Sem dados"}

=== MOTIVOS DE REEMBOLSO ===
${Object.entries(refundReasons).map(([r, c]) => `${r}: ${c}`).join(", ") || "Nenhum"}

=== METAS ===
${goalsAnalysis.map(g => `${g.type}: meta ${g.target}, atual ${g.actual.toFixed(0)} (${g.pct.toFixed(0)}%) ${g.achieved ? "✅" : "❌"}`).join("\n") || "Sem metas definidas"}

=== WHATSAPP ===
${(whatsappGroups || []).map(g => `${g.name}: ${g.member_count} membros, pico ${g.peak_members}, saídas ${g.members_left}, engajamento ${g.engagement_rate}%`).join("\n") || "Sem grupos"}

${prevDebriefing ? `=== DEBRIEFING ANTERIOR (Score: ${prevDebriefing.overall_score}) ===
Resumo: ${prevDebriefing.summary}
Plano de ação anterior: ${JSON.stringify(prevDebriefing.action_plan)}` : "=== PRIMEIRO DEBRIEFING ==="}

Retorne EXCLUSIVAMENTE um JSON válido (sem markdown, sem backticks) com esta estrutura:
{
  "overall_score": (0-100, nota geral do período),
  "summary": "(resumo executivo de 3-5 frases sobre o desempenho geral do período)",
  "strengths": [
    {
      "area": "(área: trafego|conversao|produto|financeiro|criativos|comunidade|funil|recompra)",
      "title": "(título curto do ponto forte)",
      "description": "(explicação detalhada de por que isso é um ponto forte)",
      "metric_highlight": "(métrica específica que comprova)"
    }
  ],
  "weaknesses": [
    {
      "area": "(mesmas áreas)",
      "title": "(título curto do ponto fraco)",
      "description": "(explicação do problema e impacto no negócio)",
      "severity": "critico|importante|atencao",
      "how_to_fix": "(explicação detalhada e prática de COMO resolver)",
      "expected_impact": "(impacto esperado se corrigir, com estimativas quando possível)"
    }
  ],
  "action_plan": [
    {
      "priority": 1,
      "action": "(ação concreta e específica)",
      "area": "(área)",
      "timeline": "(prazo sugerido: imediato|1_semana|2_semanas|proximo_ciclo)",
      "effort": "baixo|medio|alto",
      "expected_result": "(resultado esperado com métrica estimada)"
    }
  ],
  "comparison_with_previous": {
    "score_change": (diferença de score ou null se primeiro),
    "improvements": ["(melhorias desde o último debriefing)"],
    "regressions": ["(pioras desde o último debriefing)"],
    "pending_actions": ["(ações do plano anterior ainda não executadas)"]
  }
}

REGRAS:
- Mínimo 3 strengths e 3 weaknesses
- Mínimo 5 ações no action_plan, priorizadas de 1 a N
- Seja ESPECÍFICO com números e métricas reais dos dados
- Adapte a análise ao tipo de estratégia (${project?.strategy || "perpetuo"})
- Para lançamentos, analise fases (pré-lançamento, abertura, carrinho aberto, fechamento)
- Foque em insights ACIONÁVEIS para infoprodutores brasileiros
- Se houver debriefing anterior, compare evolução e verifique se ações foram executadas`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um consultor estratégico sênior especialista em infoprodutos digitais no Brasil. Analise dados com profundidade e forneça recomendações práticas e específicas. Responda SOMENTE com JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + status);
    }

    const aiData = await aiResp.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      throw new Error("Erro ao processar resposta da IA");
    }

    // Return combined result
    const result = {
      overall_score: parsed.overall_score || 50,
      summary: parsed.summary || "",
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      action_plan: parsed.action_plan || [],
      comparison_with_previous: parsed.comparison_with_previous || null,
      metrics_snapshot: metricsSnapshot,
      strategy: project?.strategy || "perpetuo",
      period_start: startDate,
      period_end: endDate,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Debriefing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
