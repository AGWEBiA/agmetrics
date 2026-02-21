import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-source",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const syncSource = req.headers.get("x-sync-source");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    // Check if this is an internal cron call (service role key as bearer)
    const token = authHeader.replace("Bearer ", "");
    const isInternalCron = syncSource === "auto-sync-cron" && token === serviceRoleKey;

    let userId: string | null = null;

    if (!isInternalCron) {
      // Normal user auth flow
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const claimsResult = await anonClient.auth.getClaims(token);
      if (claimsResult.data?.claims) {
        userId = claimsResult.data.claims.sub;
      } else {
        const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
        if (authError || !user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = user.id;
      }
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

    // For internal cron calls, skip ownership check (service has full access)
    if (!isInternalCron && userId) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      const isAdmin = roleData?.role === "admin";
      if (!project || (!isAdmin && project.owner_id !== userId)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!isInternalCron) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const adFields = [
      "id", "name", "status", "spend", "impressions", "clicks",
      "actions", "cpm", "ctr", "cpc", "ad_preview_shareable_link",
    ].join(",");

    const dateMap = new Map<string, any>();
    let totalAccountsSynced = 0;

    // Demographic aggregators
    const demoAgeGender = new Map<string, any>();
    const demoDevice = new Map<string, any>();
    const demoPlacement = new Map<string, any>();
    const demoCountry = new Map<string, any>();

    function addDemo(map: Map<string, any>, d1: string, d2: string, row: any) {
      const key = `${d1}||${d2}`;
      if (!map.has(key)) {
        map.set(key, { dimension_1: d1, dimension_2: d2, spend: 0, impressions: 0, clicks: 0, conversions: 0, leads: 0, purchases: 0 });
      }
      const agg = map.get(key)!;
      agg.spend += parseFloat(row.spend || "0");
      agg.impressions += parseInt(row.impressions || "0");
      agg.clicks += parseInt(row.clicks || "0");
      const actions = row.actions || [];
      for (const a of actions) {
        if (a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead") agg.leads += parseInt(a.value);
        if (a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase") agg.purchases += parseInt(a.value);
      }
      agg.conversions = agg.leads + agg.purchases;
    }

    for (const creds of allCreds) {
      const { data: selectedCampaigns } = await supabase
        .from("meta_campaigns")
        .select("campaign_id")
        .eq("project_id", project_id)
        .eq("credential_id", creds.id)
        .eq("is_selected", true);

      const campaignIds = (selectedCampaigns || []).map((c: any) => c.campaign_id);
      const hasFilter = campaignIds.length > 0;
      const adAccountId = creds.ad_account_id.startsWith("act_") ? creds.ad_account_id : `act_${creds.ad_account_id}`;
      const timeRange = `{"since":"${sinceStr}","until":"${untilStr}"}`;

      // === Main metrics ===
      let rows: any[] = [];
      if (hasFilter) {
        for (const cid of campaignIds) {
          const url = `https://graph.facebook.com/v21.0/${cid}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${creds.access_token}&limit=100`;
          const metaRes = await fetch(url);
          if (!metaRes.ok) { console.error(`Campaign ${cid} fetch error:`, await metaRes.text()); continue; }
          const metaData = await metaRes.json();
          rows.push(...(metaData.data || []));
        }
      } else {
        const url = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&level=account&access_token=${creds.access_token}&limit=100`;
        const metaRes = await fetch(url);
        if (!metaRes.ok) { console.error(`Account ${creds.ad_account_id} error:`, await metaRes.text()); continue; }
        const metaData = await metaRes.json();
        rows = metaData.data || [];
      }

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

      // === Demographics: age+gender ===
      const demoFields = "spend,impressions,clicks,actions";
      const breakdowns = [
        { type: "age_gender", breakdown: "age,gender" },
        { type: "device", breakdown: "device_platform" },
        { type: "placement", breakdown: "publisher_platform,platform_position" },
        { type: "location", breakdown: "region" },
      ];

      for (const bd of breakdowns) {
        try {
          const demoUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${demoFields}&time_range=${timeRange}&breakdowns=${bd.breakdown}&access_token=${creds.access_token}&limit=500`;
          const demoRes = await fetch(demoUrl);
          if (!demoRes.ok) { console.error(`Demo ${bd.type} error:`, await demoRes.text()); continue; }
          const demoData = await demoRes.json();
          const demoRows = demoData.data || [];

          const targetMap = bd.type === "age_gender" ? demoAgeGender
            : bd.type === "device" ? demoDevice
            : bd.type === "placement" ? demoPlacement
            : demoCountry;

          for (const dr of demoRows) {
            let d1 = "", d2 = "";
            if (bd.type === "age_gender") { d1 = dr.age || "unknown"; d2 = dr.gender || "unknown"; }
            else if (bd.type === "device") { d1 = dr.device_platform || "unknown"; d2 = ""; }
            else if (bd.type === "placement") { d1 = dr.publisher_platform || "unknown"; d2 = dr.platform_position || ""; }
            else if (bd.type === "location") { d1 = dr.region || "unknown"; d2 = ""; }
            addDemo(targetMap, d1, d2, dr);
          }
        } catch (e) {
          console.error(`Demo ${bd.type} exception:`, e);
        }
      }

      // === Save ads to meta_ads table ===
      try {
        const insightFields = "id,name,status,preview_shareable_link";
        const insightMetrics = "spend,impressions,clicks,actions,video_play_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,ad_id,ad_name";
        
        // Get ads list with preview links
        const adsListUrl = `https://graph.facebook.com/v21.0/${adAccountId}/ads?fields=${insightFields}&limit=200&access_token=${creds.access_token}`;
        const adsListRes = await fetch(adsListUrl);
        
        if (adsListRes.ok) {
          const adsListData = await adsListRes.json();
          const adsList = (adsListData.data || []) as any[];
          
          // Build ad metadata map
          const adMeta = new Map<string, { name: string; status: string; preview_link: string | null }>();
          for (const ad of adsList) {
            // ad_preview_shareable_link can be a string, an array of strings, or an array of {body: string}
            let previewLink: string | null = null;
            const rawLink = ad.preview_shareable_link || ad.ad_preview_shareable_link;
            if (typeof rawLink === "string") {
              previewLink = rawLink;
            } else if (Array.isArray(rawLink) && rawLink.length > 0) {
              const first = rawLink[0];
              previewLink = typeof first === "string" ? first : (first?.body || first?.share_link || null);
            }
            adMeta.set(ad.id, {
              name: ad.name,
              status: ad.status,
              preview_link: previewLink,
            });
          }

          console.log(`[sync-meta] Found ${adsList.length} ads for account ${creds.ad_account_id}, sample preview:`, adsList[0]?.preview_shareable_link);

          // Get insights at ad level
          const adsInsightsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${insightMetrics}&time_range=${timeRange}&level=ad&limit=500&access_token=${creds.access_token}`;
          const adsInsightsRes = await fetch(adsInsightsUrl);
          
          if (adsInsightsRes.ok) {
            const insightsData = await adsInsightsRes.json();
            const insightRows = (insightsData.data || []) as any[];
            
            console.log(`[sync-meta] Got ${insightRows.length} ad insight rows`);

            // Aggregate by ad_id
            const adAggMap = new Map<string, any>();
            for (const row of insightRows) {
              const adId = row.ad_id;
              if (!adId) continue;
              if (!adAggMap.has(adId)) {
                adAggMap.set(adId, { spend: 0, impressions: 0, clicks: 0, purchases: 0, leads: 0, ad_name: row.ad_name, video_plays: 0, video_p25: 0, video_p50: 0, video_p75: 0, video_p100: 0 });
              }
              const agg = adAggMap.get(adId)!;
              agg.spend += parseFloat(row.spend || "0");
              agg.impressions += parseInt(row.impressions || "0");
              agg.clicks += parseInt(row.clicks || "0");
              for (const a of (row.actions || [])) {
                if (a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase") {
                  agg.purchases += parseInt(a.value || "0");
                }
                if (a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead") {
                  agg.leads += parseInt(a.value || "0");
                }
              }
              // Video metrics for hook/hold rate
              for (const v of (row.video_play_actions || [])) {
                if (v.action_type === "video_view") agg.video_plays += parseInt(v.value || "0");
              }
              for (const v of (row.video_p25_watched_actions || [])) {
                agg.video_p25 += parseInt(v.value || "0");
              }
              for (const v of (row.video_p50_watched_actions || [])) {
                agg.video_p50 += parseInt(v.value || "0");
              }
              for (const v of (row.video_p75_watched_actions || [])) {
                agg.video_p75 += parseInt(v.value || "0");
              }
              for (const v of (row.video_p100_watched_actions || [])) {
                agg.video_p100 += parseInt(v.value || "0");
              }
            }

            console.log(`[sync-meta] Aggregated ${adAggMap.size} unique ads`);

            // Upsert into meta_ads table
            let adsSynced = 0;
            for (const [adId, agg] of adAggMap) {
              const meta = adMeta.get(adId) || { name: agg.ad_name || "—", status: "UNKNOWN", preview_link: null };
              const { error } = await supabase
                .from("meta_ads")
                .upsert({
                  project_id,
                  ad_id: adId,
                  ad_name: meta.name || agg.ad_name || "—",
                  status: meta.status,
                  spend: agg.spend,
                  impressions: agg.impressions,
                  clicks: agg.clicks,
                  cpm: agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : 0,
                  ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
                  cpc: agg.clicks > 0 ? agg.spend / agg.clicks : 0,
                  purchases: agg.purchases,
                  leads: agg.leads,
                  preview_link: meta.preview_link,
                  hook_rate: agg.impressions > 0 ? (agg.video_plays / agg.impressions) * 100 : 0,
                  hold_rate: agg.video_plays > 0 ? (agg.video_p50 / agg.video_plays) * 100 : 0,
                  date_start: sinceStr,
                  date_end: untilStr,
                  last_updated: new Date().toISOString(),
                }, { onConflict: "project_id,ad_id,date_start" });
              if (!error) adsSynced++;
              else console.warn(`[sync-meta] Ad upsert error for ${adId}:`, error.message);
            }
            console.log(`[sync-meta] Saved ${adsSynced} ads to meta_ads table`);
          } else {
            const errText = await adsInsightsRes.text();
            console.warn(`[sync-meta] Ad insights fetch failed: ${errText}`);
          }
        } else {
          const errText = await adsListRes.text();
          console.warn(`[sync-meta] Ads list fetch failed: ${errText}`);
        }
      } catch (e) {
        console.error("Top ads fetch error:", e);
      }

      totalAccountsSynced++;
    }

    // Upsert main metrics
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

      const topAds = row.top_ads || null;

      const { error } = await supabase
        .from("meta_metrics")
        .upsert(
          {
            project_id,
            date: row.date_start,
            investment, impressions, clicks, leads,
            results: results || leads, purchases,
            link_clicks: linkClicks, landing_page_views: lpViews, checkouts_initiated: checkouts,
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
            top_ads: topAds,
            last_updated: new Date().toISOString(),
          },
          { onConflict: "project_id,date" }
        );
      if (!error) synced++;
    }

    // Upsert demographics
    const allDemos = [
      { type: "age_gender", map: demoAgeGender },
      { type: "device", map: demoDevice },
      { type: "placement", map: demoPlacement },
      { type: "location", map: demoCountry },
    ];

    let demoSynced = 0;
    for (const { type, map } of allDemos) {
      for (const [, val] of map) {
        const { error } = await supabase
          .from("ad_demographics")
          .upsert({
            project_id,
            platform: "meta",
            breakdown_type: type,
            dimension_1: val.dimension_1,
            dimension_2: val.dimension_2 || "",
            spend: val.spend,
            impressions: val.impressions,
            clicks: val.clicks,
            conversions: val.conversions,
            leads: val.leads,
            purchases: val.purchases,
            date_start: sinceStr,
            date_end: untilStr,
            last_updated: new Date().toISOString(),
          }, { onConflict: "project_id,platform,breakdown_type,dimension_1,dimension_2,date_start" });
        if (!error) demoSynced++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true, synced, total: allRows.length,
        accounts_synced: totalAccountsSynced, demographics_synced: demoSynced,
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
