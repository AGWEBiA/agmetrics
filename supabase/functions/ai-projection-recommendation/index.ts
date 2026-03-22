import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { historicalData, simulationResult } = await req.json();

    if (!simulationResult || !historicalData) {
      return new Response(JSON.stringify({ error: "Missing data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { scenarios, summary, sensitivityMatrix } = simulationResult;

    const projectsSummary = historicalData.map((d: any) =>
      `- ${d.projectName}: Receita ${d.totalRevenue.toFixed(0)}, ${d.totalSales} vendas, Ticket ${d.avgTicket.toFixed(0)}, CPA ${d.avgCPA.toFixed(0)}, Reembolso ${(d.refundRate * 100).toFixed(1)}%, Conversão ${(d.conversionRate * 100).toFixed(1)}%`
    ).join("\n");

    const prompt = `Você é um consultor estratégico de negócios digitais. Analise os dados abaixo e forneça recomendações acionáveis em português brasileiro.

## Dados Históricos dos Projetos
${projectsSummary}

## Resultados da Simulação Monte Carlo (2.000 iterações)
- Receita Média Projetada: R$ ${summary.avgRevenue.toFixed(0)}
- Lucro Médio: R$ ${summary.avgProfit.toFixed(0)}
- ROI Médio: ${summary.avgROI.toFixed(1)}%
- Probabilidade de Sucesso: ${summary.successProbability.toFixed(1)}%
- Break-even Médio: ${summary.avgBreakEvenDays.toFixed(0)} dias

## Cenários
- Pessimista (P10): Receita R$ ${scenarios.pessimistic.revenue.toFixed(0)}, Lucro R$ ${scenarios.pessimistic.profit.toFixed(0)}
- Realista (P50): Receita R$ ${scenarios.realistic.revenue.toFixed(0)}, Lucro R$ ${scenarios.realistic.profit.toFixed(0)}
- Otimista (P75): Receita R$ ${scenarios.optimistic.revenue.toFixed(0)}, Lucro R$ ${scenarios.optimistic.profit.toFixed(0)}
- Milionário (P95): Receita R$ ${scenarios.millionaire.revenue.toFixed(0)}, Lucro R$ ${scenarios.millionaire.profit.toFixed(0)}

## Análise de Sensibilidade
${sensitivityMatrix.map((s: any) => `- ${s.variable}: impacto de ${s.impactOnRevenue.toFixed(1)}% na receita`).join("\n")}

Forneça:
1. **Diagnóstico Geral** (2-3 linhas)
2. **Cenário Recomendado** e por quê
3. **3 Ações Prioritárias** para maximizar resultado
4. **Riscos Principais** e como mitigá-los
5. **Estratégia de Preço** baseada na sensibilidade

Seja direto, prático e use dados concretos nas recomendações.`;

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status);
      return new Response(JSON.stringify({ recommendation: "Erro ao consultar IA. Tente novamente." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const recommendation = aiData.choices?.[0]?.message?.content || "Sem recomendação disponível.";

    return new Response(JSON.stringify({ recommendation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
