import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: project } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", project_id)
      .single();
    if (!project || project.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Google credentials
    const { data: creds } = await supabase
      .from("google_credentials")
      .select("*")
      .eq("project_id", project_id)
      .single();

    if (!creds) {
      return new Response(JSON.stringify({ error: "Google credentials not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get access token via refresh token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        refresh_token: creds.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Google token error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to refresh Google token" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { access_token } = await tokenRes.json();

    // Fetch last 30 days
    const today = new Date();
    const since = new Date(today);
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().split("T")[0];
    const untilStr = today.toISOString().split("T")[0];

    const customerId = creds.customer_id.replace(/-/g, "");
    const query = `
      SELECT
        segments.date,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_per_conversion,
        metrics.ctr,
        metrics.average_cpc
      FROM customer
      WHERE segments.date BETWEEN '${sinceStr}' AND '${untilStr}'
    `;

    const googleRes = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "developer-token": Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!googleRes.ok) {
      const errBody = await googleRes.text();
      console.error("Google Ads API error:", errBody);
      return new Response(JSON.stringify({ error: "Google Ads API error", details: errBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const googleData = await googleRes.json();
    let synced = 0;

    // Process stream results
    const results = Array.isArray(googleData) ? googleData : [googleData];
    for (const batch of results) {
      const rows = batch.results || [];
      for (const row of rows) {
        const date = row.segments?.date;
        if (!date) continue;

        const costMicros = parseInt(row.metrics?.cost_micros || "0");
        const investment = costMicros / 1_000_000;
        const impressions = parseInt(row.metrics?.impressions || "0");
        const clicks = parseInt(row.metrics?.clicks || "0");
        const conversions = parseFloat(row.metrics?.conversions || "0");

        const { error } = await supabase
          .from("google_metrics")
          .upsert(
            {
              project_id: project_id,
              date,
              investment,
              impressions,
              clicks,
              conversions: Math.round(conversions),
              cpc: clicks > 0 ? investment / clicks : 0,
              ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
              conversion_rate: clicks > 0 ? (conversions / clicks) * 100 : 0,
              cost_per_conversion: conversions > 0 ? investment / conversions : 0,
              last_updated: new Date().toISOString(),
            },
            { onConflict: "project_id,date" }
          );

        if (!error) synced++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Google sync error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
