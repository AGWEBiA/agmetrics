import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-source, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Parses Hotmart source_sck string into UTM-like fields.
 * Pattern: {source_prefix}-{placement}-{campaign}-{content}-{term}
 * Example: ig_fbads_WHAV0226-Instagram_Feed-WHAV0226_VENDAS_...-00_AUTO_...-2002_VÍDEO_AD13
 */
function parseSourceSck(sourceSck: string): {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
} {
  const empty = { utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", utm_term: "" };
  if (!sourceSck || sourceSck.trim() === "") return empty;

  const parts = sourceSck.split("-");
  if (parts.length < 2) return empty;

  return {
    utm_source: parts[0] || "",       // e.g. ig_fbads_WHAV0226
    utm_medium: parts[1] || "",       // e.g. Instagram_Feed
    utm_campaign: parts[2] || "",     // e.g. WHAV0226_VENDAS_ADVANTAGE_AUTO_...
    utm_content: parts[3] || "",      // e.g. 00_AUTO_ADVANTAGE_VIDEO_AD13
    utm_term: parts[4] || "",         // e.g. 2002_VÍDEO_AD13
  };
}

/**
 * Finds the best matching product using multiple strategies:
 * 1. Exact match (ilike)
 * 2. Partial match (product name contains or is contained in sale product name)
 * 3. Fallback to first "main" product if only one exists
 */
async function findMatchingProduct(
  supabase: any,
  projectId: string,
  saleProductName: string
): Promise<{ type: string; name: string } | null> {
  const { data: exact } = await supabase
    .from("products")
    .select("type, name")
    .eq("project_id", projectId)
    .ilike("name", saleProductName)
    .maybeSingle();

  if (exact) return exact;

  const { data: allProducts } = await supabase
    .from("products")
    .select("type, name")
    .eq("project_id", projectId);

  if (allProducts && allProducts.length > 0) {
    const saleLower = saleProductName.toLowerCase();

    for (const p of allProducts) {
      const pLower = p.name.toLowerCase();
      if (saleLower.includes(pLower) || pLower.includes(saleLower)) {
        console.log(`[sync-hotmart] Partial match: "${saleProductName}" → "${p.name}"`);
        return p;
      }
    }
  }

  return null;
}

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

    const token = authHeader.replace("Bearer ", "");
    const isInternalCron = syncSource === "auto-sync-cron" && token === serviceRoleKey;

    let authenticatedUserId: string | null = null;

    if (!isInternalCron) {
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authenticatedUserId = user.id;
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isInternalCron && authenticatedUserId) {
      const { data: project } = await supabase
        .from("projects")
        .select("id, owner_id")
        .eq("id", project_id)
        .single();

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authenticatedUserId)
        .single();

      const isAdmin = roleData?.role === "admin";
      if (!project || (!isAdmin && project.owner_id !== authenticatedUserId)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get project details to check for per-project credentials
    const { data: projectData } = await supabase
      .from("projects")
      .select("hotmart_client_id, hotmart_client_secret, hotmart_basic_auth")
      .eq("id", project_id)
      .single();

    // Use per-project credentials first, fallback to env secrets
    const clientId = projectData?.hotmart_client_id || Deno.env.get("HOTMART_CLIENT_ID");
    const clientSecret = projectData?.hotmart_client_secret || Deno.env.get("HOTMART_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Credenciais da Hotmart não configuradas. Acesse Configurações → Hotmart para cadastrar Client ID e Client Secret." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute Basic Auth from client_id:client_secret (override any manual value)
    const computedBasicAuth = btoa(`${clientId}:${clientSecret}`);

    // Step 1: Get access token from Hotmart
    const tokenRes = await fetch("https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${computedBasicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Hotmart token error:", tokenRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with Hotmart" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Step 2: Fetch sales (last 30 days)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let pageToken: string | null = null;
    let imported = 0;
    let skipped = 0;
    let hasMore = true;

    while (hasMore) {
      let url = `https://developers.hotmart.com/payments/api/v1/sales/history?start_date=${thirtyDaysAgo}&end_date=${now}&max_results=50`;
      if (pageToken) {
        url += `&page_token=${encodeURIComponent(pageToken)}`;
      }

      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Hotmart API error:", res.status, errText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch sales from Hotmart" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      const items = data.items || [];

      if (items.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of items) {
        const purchase = item.purchase || {};
        const product = item.product || {};
        const price = purchase.price || {};
        const buyer = purchase.buyer || {};

        const productName = product.name || "";

        // Use flexible product matching (exact → partial → single main fallback)
        const matchedProduct = await findMatchingProduct(supabase, project_id, productName);

        if (!matchedProduct) {
          skipped++;
          continue;
        }

        const transactionId = purchase.transaction || "";
        const basePrice = parseFloat(String(product.price || price.value || "0"));
        const grossValue = parseFloat(String(price.value || "0"));
        const netValue = parseFloat(String(price.net_value || price.value || "0"));
        const buyerEmail = buyer.email || "";
        const buyerName = buyer.name || "";

        let status: string;
        const purchaseStatus = purchase.status || "";
        switch (purchaseStatus) {
          case "COMPLETE":
          case "APPROVED":
            status = "approved";
            break;
          case "REFUNDED":
            status = "refunded";
            break;
          case "CANCELLED":
          case "CANCELED":
            status = "cancelled";
            break;
          default:
            status = "pending";
        }

        let saleDate: string;
        if (purchase.approved_date && typeof purchase.approved_date === "number") {
          saleDate = new Date(purchase.approved_date).toISOString();
        } else if (purchase.order_date) {
          saleDate = new Date(purchase.order_date).toISOString();
        } else {
          saleDate = new Date().toISOString();
        }

        const platformFee = Math.max(0, grossValue - netValue);

        // Extract tracking data from Hotmart API response
        const tracking = purchase.tracking || item.tracking || {};
        const trackingSrc = tracking.src || tracking.source_sck || "";
        const trackingSck = tracking.sck || "";

        // Try native UTMs first, then parse from source_sck
        const parsedUtms = parseSourceSck(trackingSrc || trackingSck);
        const utmSource = tracking.source || tracking.utm_source || parsedUtms.utm_source;
        const utmMedium = tracking.medium || tracking.utm_medium || parsedUtms.utm_medium;
        const utmCampaign = tracking.utm_campaign || parsedUtms.utm_campaign;
        const utmTerm = tracking.utm_term || parsedUtms.utm_term;
        const utmContent = tracking.utm_content || parsedUtms.utm_content;

        // Extract buyer location and payment method
        const buyerAddress = buyer.address || {};
        const buyerState = buyerAddress.state || buyerAddress.UF || "";
        const buyerCity = buyerAddress.city || "";
        const buyerCountry = buyerAddress.country || "BR";
        const paymentMethod = (purchase.payment || {}).type || (purchase.payment || {}).method || "";

        const { error } = await supabase
          .from("sales_events")
          .upsert(
            {
              project_id,
              platform: "hotmart",
              external_id: transactionId,
              product_name: productName,
              product_type: matchedProduct.type || "main",
              amount: netValue,
              gross_amount: grossValue,
              base_price: basePrice,
              platform_fee: platformFee,
              status,
              buyer_email: buyerEmail,
              buyer_name: buyerName,
              sale_date: saleDate,
              payment_method: paymentMethod || undefined,
              buyer_state: buyerState || undefined,
              buyer_city: buyerCity || undefined,
              buyer_country: buyerCountry || undefined,
              utm_source: utmSource || undefined,
              utm_medium: utmMedium || undefined,
              utm_campaign: utmCampaign || undefined,
              utm_term: utmTerm || undefined,
              utm_content: utmContent || undefined,
              tracking_src: trackingSrc || undefined,
              tracking_sck: trackingSck || undefined,
              payload: item,
            },
            { onConflict: "platform,external_id,project_id" }
          );

        if (error) {
          console.error("Upsert error:", error);
        } else {
          imported++;
        }
      }

      // Use page_token pagination
      if (data.page_info?.next_page_token) {
        pageToken = data.page_info.next_page_token;
      } else {
        hasMore = false;
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
