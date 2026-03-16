import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-source, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const METRIC_LABELS: Record<string, string> = {
  investment: "💰 Investimento",
  revenue: "💵 Faturamento",
  sales: "🛒 Vendas",
  roi: "📈 ROI",
  leads: "👥 Leads",
  cpl: "💲 CPL",
  cpc: "🖱️ CPC",
  ctr: "📊 CTR",
  impressions: "👁️ Impressões",
  clicks: "🔗 Cliques",
  purchases: "🎯 Compras",
  cost_per_purchase: "💸 Custo/Compra",
  avg_ticket: "🎫 Ticket Médio",
  refunds: "↩️ Reembolsos",
};

function formatCurrency(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

function formatPct(v: number): string {
  return `${v.toFixed(2).replace(".", ",")}%`;
}

function formatNum(v: number): string {
  return v.toLocaleString("pt-BR");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Support both manual (single project) and cron (all active configs)
    let configs: any[] = [];
    let body: any = {};

    try {
      body = await req.json();
    } catch { /* empty body for cron */ }

    if (body.config_id) {
      const { data } = await supabase
        .from("whatsapp_report_configs")
        .select("*")
        .eq("id", body.config_id)
        .eq("is_active", true)
        .single();
      if (data) configs = [data];
    } else if (body.project_id) {
      const { data } = await supabase
        .from("whatsapp_report_configs")
        .select("*")
        .eq("project_id", body.project_id)
        .eq("is_active", true);
      configs = data || [];
    } else {
      // Cron mode: get all active configs due now
      const now = new Date();
      const currentHour = parseInt(
        now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false })
      );
      const { data } = await supabase
        .from("whatsapp_report_configs")
        .select("*")
        .eq("is_active", true)
        .eq("send_hour", currentHour);
      configs = (data || []).filter((c: any) => {
        if (!c.last_sent_at) return true;
        const lastSent = new Date(c.last_sent_at);
        const diffHours = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        if (c.frequency === "daily") return diffHours >= 20;
        if (c.frequency === "weekly") return diffHours >= 160;
        if (c.frequency === "monthly") return diffHours >= 680;
        return false;
      });
    }

    let sent = 0;
    for (const config of configs) {
      try {
        // Get project info
        const { data: project } = await supabase
          .from("projects")
          .select("*")
          .eq("id", config.project_id)
          .single();
        if (!project) continue;

        // Get metrics data (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sinceStr = thirtyDaysAgo.toISOString().split("T")[0];

        const [salesRes, metaRes] = await Promise.all([
          supabase
            .from("sales_events")
            .select("*")
            .eq("project_id", config.project_id)
            .eq("is_ignored", false)
            .gte("sale_date", sinceStr),
          supabase
            .from("meta_metrics")
            .select("*")
            .eq("project_id", config.project_id)
            .gte("date", sinceStr),
        ]);

        const sales = salesRes.data || [];
        const metaMetrics = metaRes.data || [];

        // Compute metrics
        const approvedSales = sales.filter((s: any) => s.status === "approved");
        const revenue = approvedSales.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
        const totalSales = approvedSales.length;
        const investment = metaMetrics.reduce((sum: number, m: any) => sum + Number(m.investment || 0), 0);
        const impressions = metaMetrics.reduce((sum: number, m: any) => sum + Number(m.impressions || 0), 0);
        const clicks = metaMetrics.reduce((sum: number, m: any) => sum + Number(m.clicks || 0), 0);
        const leads = metaMetrics.reduce((sum: number, m: any) => sum + Number(m.leads || 0), 0);
        const purchases = metaMetrics.reduce((sum: number, m: any) => sum + Number(m.purchases || 0), 0);
        const roi = investment > 0 ? ((revenue - investment) / investment) * 100 : 0;
        const cpl = leads > 0 ? investment / leads : 0;
        const cpc = clicks > 0 ? investment / clicks : 0;
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const costPerPurchase = purchases > 0 ? investment / purchases : 0;
        const avgTicket = totalSales > 0 ? revenue / totalSales : 0;
        const refunds = sales.filter((s: any) => s.status === "refunded").length;

        const metricsValues: Record<string, string> = {
          investment: formatCurrency(investment),
          revenue: formatCurrency(revenue),
          sales: formatNum(totalSales),
          roi: formatPct(roi),
          leads: formatNum(leads),
          cpl: formatCurrency(cpl),
          cpc: formatCurrency(cpc),
          ctr: formatPct(ctr),
          impressions: formatNum(impressions),
          clicks: formatNum(clicks),
          purchases: formatNum(purchases),
          cost_per_purchase: formatCurrency(costPerPurchase),
          avg_ticket: formatCurrency(avgTicket),
          refunds: formatNum(refunds),
        };

        // Build message
        const selectedMetrics = (config.metrics as string[]) || [];
        const freqLabel = config.frequency === "daily" ? "Diário" : config.frequency === "weekly" ? "Semanal" : "Mensal";
        let message = `📊 *Relatório ${freqLabel} — ${project.name}*\n`;
        message += `📅 Últimos 30 dias\n\n`;

        for (const key of selectedMetrics) {
          const label = METRIC_LABELS[key] || key;
          const value = metricsValues[key] || "—";
          message += `${label}: *${value}*\n`;
        }

        message += `\n_Enviado automaticamente pelo AGMetrics_`;

        // Send via Evolution API
        if (project.evolution_api_url && project.evolution_api_key && project.evolution_instance_name) {
          const phone = config.phone_number.replace(/\D/g, "");
          const evolutionUrl = `${project.evolution_api_url}/message/sendText/${project.evolution_instance_name}`;

          const sendRes = await fetch(evolutionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: project.evolution_api_key,
            },
            body: JSON.stringify({
              number: phone,
              text: message,
            }),
          });

          if (sendRes.ok) {
            sent++;
            await supabase
              .from("whatsapp_report_configs")
              .update({ last_sent_at: new Date().toISOString() })
              .eq("id", config.id);
          } else {
            console.error(`[send-whatsapp-report] Send failed for config ${config.id}:`, await sendRes.text());
          }
        } else {
          console.warn(`[send-whatsapp-report] Evolution API not configured for project ${config.project_id}`);
        }
      } catch (e) {
        console.error(`[send-whatsapp-report] Error processing config ${config.id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, total: configs.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-whatsapp-report] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
