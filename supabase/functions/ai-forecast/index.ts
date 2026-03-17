import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { project_id, days = 14 } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch historical sales data (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: sales } = await supabase
      .from("sales_events")
      .select("amount, sale_date, status")
      .eq("project_id", project_id)
      .eq("is_ignored", false)
      .eq("status", "approved")
      .gte("sale_date", ninetyDaysAgo.toISOString())
      .order("sale_date", { ascending: true });

    // Fetch historical meta metrics
    const { data: metaMetrics } = await supabase
      .from("meta_metrics")
      .select("date, investment, leads, impressions, clicks")
      .eq("project_id", project_id)
      .gte("date", ninetyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: true });

    // Fetch historical google metrics
    const { data: googleMetrics } = await supabase
      .from("google_metrics")
      .select("date, investment, clicks, impressions")
      .eq("project_id", project_id)
      .gte("date", ninetyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: true });

    // Aggregate daily data
    const dailyMap = new Map<string, { revenue: number; sales: number; investment: number; leads: number }>();

    (sales || []).forEach((s: any) => {
      const day = s.sale_date ? s.sale_date.split("T")[0] : null;
      if (!day) return;
      const existing = dailyMap.get(day) || { revenue: 0, sales: 0, investment: 0, leads: 0 };
      existing.revenue += Number(s.amount || 0);
      existing.sales += 1;
      dailyMap.set(day, existing);
    });

    (metaMetrics || []).forEach((m: any) => {
      const existing = dailyMap.get(m.date) || { revenue: 0, sales: 0, investment: 0, leads: 0 };
      existing.investment += Number(m.investment || 0);
      existing.leads += Number(m.leads || 0);
      dailyMap.set(m.date, existing);
    });

    (googleMetrics || []).forEach((g: any) => {
      const existing = dailyMap.get(g.date) || { revenue: 0, sales: 0, investment: 0, leads: 0 };
      existing.investment += Number(g.investment || 0);
      dailyMap.set(g.date, existing);
    });

    // Sort by date
    const sortedDays = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    if (sortedDays.length < 7) {
      return new Response(
        JSON.stringify({ error: "Dados insuficientes. Necessário mínimo 7 dias de dados históricos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt for AI forecasting
    const recentData = sortedDays.slice(-30);
    const csvData = recentData.map(d =>
      `${d.date},${d.revenue.toFixed(2)},${d.sales},${d.investment.toFixed(2)},${d.leads}`
    ).join("\n");

    const totalRevenue = recentData.reduce((s, d) => s + d.revenue, 0);
    const totalSales = recentData.reduce((s, d) => s + d.sales, 0);
    const totalInvestment = recentData.reduce((s, d) => s + d.investment, 0);
    const avgDailyRevenue = totalRevenue / recentData.length;
    const avgDailySales = totalSales / recentData.length;

    const prompt = `Você é um analista de dados especializado em infoprodutos digitais. Analise os dados históricos e faça previsões para os próximos ${days} dias.

DADOS HISTÓRICOS (date,revenue,sales,investment,leads):
${csvData}

RESUMO:
- Período: ${recentData.length} dias
- Receita total: R$${totalRevenue.toFixed(2)}
- Vendas totais: ${totalSales}
- Investimento total: R$${totalInvestment.toFixed(2)}
- Média diária receita: R$${avgDailyRevenue.toFixed(2)}
- Média diária vendas: ${avgDailySales.toFixed(1)}

Responda APENAS com JSON válido no formato:
{
  "forecast": [
    {"date": "YYYY-MM-DD", "revenue": number, "sales": number, "investment": number, "confidence": number}
  ],
  "summary": {
    "projected_revenue": number,
    "projected_sales": number,
    "projected_roi": number,
    "trend": "up" | "down" | "stable",
    "confidence": number,
    "insights": ["string"]
  }
}

Regras:
- Considere tendências, sazonalidade (dia da semana) e momentum
- confidence é de 0 a 1
- insights em português, máximo 4 frases curtas
- Projetar investment baseado na média recente
- ROI = ((receita - investimento) / investimento) * 100`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a data analyst. Respond only with valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI API error:", await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let forecast;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        forecast = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (parseErr) {
      console.error("Parse error:", parseErr, "Content:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      historical: sortedDays,
      ...forecast,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Forecast error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
