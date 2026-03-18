import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { project_id } = await req.json();
    if (!project_id || typeof project_id !== "string" || project_id.length < 32) {
      return new Response(JSON.stringify({ error: "Invalid project_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get project AG Sell credentials
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("agsell_api_key, agsell_base_url")
      .eq("id", project_id)
      .single();

    if (projErr || !project?.agsell_api_key) {
      return new Response(
        JSON.stringify({ error: "AG Sell credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = project.agsell_api_key;
    const baseUrl =
      project.agsell_base_url ||
      "https://gmemxbfibakfpsjbsvyt.supabase.co/functions/v1/public-api";

    const endpoints = [
      { type: "overview", path: "/metrics/overview?period=30d" },
      { type: "email", path: "/metrics/email?period=30d" },
      { type: "leads", path: "/metrics/leads?period=30d" },
      { type: "pipeline", path: "/metrics/pipeline?period=30d" },
      { type: "automations", path: "/metrics/automations?period=30d" },
      { type: "forms", path: "/metrics/forms?period=30d" },
    ];

    const results: Record<string, unknown> = {};

    for (const ep of endpoints) {
      try {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        });
        if (res.ok) {
          results[ep.type] = await res.json();
        } else {
          results[ep.type] = { error: `HTTP ${res.status}` };
        }
      } catch (e) {
        results[ep.type] = { error: e instanceof Error ? e.message : "Unknown" };
      }
    }

    // Upsert metrics into custom_api_metrics
    for (const [metricType, data] of Object.entries(results)) {
      // Delete existing then insert
      await supabase
        .from("custom_api_metrics")
        .delete()
        .eq("project_id", project_id)
        .eq("metric_type", `agsell_${metricType}`);

      await supabase.from("custom_api_metrics").insert({
        project_id,
        metric_type: `agsell_${metricType}`,
        data: data as Record<string, unknown>,
        period: "30d",
      });
    }

    return new Response(
      JSON.stringify({ success: true, synced: Object.keys(results).length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-agsell error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
