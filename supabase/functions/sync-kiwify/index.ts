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
async function fetchWithRetry(url: string, headers: Record<string, string>, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      const wait = Math.min(2000 * Math.pow(2, i), 10000);
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

/** Fetch individual sale detail to get tracking data */
async function fetchSaleDetail(
  saleId: string,
  bearerToken: string,
  accountId: string
): Promise<Record<string, any> | null> {
  try {
    const res = await fetchWithRetry(`https://public-api.kiwify.com/v1/sales/${saleId}`, {
      "Authorization": `Bearer ${bearerToken}`,
      "x-kiwify-account-id": accountId,
      "Content-Type": "application/json",
    });
    if (!res.ok) {
      await res.text();
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

/** Fetch details for a batch of sale IDs with low concurrency to avoid rate limits */
async function fetchDetailsBatch(
  saleIds: string[],
  bearerToken: string,
  accountId: string,
  concurrency = 3
): Promise<Map<string, Record<string, any>>> {
  const results = new Map<string, Record<string, any>>();
  for (let i = 0; i < saleIds.length; i += concurrency) {
    const chunk = saleIds.slice(i, i + concurrency);
    const details = await Promise.all(
      chunk.map((id) => fetchSaleDetail(id, bearerToken, accountId))
    );
    chunk.forEach((id, idx) => {
      if (details[idx]) results.set(id, details[idx]!);
    });
    // Small delay between batches to respect rate limits
    if (i + concurrency < saleIds.length) await sleep(300);
  }
  return results;
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
        console.error("Kiwify API error:", res.status, errText);
        return new Response(JSON.stringify({ error: "Failed to fetch sales from Kiwify" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const transactions = data.data || [];

      if (transactions.length === 0) { hasMore = false; break; }

      // Filter matched transactions first
      const matchedTxs: { tx: any; product: any }[] = [];
      for (const tx of transactions) {
        const productName = tx.product?.name || tx.Product?.product_name || tx.product_name || tx.offer?.name || "";
        const matchedProduct = registeredProducts.find(
          (p: any) => p.name.toLowerCase() === productName.toLowerCase()
        );
        if (!matchedProduct) { skipped++; continue; }
        matchedTxs.push({ tx, product: matchedProduct });
      }

      // Fetch individual sale details to get tracking data (concurrency = 5)
      const saleIds = matchedTxs.map(({ tx }) => tx.id).filter(Boolean);
      console.log(`Page ${page}: fetching details for ${saleIds.length} matched sales...`);
      const detailsMap = await fetchDetailsBatch(saleIds, bearerToken, accountId);
      console.log(`Page ${page}: got details for ${detailsMap.size} sales`);

      // Log sample tracking from detail endpoint
      if (page === 1 && detailsMap.size > 0) {
        const firstDetail = detailsMap.values().next().value;
        console.log("Sample detail tracking:", JSON.stringify(firstDetail?.tracking));
      }

      const batch: any[] = [];

      for (const { tx, product } of matchedTxs) {
        const orderId = tx.reference || tx.id || "";
        const orderStatus = tx.status || "";
        const rawCharge = parseFloat(tx.charge_amount || tx.order_amount || "0") / 100;
        const rawNet = parseFloat(tx.net_amount || "0") / 100;
        const netValue = rawNet || rawCharge;
        const orderAmount = rawCharge > 0 ? rawCharge : netValue;
        const customer = tx.customer || {};
        const createdAt = tx.created_at || new Date().toISOString();

        let status: string;
        switch (orderStatus) {
          case "paid": case "completed": status = "approved"; break;
          case "refunded": status = "refunded"; break;
          case "cancelled": case "canceled": status = "cancelled"; break;
          default: status = "pending";
        }

        // Get tracking from individual sale detail endpoint
        const detail = detailsMap.get(tx.id);
        const tracking = detail?.tracking || {};

        batch.push({
          project_id,
          platform: "kiwify",
          external_id: orderId,
          product_name: tx.product?.name || tx.Product?.product_name || tx.product_name || "",
          product_type: product.type || "main",
          amount: netValue,
          gross_amount: orderAmount,
          platform_fee: Math.max(0, orderAmount - netValue),
          status,
          buyer_email: customer.email || "",
          buyer_name: customer.name || "",
          sale_date: createdAt,
          payment_method: tx.payment_method || undefined,
          buyer_state: customer.state || undefined,
          buyer_city: customer.city || undefined,
          buyer_country: customer.country || undefined,
          utm_source: tracking.utm_source || undefined,
          utm_medium: tracking.utm_medium || undefined,
          utm_campaign: tracking.utm_campaign || undefined,
          utm_term: tracking.utm_term || undefined,
          utm_content: tracking.utm_content || undefined,
          tracking_src: tracking.src || undefined,
          tracking_sck: tracking.sck || undefined,
          payload: detail || tx,
        });
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
