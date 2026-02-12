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

    // Get ALL Meta credentials for this project
    const { data: allCreds } = await supabase
      .from("meta_credentials")
      .select("*")
      .eq("project_id", project_id);

    if (!allCreds || allCreds.length === 0) {
      return new Response(JSON.stringify({ error: "Meta credentials not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const since = new Date(today);
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().split("T")[0];
    const untilStr = today.toISOString().split("T")[0];

    const fields = [
      "date_start", "spend", "impressions", "clicks", "actions",
      "cost_per_action_type", "cpm", "cpc", "ctr",
    ].join(",");

    // Aggregate data across all accounts into a single date map
    const dateMap = new Map<string, any>();
    let totalAccountsSynced = 0;

    for (const creds of allCreds) {
      // Get selected campaigns for this credential
      const { data: selectedCampaigns } = await supabase
        .from("meta_campaigns")
        .select("campaign_id")
        .eq("project_id", project_id)
        .eq("credential_id", creds.id)
        .eq("is_selected", true);

      const campaignIds = (selectedCampaigns || []).map((c: any) => c.campaign_id);
      const hasFilter = campaignIds.length > 0;

      let rows: any[] = [];

      if (hasFilter) {
        // Fetch per selected campaign
        for (const cid of campaignIds) {
          const url = `https://graph.facebook.com/v21.0/${cid}/insights?fields=${fields}&time_range={"since":"${sinceStr}","until":"${untilStr}"}&time_increment=1&access_token=${creds.access_token}&limit=100`;
          const metaRes = await fetch(url);
          if (!metaRes.ok) {
            console.error(`Campaign ${cid} fetch error:`, await metaRes.text());
            continue;
          }
          const metaData = await metaRes.json();
          rows.push(...(metaData.data || []));
        }
      } else {
        // No filter: fetch account-level
        const url = `https://graph.facebook.com/v21.0/${creds.ad_account_id}/insights?fields=${fields}&time_range={"since":"${sinceStr}","until":"${untilStr}"}&time_increment=1&level=account&access_token=${creds.access_token}&limit=100`;
        const metaRes = await fetch(url);
        if (!metaRes.ok) {
          console.error(`Account ${creds.ad_account_id} error:`, await metaRes.text());
          continue;
        }
        const metaData = await metaRes.json();
        rows = metaData.data || [];
      }

      // Aggregate rows into dateMap
      for (const row of rows) {
        const date = row.date_start;
        if (!dateMap.has(date)) {
          dateMap.set(date, { date_start: date, spend: 0, impressions: 0, clicks: 0, actions: [] });
        }
        const agg = dateMap.get(date)!;
        agg.spend += parseFloat(row.spend || "0");
        agg.impressions += parseInt(row.impressions || "0");
        agg.clicks += parseInt(row.clicks || "0");
        for (const action of (row.actions || [])) {
          const existing = agg.actions.find((a: any) => a.action_type === action.action_type);
          if (existing) {
            existing.value = String(parseInt(existing.value) + parseInt(action.value));
          } else {
            agg.actions.push({ ...action });
          }
        }
      }

      totalAccountsSynced++;
    }

    const allRows = Array.from(dateMap.values());
    let synced = 0;

    for (const row of allRows) {
      const actions = row.actions || [];
      const getAction = (type: string) => {
        const a = actions.find((a: any) => a.action_type === type);
        return a ? parseInt(a.value) : 0;
      };

      const leads = getAction("lead") + getAction("offsite_conversion.fb_pixel_lead");
      const purchases = getAction("purchase") + getAction("offsite_conversion.fb_pixel_purchase");
      const results = getAction("offsite_conversion.fb_pixel_custom") || leads || purchases;
      const linkClicks = getAction("link_click");
      const lpViews = getAction("landing_page_view");
      const checkouts = getAction("offsite_conversion.fb_pixel_initiate_checkout") + getAction("initiate_checkout");

      const investment = typeof row.spend === "number" ? row.spend : parseFloat(row.spend || "0");
      const impressions = typeof row.impressions === "number" ? row.impressions : parseInt(row.impressions || "0");
      const clicks = typeof row.clicks === "number" ? row.clicks : parseInt(row.clicks || "0");

      const { error } = await supabase
        .from("meta_metrics")
        .upsert(
          {
            project_id,
            date: row.date_start,
            investment,
            impressions,
            clicks,
            leads,
            results: results || leads,
            purchases,
            link_clicks: linkClicks,
            landing_page_views: lpViews,
            checkouts_initiated: checkouts,
            cpm: impressions > 0 ? (investment / impressions) * 1000 : 0,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            cpc: clicks > 0 ? investment / clicks : 0,
            cost_per_lead: leads > 0 ? investment / leads : 0,
            cost_per_result: (results || leads) > 0 ? investment / (results || leads) : 0,
            cost_per_purchase: purchases > 0 ? investment / purchases : 0,
            link_ctr: impressions > 0 ? (linkClicks / impressions) * 100 : 0,
            link_cpc: linkClicks > 0 ? investment / linkClicks : 0,
            connect_rate: linkClicks > 0 ? (lpViews / linkClicks) * 100 : 0,
            page_conversion_rate: lpViews > 0 ? (checkouts / lpViews) * 100 : 0,
            checkout_conversion_rate: checkouts > 0 ? (purchases / checkouts) * 100 : 0,
            last_updated: new Date().toISOString(),
          },
          { onConflict: "project_id,date" }
        );

      if (!error) synced++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        total: allRows.length,
        accounts_synced: totalAccountsSynced,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Meta sync error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
