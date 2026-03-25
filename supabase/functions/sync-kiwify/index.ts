import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-source, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getOAuthToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch("https://public-api.kiwify.com/v1/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OAuth token error: ${res.status} ${errText}`);
  }
  return (await res.json()).access_token;
}

/** Sleep helper */
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/** Fetch with retry on 429 */
async function fetchWithRetry(url: string, headers: Record<string, string>, retries = 5): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      const wait = Math.min(3000 * Math.pow(2, i), 30000);
      console.warn(`[sync-kiwify] 429 rate limited, waiting ${wait}ms (attempt ${i + 1}/${retries})`);
      await res.text(); // consume body
      await sleep(wait);
      continue;
    }
    return res;
  }
  // Last attempt
  return fetch(url, { headers });
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "");
    const isInternalCron = syncSource === "auto-sync-cron" && token === serviceRoleKey;

    let userId: string | null = null;
    if (!isInternalCron) {
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify project ownership
    if (!isInternalCron && userId) {
      const { data: project } = await supabase.from("projects").select("id, owner_id").eq("id", project_id).single();
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
      const isAdmin = roleData?.role === "admin";
      if (!project || (!isAdmin && project.owner_id !== userId)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!isInternalCron) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OAuth credentials
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("kiwify_client_id, kiwify_client_secret, kiwify_account_id")
      .eq("id", project_id)
      .single();

    if (projectError || !projectData) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { kiwify_client_id: clientId, kiwify_client_secret: clientSecret, kiwify_account_id: accountId } = projectData;

    if (!clientId || !clientSecret || !accountId) {
      return new Response(JSON.stringify({
        success: true, imported: 0, skipped: 0,
        message: "Este projeto usa apenas webhook para receber vendas da Kiwify. Configure Client ID, Client Secret e Account ID para sincronização via API."
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let bearerToken: string;
    try {
      bearerToken = await getOAuthToken(clientId, clientSecret);
    } catch (err) {
      console.error("OAuth error:", err);
      return new Response(JSON.stringify({ error: "Failed to authenticate with Kiwify" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load registered products
    const { data: registeredProducts } = await supabase.from("products").select("name, type").eq("project_id", project_id);
    if (!registeredProducts || registeredProducts.length === 0) {
      return new Response(JSON.stringify({ error: "No products registered for this project" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Date range (last 30 days, São Paulo timezone)
    const spFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" });
    const now = new Date();
    const startDate = spFormatter.format(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    const endDate = spFormatter.format(new Date(now.getTime() + 24 * 60 * 60 * 1000));

    let page = 1;
    let imported = 0;
    let skipped = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `https://public-api.kiwify.com/v1/sales?start_date=${startDate}&end_date=${endDate}&page_number=${page}&page_size=100`;
      const res = await fetchWithRetry(url, {
        "Authorization": `Bearer ${bearerToken}`,
        "x-kiwify-account-id": accountId,
        "Content-Type": "application/json",
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 429) {
          console.warn("[sync-kiwify] Rate limited on sales listing after all retries, returning partial results");
          hasMore = false;
          break;
        }
        console.error("Kiwify API error:", res.status, errText);
        return new Response(JSON.stringify({ error: "Failed to fetch sales from Kiwify" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const transactions = data.data || [];

      if (transactions.length === 0) { hasMore = false; break; }

      const batch: any[] = [];

      for (const tx of transactions) {
        const productName = tx.product?.name || tx.Product?.product_name || tx.product_name || tx.offer?.name || "";
        const matchedProduct = registeredProducts.find(
          (p: any) => p.name.toLowerCase() === productName.toLowerCase()
        );
        if (!matchedProduct) { skipped++; continue; }

        const orderId = tx.reference || tx.id || "";
        const orderStatus = tx.status || "";
        const rawCharge = parseFloat(tx.charge_amount || tx.order_amount || "0") / 100;
        const rawNet = parseFloat(tx.net_amount || "0") / 100;
        const rawBasePrice = parseFloat(tx.product?.price || tx.offer?.price || tx.charge_amount || tx.order_amount || "0") / 100;
        const netValue = rawNet || rawCharge;
        const orderAmount = rawCharge > 0 ? rawCharge : netValue;
        const basePrice = rawBasePrice > 0 ? rawBasePrice : orderAmount;
        const customer = tx.customer || {};
        const createdAt = tx.created_at || new Date().toISOString();

        let status: string;
        switch (orderStatus) {
          case "paid": case "completed": status = "approved"; break;
          case "refunded": status = "refunded"; break;
          case "cancelled": case "canceled": status = "cancelled"; break;
          default: status = "pending";
        }

        // Extract tracking from multiple possible locations in the API response
        const tracking = tx.tracking || {};
        const utmSource = tracking.utm_source || tx.utm_source || tx.utmSource || "";
        const utmMedium = tracking.utm_medium || tx.utm_medium || tx.utmMedium || "";
        const utmCampaign = tracking.utm_campaign || tx.utm_campaign || tx.utmCampaign || "";
        const utmTerm = tracking.utm_term || tx.utm_term || tx.utmTerm || "";
        const utmContent = tracking.utm_content || tx.utm_content || tx.utmContent || "";
        const trackingSrc = tracking.src || tx.src || "";
        const trackingSck = tracking.sck || tx.sck || "";

        const record: any = {
          project_id,
          platform: "kiwify",
          external_id: orderId,
          product_name: tx.product?.name || tx.Product?.product_name || tx.product_name || "",
          product_type: matchedProduct.type || "main",
          amount: netValue,
          gross_amount: orderAmount,
          base_price: basePrice,
          platform_fee: Math.max(0, orderAmount - netValue),
          status,
          buyer_email: customer.email || "",
          buyer_name: customer.name || "",
          sale_date: createdAt,
          payment_method: tx.payment_method || undefined,
          buyer_state: customer.state || customer.address?.state || undefined,
          buyer_city: customer.city || customer.address?.city || undefined,
          buyer_country: customer.country || undefined,
          payload: tx,
        };

        // Only include tracking fields if the API actually provides them
        // This prevents overwriting CSV-imported tracking data with empty values
        if (utmSource) record.utm_source = utmSource;
        if (utmMedium) record.utm_medium = utmMedium;
        if (utmCampaign) record.utm_campaign = utmCampaign;
        if (utmTerm) record.utm_term = utmTerm;
        if (utmContent) record.utm_content = utmContent;
        if (trackingSrc) record.tracking_src = trackingSrc;
        if (trackingSck) record.tracking_sck = trackingSck;

        batch.push(record);
      }

      if (batch.length > 0) {
        const { error, count } = await supabase
          .from("sales_events")
          .upsert(batch, { onConflict: "platform,external_id,project_id", count: "exact" });
        if (error) {
          console.error("Batch upsert error:", error);
        } else {
          imported += count || batch.length;
        }
      }

      const pagination = data.pagination || {};
      const totalItems = pagination.count || 0;
      const pageSize = pagination.page_size || 100;
      if (page * pageSize >= totalItems) { hasMore = false; } else { page++; }
    }

    return new Response(
      JSON.stringify({ success: true, imported, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
