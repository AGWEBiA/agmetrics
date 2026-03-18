import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-source, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Helper: authenticate request (user or cron) ───
async function authenticateRequest(req: Request): Promise<{
  ok: boolean;
  userId: string | null;
  isInternalCron: boolean;
  errorResponse?: Response;
}> {
  const authHeader = req.headers.get("authorization");
  const syncSource = req.headers.get("x-sync-source");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!authHeader) {
    return {
      ok: false, userId: null, isInternalCron: false,
      errorResponse: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const token = authHeader.replace("Bearer ", "");
  const isInternalCron = syncSource === "auto-sync-cron" && token === serviceRoleKey;

  if (isInternalCron) {
    return { ok: true, userId: null, isInternalCron: true };
  }

  // Normal user auth
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  try {
    const claimsResult = await (anonClient.auth as any).getClaims(token);
    if (claimsResult?.data?.claims) {
      return { ok: true, userId: claimsResult.data.claims.sub, isInternalCron: false };
    }
  } catch {
    // getClaims not available in this SDK version, fall through to getUser
  }

  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) {
    return {
      ok: false, userId: null, isInternalCron: false,
      errorResponse: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return { ok: true, userId: user.id, isInternalCron: false };
}

// ─── Helper: verify project ownership ───
async function verifyProjectAccess(
  supabase: any, projectId: string, userId: string | null, isInternalCron: boolean
): Promise<{ allowed: boolean; errorResponse?: Response }> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .single();

  if (!project) {
    return {
      allowed: false,
      errorResponse: new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  if (isInternalCron) return { allowed: true };

  if (!userId) {
    return {
      allowed: false,
      errorResponse: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  const isAdmin = roleData?.role === "admin";
  if (!isAdmin && project.owner_id !== userId) {
    return {
      allowed: false,
      errorResponse: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return { allowed: true };
}

// ─── Helper: aggregate demographics ───
function addDemo(map: Map<string, any>, d1: string, d2: string, row: any) {
  const key = `${d1}||${d2}`;
  if (!map.has(key)) {
    map.set(key, { dimension_1: d1, dimension_2: d2, spend: 0, impressions: 0, clicks: 0, conversions: 0, leads: 0, purchases: 0 });
  }
  const agg = map.get(key)!;
  agg.spend += parseFloat(row.spend || "0");
  agg.impressions += parseInt(row.impressions || "0");
  agg.clicks += parseInt(row.clicks || "0");
  for (const a of (row.actions || [])) {
    if (a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead") agg.leads += parseInt(a.value);
    if (a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase") agg.purchases += parseInt(a.value);
  }
  agg.conversions = agg.leads + agg.purchases;
}

// ─── Helper: extract action value ───
function getActionValue(actions: any[], type: string): number {
  const a = actions.find((a: any) => a.action_type === type);
  return a ? parseInt(a.value) : 0;
}

// ─── Helper: aggregate ad insights row ───
function aggregateAdRow(agg: any, row: any) {
  agg.spend += parseFloat(row.spend || "0");
  agg.impressions += parseInt(row.impressions || "0");
  agg.clicks += parseInt(row.clicks || "0");
  for (const a of (row.actions || [])) {
    if (a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase") agg.purchases += parseInt(a.value || "0");
    if (a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead") agg.leads += parseInt(a.value || "0");
    if (a.action_type === "link_click") agg.link_clicks += parseInt(a.value || "0");
    if (a.action_type === "landing_page_view") agg.landing_page_views += parseInt(a.value || "0");
    if (a.action_type === "offsite_conversion.fb_pixel_initiate_checkout" || a.action_type === "initiate_checkout") agg.checkouts_initiated += parseInt(a.value || "0");
  }
  for (const v of (row.video_play_actions || [])) {
    if (v.action_type === "video_view") agg.video_plays += parseInt(v.value || "0");
  }
  for (const v of (row.video_p25_watched_actions || [])) agg.video_p25 += parseInt(v.value || "0");
  for (const v of (row.video_p50_watched_actions || [])) agg.video_p50 += parseInt(v.value || "0");
  for (const v of (row.video_p75_watched_actions || [])) agg.video_p75 += parseInt(v.value || "0");
  for (const v of (row.video_p100_watched_actions || [])) agg.video_p100 += parseInt(v.value || "0");
}

// ─── Helper: build ad upsert record ───
function buildAdRecord(projectId: string, adId: string, agg: any, meta: any, sinceStr: string, untilStr: string) {
  const linkClicks = agg.link_clicks || 0;
  const lpViews = agg.landing_page_views || 0;
  const checkouts = agg.checkouts_initiated || 0;
  const results = agg.leads || agg.purchases || 0;
  return {
    project_id: projectId,
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
    link_clicks: linkClicks,
    results,
    landing_page_views: lpViews,
    checkouts_initiated: checkouts,
    preview_link: meta.preview_link,
    hook_rate: agg.impressions > 0 ? (agg.video_plays / agg.impressions) * 100 : 0,
    hold_rate: agg.video_plays > 0 ? (agg.video_p50 / agg.video_plays) * 100 : 0,
    date_start: sinceStr,
    date_end: untilStr,
    last_updated: new Date().toISOString(),
    thumbnail_url: meta.thumbnail_url || null,
  };
}

// ─── Helper: build metrics upsert record ───
function buildMetricsRecord(projectId: string, row: any) {
  const actions = row.actions || [];
  const leads = getActionValue(actions, "lead") + getActionValue(actions, "offsite_conversion.fb_pixel_lead");
  const purchases = getActionValue(actions, "purchase") + getActionValue(actions, "offsite_conversion.fb_pixel_purchase");
  const results = getActionValue(actions, "offsite_conversion.fb_pixel_custom") || leads || purchases;
  const linkClicks = getActionValue(actions, "link_click");
  const lpViews = getActionValue(actions, "landing_page_view");
  const checkouts = getActionValue(actions, "offsite_conversion.fb_pixel_initiate_checkout") + getActionValue(actions, "initiate_checkout");
  const investment = typeof row.spend === "number" ? row.spend : parseFloat(row.spend || "0");
  const impressions = typeof row.impressions === "number" ? row.impressions : parseInt(row.impressions || "0");
  const clicks = typeof row.clicks === "number" ? row.clicks : parseInt(row.clicks || "0");

  return {
    project_id: projectId,
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
    top_ads: row.top_ads || null,
    last_updated: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate
    const auth = await authenticateRequest(req);
    if (!auth.ok) return auth.errorResponse!;

    // 2. Parse body
    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Authorize
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    const access = await verifyProjectAccess(supabase, project_id, auth.userId, auth.isInternalCron);
    if (!access.allowed) return access.errorResponse!;

    // 4. Load credentials
    const { data: allCreds } = await supabase
      .from("meta_credentials")
      .select("*")
      .eq("project_id", project_id);

    if (!allCreds || allCreds.length === 0) {
      return new Response(JSON.stringify({ error: "Meta credentials not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Date range
    const today = new Date();
    const since = new Date(today);
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().split("T")[0];
    const untilStr = today.toISOString().split("T")[0];

    const fields = "date_start,spend,impressions,clicks,actions,cost_per_action_type,cpm,cpc,ctr";
    const dateMap = new Map<string, any>();
    let totalAccountsSynced = 0;

    // Demographic aggregators
    const demoMaps: Record<string, Map<string, any>> = {
      age_gender: new Map(), device: new Map(), placement: new Map(), location: new Map(),
    };

    // 6. Process each credential
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

      // === Fetch main metrics ===
      let rows: any[] = [];
      let usedAccountFallbackForMetrics = false;

      if (hasFilter) {
        let campaignSuccessCount = 0;

        for (const cid of campaignIds) {
          const url = `https://graph.facebook.com/v21.0/${cid}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${creds.access_token}&limit=100`;
          const metaRes = await fetch(url);

          if (!metaRes.ok) {
            console.error(`[sync-meta] Campaign ${cid} fetch error:`, await metaRes.text());
            continue;
          }

          const metaData = await metaRes.json();
          const campaignRows = metaData.data || [];
          if (campaignRows.length > 0) campaignSuccessCount++;
          rows.push(...campaignRows);
        }

        if (rows.length === 0) {
          usedAccountFallbackForMetrics = true;
          console.warn(`[sync-meta] Selected campaign metrics returned no rows for project ${project_id}; falling back to account-level insights.`);
        }
      }

      if (!hasFilter || usedAccountFallbackForMetrics) {
        const url = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&level=account&access_token=${creds.access_token}&limit=100`;
        const metaRes = await fetch(url);
        if (!metaRes.ok) {
          console.error(`[sync-meta] Account ${creds.ad_account_id} error:`, await metaRes.text());
          continue;
        }
        const metaData = await metaRes.json();
        rows = metaData.data || [];
      }

      // Aggregate by date
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

      // === Fetch demographics ===
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

          for (const dr of (demoData.data || [])) {
            let d1 = "", d2 = "";
            if (bd.type === "age_gender") { d1 = dr.age || "unknown"; d2 = dr.gender || "unknown"; }
            else if (bd.type === "device") { d1 = dr.device_platform || "unknown"; d2 = ""; }
            else if (bd.type === "placement") { d1 = dr.publisher_platform || "unknown"; d2 = dr.platform_position || ""; }
            else if (bd.type === "location") { d1 = dr.region || "unknown"; d2 = ""; }
            addDemo(demoMaps[bd.type], d1, d2, dr);
          }
        } catch (e) {
          console.error(`Demo ${bd.type} exception:`, e);
        }
      }

      // === Fetch and save ads ===
      try {
        const insightFields = "id,name,status,preview_shareable_link,creative{id,thumbnail_url,effective_image_url,image_url,object_story_spec}";
        const insightMetrics = "spend,impressions,clicks,actions,video_play_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,ad_id,ad_name";

        const adMeta = new Map<string, { name: string; status: string; preview_link: string | null; thumbnail_url: string | null }>();
        const adsListUrl = `https://graph.facebook.com/v21.0/${adAccountId}/ads?fields=${insightFields}&limit=200&access_token=${creds.access_token}`;
        const adsListRes = await fetch(adsListUrl);

        if (adsListRes.ok) {
          const adsListData = await adsListRes.json();
          const adsList = (adsListData.data || []) as any[];
          const creativeIdsNeedingImage: string[] = [];
          const creativeIdToAdId = new Map<string, string>();

          for (const ad of adsList) {
            let previewLink: string | null = null;
            const rawLink = ad.preview_shareable_link || ad.ad_preview_shareable_link;
            if (typeof rawLink === "string") previewLink = rawLink;
            else if (Array.isArray(rawLink) && rawLink.length > 0) {
              const first = rawLink[0];
              previewLink = typeof first === "string" ? first : (first?.body || first?.share_link || null);
            }

            const creative = ad.creative || {};
            let thumbnailUrl = creative.thumbnail_url
              || creative.effective_image_url
              || creative.image_url
              || creative.object_story_spec?.link_data?.image_url
              || creative.object_story_spec?.photo_data?.images?.[0]?.source
              || null;

            adMeta.set(ad.id, { name: ad.name, status: ad.status, preview_link: previewLink, thumbnail_url: thumbnailUrl });

            if (!thumbnailUrl && creative.id) {
              creativeIdsNeedingImage.push(creative.id);
              creativeIdToAdId.set(creative.id, ad.id);
            }
          }

          if (creativeIdsNeedingImage.length > 0) {
            try {
              const batchSize = 50;
              for (let ci = 0; ci < creativeIdsNeedingImage.length; ci += batchSize) {
                const ids = creativeIdsNeedingImage.slice(ci, ci + batchSize);
                const idsParam = ids.join(",");
                const creativesUrl = `https://graph.facebook.com/v21.0/?ids=${idsParam}&fields=thumbnail_url,image_url,effective_image_url,object_story_spec&access_token=${creds.access_token}`;
                const creativesRes = await fetch(creativesUrl);
                if (!creativesRes.ok) continue;

                const creativesData = await creativesRes.json();
                for (const [cid, cdata] of Object.entries(creativesData) as [string, any][]) {
                  const adId = creativeIdToAdId.get(cid);
                  if (!adId) continue;
                  const meta = adMeta.get(adId);
                  if (!meta || meta.thumbnail_url) continue;

                  const fallbackUrl = cdata.thumbnail_url
                    || cdata.effective_image_url
                    || cdata.image_url
                    || cdata.object_story_spec?.link_data?.image_url
                    || null;

                  if (fallbackUrl) meta.thumbnail_url = fallbackUrl;
                }
              }
            } catch (e) {
              console.warn("[sync-meta] Creative fallback fetch error:", e);
            }
          }
        } else {
          console.warn("[sync-meta] Ads metadata list error:", await adsListRes.text());
        }

        const adAggMap = new Map<string, any>();
        let usedAccountFallbackForAds = false;

        if (hasFilter) {
          for (const cid of campaignIds) {
            try {
              const campAdUrl = `https://graph.facebook.com/v21.0/${cid}/insights?fields=${insightMetrics}&time_range=${timeRange}&level=ad&limit=500&access_token=${creds.access_token}`;
              const campAdRes = await fetch(campAdUrl);
              if (!campAdRes.ok) {
                console.warn(`[sync-meta] Ad insights for campaign ${cid} error:`, await campAdRes.text());
                continue;
              }
              const campAdData = await campAdRes.json();
              for (const row of (campAdData.data || [])) {
                const adId = row.ad_id;
                if (!adId) continue;
                if (!adAggMap.has(adId)) {
                  adAggMap.set(adId, { spend: 0, impressions: 0, clicks: 0, purchases: 0, leads: 0, link_clicks: 0, landing_page_views: 0, checkouts_initiated: 0, ad_name: row.ad_name, video_plays: 0, video_p25: 0, video_p50: 0, video_p75: 0, video_p100: 0 });
                }
                aggregateAdRow(adAggMap.get(adId)!, row);
              }
            } catch (campErr) {
              console.warn(`[sync-meta] Ad insights campaign ${cid} exception:`, campErr);
            }
          }

          if (adAggMap.size === 0) {
            usedAccountFallbackForAds = true;
            console.warn(`[sync-meta] Selected campaign ad insights returned no ads for project ${project_id}; falling back to account-level ad insights.`);
          }
        }

        if (!hasFilter || usedAccountFallbackForAds) {
          const adsInsightsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${insightMetrics}&time_range=${timeRange}&level=ad&limit=500&access_token=${creds.access_token}`;
          const adsInsightsRes = await fetch(adsInsightsUrl);
          if (adsInsightsRes.ok) {
            const insightsData = await adsInsightsRes.json();
            for (const row of (insightsData.data || [])) {
              const adId = row.ad_id;
              if (!adId) continue;
              if (!adAggMap.has(adId)) {
                adAggMap.set(adId, { spend: 0, impressions: 0, clicks: 0, purchases: 0, leads: 0, link_clicks: 0, landing_page_views: 0, checkouts_initiated: 0, ad_name: row.ad_name, video_plays: 0, video_p25: 0, video_p50: 0, video_p75: 0, video_p100: 0 });
              }
              aggregateAdRow(adAggMap.get(adId)!, row);
            }
          } else {
            console.warn(`[sync-meta] Account-level ad insights error:`, await adsInsightsRes.text());
          }
        }

        console.log(`[sync-meta] Found ${adAggMap.size} unique ads for project ${project_id}`);

        const adRecords = Array.from(adAggMap.entries()).map(([adId, agg]) => {
          const meta = adMeta.get(adId) || { name: agg.ad_name || "—", status: "UNKNOWN", preview_link: null, thumbnail_url: null };
          return buildAdRecord(project_id, adId, agg, meta, sinceStr, untilStr);
        });

        let adsSynced = 0;
        const AD_BATCH_SIZE = 20;
        for (let i = 0; i < adRecords.length; i += AD_BATCH_SIZE) {
          const batch = adRecords.slice(i, i + AD_BATCH_SIZE);
          const { error } = await supabase
            .from("meta_ads")
            .upsert(batch, { onConflict: "project_id,ad_id" });
          if (!error) adsSynced += batch.length;
          else console.warn(`[sync-meta] Ad batch upsert error:`, error.message);
        }
        console.log(`[sync-meta] Saved ${adsSynced} ads via batch upsert`);
      } catch (e) {
        console.error("Top ads fetch error:", e);
      }

      totalAccountsSynced++;
    }

    // 7. Batch upsert main metrics
    const allRows = Array.from(dateMap.values());
    const metricsRecords = allRows.map(row => buildMetricsRecord(project_id, row));

    let synced = 0;
    const METRICS_BATCH_SIZE = 15;
    for (let i = 0; i < metricsRecords.length; i += METRICS_BATCH_SIZE) {
      const batch = metricsRecords.slice(i, i + METRICS_BATCH_SIZE);
      const { error } = await supabase
        .from("meta_metrics")
        .upsert(batch, { onConflict: "project_id,date" });
      if (!error) synced += batch.length;
      else console.warn(`[sync-meta] Metrics batch upsert error:`, error.message);
    }

    // 8. Batch upsert demographics
    let demoSynced = 0;
    for (const [type, map] of Object.entries(demoMaps)) {
      const demoRecords = Array.from(map.values()).map(val => ({
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
      }));

      const DEMO_BATCH_SIZE = 25;
      for (let i = 0; i < demoRecords.length; i += DEMO_BATCH_SIZE) {
        const batch = demoRecords.slice(i, i + DEMO_BATCH_SIZE);
        const { error } = await supabase
          .from("ad_demographics")
          .upsert(batch, { onConflict: "project_id,platform,breakdown_type,dimension_1,dimension_2,date_start" });
        if (!error) demoSynced += batch.length;
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
