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

    // Collect project data in parallel
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString().slice(0, 10);

    const [
      { data: project },
      { data: salesRecent },
      { data: salesPrev },
      { data: metaMetrics },
      { data: googleMetrics },
      { data: topAds },
      { data: leadEvents },
      { data: goals },
      { data: products },
    ] = await Promise.all([
      supabase.from("projects").select("name, strategy, budget, start_date, end_date, cart_open_date, description").eq("id", project_id).single(),
      supabase.from("sales_events").select("amount, status, product_name, product_type, payment_method, buyer_state, sale_date, tracking_src, tracking_sck, utm_source, utm_medium, utm_campaign").eq("project_id", project_id).eq("is_ignored", false).gte("sale_date", thirtyDaysAgo).order("sale_date", { ascending: false }).limit(500),
      supabase.from("sales_events").select("amount, status, sale_date").eq("project_id", project_id).eq("is_ignored", false).gte("sale_date", sixtyDaysAgo).lt("sale_date", thirtyDaysAgo).limit(500),
      supabase.from("meta_metrics").select("date, investment, impressions, clicks, leads, purchases, ctr, cpc, cpm, link_clicks, landing_page_views, checkouts_initiated").eq("project_id", project_id).gte("date", thirtyDaysAgo).order("date", { ascending: false }).limit(30),
      supabase.from("google_metrics").select("date, investment, impressions, clicks, conversions, ctr, cpc").eq("project_id", project_id).gte("date", thirtyDaysAgo).order("date", { ascending: false }).limit(30),
      supabase.from("meta_ads").select("ad_id, ad_name, spend, impressions, clicks, link_clicks, purchases, leads, cpc, ctr, hook_rate, hold_rate, landing_page_views, checkouts_initiated").eq("project_id", project_id).order("spend", { ascending: false }).limit(15),
      supabase.from("lead_events").select("event_type, event_source, utm_source, utm_medium, utm_campaign, amount, event_date").eq("project_id", project_id).gte("event_date", thirtyDaysAgo).limit(300),
      supabase.from("project_goals").select("type, target_value, period").eq("project_id", project_id).eq("is_active", true),
      supabase.from("products").select("name, type, platform, price").eq("project_id", project_id),
    ]);

    // Summarize data for the prompt
    const approvedSales = (salesRecent || []).filter(s => s.status === "approved");
    const refundedSales = (salesRecent || []).filter(s => s.status === "refunded");
    const prevApproved = (salesPrev || []).filter(s => s.status === "approved");
    const totalRevenue = approvedSales.reduce((s, v) => s + (v.amount || 0), 0);
    const prevRevenue = prevApproved.reduce((s, v) => s + (v.amount || 0), 0);
    const totalInvestment = (metaMetrics || []).reduce((s, v) => s + (v.investment || 0), 0) + (googleMetrics || []).reduce((s, v) => s + (v.investment || 0), 0);
    const totalClicks = (metaMetrics || []).reduce((s, v) => s + (v.clicks || 0), 0) + (googleMetrics || []).reduce((s, v) => s + (v.clicks || 0), 0);
    const totalImpressions = (metaMetrics || []).reduce((s, v) => s + (v.impressions || 0), 0) + (googleMetrics || []).reduce((s, v) => s + (v.impressions || 0), 0);
    const totalLeads = (metaMetrics || []).reduce((s, v) => s + (v.leads || 0), 0);
    const totalPurchases = (metaMetrics || []).reduce((s, v) => s + (v.purchases || 0), 0);
    const totalLPViews = (metaMetrics || []).reduce((s, v) => s + (v.landing_page_views || 0), 0);
    const totalCheckouts = (metaMetrics || []).reduce((s, v) => s + (v.checkouts_initiated || 0), 0);

    // Payment methods distribution
    const paymentMethods: Record<string, number> = {};
    approvedSales.forEach(s => { paymentMethods[s.payment_method || "unknown"] = (paymentMethods[s.payment_method || "unknown"] || 0) + 1; });

    // UTM sources distribution
    const utmSources: Record<string, number> = {};
    approvedSales.filter(s => s.utm_source).forEach(s => { utmSources[s.utm_source!] = (utmSources[s.utm_source!] || 0) + 1; });

    // Top states
    const states: Record<string, number> = {};
    approvedSales.filter(s => s.buyer_state).forEach(s => { states[s.buyer_state!] = (states[s.buyer_state!] || 0) + 1; });
    const topStates = Object.entries(states).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Ad performance summary
    const adsSummary = (topAds || []).slice(0, 10).map(a => ({
      name: a.ad_name,
      spend: a.spend,
      clicks: a.link_clicks || a.clicks,
      purchases: a.purchases,
      leads: a.leads,
      cpc: a.cpc,
      ctr: a.ctr,
      hook_rate: a.hook_rate,
      hold_rate: a.hold_rate,
      lpv: a.landing_page_views,
      checkouts: a.checkouts_initiated,
    }));

    const roi = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment * 100) : 0;
    const roas = totalInvestment > 0 ? (totalRevenue / totalInvestment) : 0;
    const cpa = approvedSales.length > 0 ? (totalInvestment / approvedSales.length) : 0;
    const refundRate = approvedSales.length > 0 ? (refundedSales.length / (approvedSales.length + refundedSales.length) * 100) : 0;

    // Product analysis
    const mainProducts = (products || []).filter(p => p.type === "main");
    const orderBumps = (products || []).filter(p => p.type === "order_bump");
    const hasOrderBump = orderBumps.length > 0;

    // Sales by product type
    const salesByProduct: Record<string, { count: number; revenue: number; type: string }> = {};
    approvedSales.forEach(s => {
      const key = s.product_name || "Desconhecido";
      if (!salesByProduct[key]) salesByProduct[key] = { count: 0, revenue: 0, type: s.product_type || "main" };
      salesByProduct[key].count++;
      salesByProduct[key].revenue += (s.amount || 0);
    });

    // Order bump adoption rate
    const mainSalesCount = approvedSales.filter(s => s.product_type === "main" || !s.product_type).length;
    const bumpSalesCount = approvedSales.filter(s => s.product_type === "order_bump").length;
    const bumpAdoptionRate = mainSalesCount > 0 ? (bumpSalesCount / mainSalesCount * 100) : 0;

    // Strategy-specific context
    const strategyLabels: Record<string, string> = {
      perpetuo: "Perpétuo (vendas contínuas, sem data de encerramento)",
      lancamento: "Lançamento (captação de leads → evento → abertura de carrinho por tempo limitado)",
      lancamento_pago: "Lançamento Pago (venda de ingressos baratos → workshop/evento → venda do produto principal de maior valor)",
      funis: "Funis (sequência automatizada de páginas e ofertas)",
      evento_presencial: "Evento Presencial (vendas de ingressos + upsells no evento)",
    };
    const strategyDescription = strategyLabels[project?.strategy || ""] || project?.strategy || "N/A";

    // Days context for launches
    let launchContext = "";
    if (project?.strategy && project.strategy !== "perpetuo") {
      if (project.cart_open_date) {
        const cartDate = new Date(project.cart_open_date);
        const now = new Date();
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
Orçamento: R$ ${project?.budget || "N/A"}${launchContext}
Período de análise: últimos 30 dias

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
${adsSummary.map(a => `- ${a.name}: Gasto R$${(a.spend||0).toFixed(2)}, Cliques ${a.clicks||0}, Compras ${a.purchases||0}, Leads ${a.leads||0}, CPC R$${(a.cpc||0).toFixed(2)}, CTR ${(a.ctr||0).toFixed(2)}%, Hook ${(a.hook_rate||0).toFixed(1)}%, Hold ${(a.hold_rate||0).toFixed(1)}%, LPV ${a.lpv||0}, Checkouts ${a.checkouts||0}`).join("\n")}

## Fontes de Tráfego (UTM)
${Object.entries(utmSources).sort((a,b) => b[1]-a[1]).slice(0,5).map(([k,v]) => `- ${k}: ${v} vendas`).join("\n") || "Sem dados de UTM"}

## Métodos de Pagamento
${Object.entries(paymentMethods).sort((a,b) => b[1]-a[1]).map(([k,v]) => `- ${k}: ${v}`).join("\n")}

## Top Estados
${topStates.map(([k,v]) => `- ${k}: ${v} vendas`).join("\n") || "Sem dados"}

## Metas Ativas
${(goals || []).map(g => `- ${g.type} ${g.period}: ${g.target_value}`).join("\n") || "Nenhuma meta definida"}
`;

    const systemPrompt = `Você é um consultor especialista em marketing digital, performance de anúncios e otimização de conversões para infoprodutos no mercado brasileiro. 

Analise os dados fornecidos e gere insights acionáveis organizados nas seguintes categorias. Para CADA insight, inclua:
- Um título curto e impactante
- Uma análise detalhada do que os dados mostram
- Ações concretas e específicas a serem tomadas
- O impacto estimado (alto/médio/baixo)
- A prioridade (urgente/importante/oportunidade)

Responda EXCLUSIVAMENTE usando a function tool "generate_insights" fornecida. Gere entre 5 e 10 insights de alta qualidade.

CONTEXTO ESTRATÉGICO IMPORTANTE — adapte sua análise conforme a estratégia do projeto:

1. **Perpétuo**: Foco em otimização contínua de CPA, escala de anúncios, retenção e LTV. Analise tendências de longo prazo.

2. **Lançamento**: As métricas-chave são CPL (Custo por Lead), volume de leads captados, e preparação para a abertura do carrinho. Antes da abertura, o foco é captação; após, é conversão de leads em vendas.

3. **Lançamento Pago**: Os números INICIAIS são de vendas de INGRESSOS (produtos baratos, R$47-R$197). O produto principal (mais caro) será vendido DURANTE o workshop/evento. Analise: taxa de conversão de ingresso, CPA do ingresso vs preço, projeção de receita do produto principal baseada na taxa de conversão típica de 5-15% dos participantes.

4. **Funis**: Analise cada etapa do funil separadamente. Identifique onde estão os maiores vazamentos e oportunidades de otimização.

5. **Evento Presencial**: Similar ao lançamento pago — ingressos são o front-end, upsells e vendas no evento são o back-end.

ANÁLISE DE PRODUTOS:
- Se não há Order Bump cadastrado, sugira URGENTEMENTE a criação de um (potencial de +15-30% no ticket médio)
- Se há Order Bump, analise a taxa de adoção (benchmark: 20-40% é bom, abaixo de 15% precisa otimizar)
- Compare o ticket médio real vs preço cadastrado para identificar oportunidades
- Para lançamento pago: analise a relação preço do ingresso vs investimento em ads

CATEGORIA "produtos" — OBRIGATÓRIA:
- Sempre gere pelo menos 1 insight na categoria "produtos"
- Sugira criação de Order Bumps se não existem (potencial +15-30% ticket médio)
- Analise precificação: compare ticket médio real vs preço cadastrado
- Sugira Downsells para recuperar vendas perdidas (ex: versão simplificada, parcelamento estendido)
- Para lançamento pago: analise a relação preço do ingresso vs valor percebido vs CPA
- Sugira upsells pós-compra e cross-sells entre produtos
- Analise se a estrutura de produtos está otimizada para maximizar LTV

Regras:
- Seja específico: cite números, anúncios por nome, percentuais reais
- Priorize insights com maior potencial de impacto em receita
- Considere benchmarks do mercado brasileiro de infoprodutos
- Se alguma métrica estiver zerada ou ausente, sugira como começar a rastrear
- Analise o funil completo: impressão → clique → LP → checkout → compra
- Identifique gargalos no funil e oportunidades de otimização
- Adapte completamente sua análise à estratégia do projeto`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
                          enum: ["vendas", "anuncios", "funil", "leads", "financeiro", "tracking", "produtos"]
                        },
                        title: { type: "string" },
                        analysis: { type: "string" },
                        actions: {
                          type: "array",
                          items: { type: "string" }
                        },
                        impact: {
                          type: "string",
                          enum: ["alto", "medio", "baixo"]
                        },
                        priority: {
                          type: "string",
                          enum: ["urgente", "importante", "oportunidade"]
                        },
                        metric_reference: {
                          type: "string",
                          description: "A métrica principal relacionada a este insight"
                        }
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
