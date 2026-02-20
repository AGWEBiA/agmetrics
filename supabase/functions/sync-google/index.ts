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

    const today = new Date();
    const since = new Date(today);
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().split("T")[0];
    const untilStr = today.toISOString().split("T")[0];

    const customerId = creds.customer_id.replace(/-/g, "");
    const devToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";
    const headers = {
      Authorization: `Bearer ${access_token}`,
      "developer-token": devToken,
      "Content-Type": "application/json",
    };

    // Main metrics query
    const mainQuery = `
      SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks,
             metrics.conversions, metrics.cost_per_conversion, metrics.ctr, metrics.average_cpc
      FROM customer
      WHERE segments.date BETWEEN '${sinceStr}' AND '${untilStr}'
    `;

    const googleRes = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
      { method: "POST", headers, body: JSON.stringify({ query: mainQuery }) }
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
          .upsert({
            project_id, date, investment, impressions, clicks,
            conversions: Math.round(conversions),
            cpc: clicks > 0 ? investment / clicks : 0,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            conversion_rate: clicks > 0 ? (conversions / clicks) * 100 : 0,
            cost_per_conversion: conversions > 0 ? investment / conversions : 0,
            last_updated: new Date().toISOString(),
          }, { onConflict: "project_id,date" });
        if (!error) synced++;
      }
    }

    // === Demographics ===
    const demoQueries = [
      {
        type: "age_gender",
        query: `SELECT ad_group_criterion.age_range_type, ad_group_criterion.gender_type,
                       metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
                FROM gender_view WHERE segments.date BETWEEN '${sinceStr}' AND '${untilStr}'`,
      },
      {
        type: "device",
        query: `SELECT segments.device, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
                FROM customer WHERE segments.date BETWEEN '${sinceStr}' AND '${untilStr}'`,
      },
      {
        type: "location",
        query: `SELECT campaign_criterion.location.geo_target_constant,
                       geo_target_constant.canonical_name, geo_target_constant.target_type,
                       metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
                FROM location_view WHERE segments.date BETWEEN '${sinceStr}' AND '${untilStr}'`,
      },
    ];

    let demoSynced = 0;

    for (const dq of demoQueries) {
      try {
        const dRes = await fetch(
          `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
          { method: "POST", headers, body: JSON.stringify({ query: dq.query }) }
        );
        if (!dRes.ok) { console.error(`Google demo ${dq.type} error:`, await dRes.text()); continue; }
        const dData = await dRes.json();
        const dResults = Array.isArray(dData) ? dData : [dData];

        const aggMap = new Map<string, any>();

        for (const batch of dResults) {
          for (const row of (batch.results || [])) {
            let d1 = "", d2 = "";
            if (dq.type === "age_gender") {
              d1 = (row.adGroupCriterion?.ageRangeType || "UNKNOWN").replace("AGE_RANGE_", "");
              d2 = (row.adGroupCriterion?.genderType || "UNKNOWN").replace("GENDER_", "").toLowerCase();
            } else if (dq.type === "device") {
              d1 = (row.segments?.device || "UNKNOWN").toLowerCase();
              d2 = "";
            } else if (dq.type === "location") {
              const canonicalName = row.geoTargetConstant?.canonicalName || "";
              const targetType = row.geoTargetConstant?.targetType || "";
              // Extract region/state name from canonical name (e.g. "Sao Paulo,Sao Paulo,Brazil" -> "Sao Paulo")
              const parts = canonicalName.split(",").map((s: string) => s.trim());
              d1 = parts.length >= 2 ? parts[parts.length - 2] : (parts[0] || "unknown");
              d2 = "";
            }

            const key = `${d1}||${d2}`;
            if (!aggMap.has(key)) {
              aggMap.set(key, { d1, d2, spend: 0, impressions: 0, clicks: 0, conversions: 0 });
            }
            const agg = aggMap.get(key)!;
            agg.spend += parseInt(row.metrics?.costMicros || "0") / 1_000_000;
            agg.impressions += parseInt(row.metrics?.impressions || "0");
            agg.clicks += parseInt(row.metrics?.clicks || "0");
            agg.conversions += parseFloat(row.metrics?.conversions || "0");
          }
        }

        for (const [, val] of aggMap) {
          const { error } = await supabase
            .from("ad_demographics")
            .upsert({
              project_id,
              platform: "google",
              breakdown_type: dq.type,
              dimension_1: val.d1,
              dimension_2: val.d2 || "",
              spend: val.spend,
              impressions: val.impressions,
              clicks: val.clicks,
              conversions: Math.round(val.conversions),
              date_start: sinceStr,
              date_end: untilStr,
              last_updated: new Date().toISOString(),
            }, { onConflict: "project_id,platform,breakdown_type,dimension_1,dimension_2,date_start" });
          if (!error) demoSynced++;
        }
      } catch (e) {
        console.error(`Google demo ${dq.type} exception:`, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced, demographics_synced: demoSynced }),
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
