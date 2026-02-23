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
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OAuth token error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
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

    let userId: string | null = null;

    if (!isInternalCron) {
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
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify project ownership for non-cron calls
    if (!isInternalCron && userId) {
      const { data: project } = await supabase
        .from("projects")
        .select("id, owner_id")
        .eq("id", project_id)
        .single();

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
    }

    // Get OAuth credentials from project row
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("kiwify_client_id, kiwify_client_secret, kiwify_account_id")
      .eq("id", project_id)
      .single();

    if (projectError || !projectData) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = projectData.kiwify_client_id;
    const clientSecret = projectData.kiwify_client_secret;
    const accountId = projectData.kiwify_account_id;

    if (!clientId || !clientSecret || !accountId) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          imported: 0, 
          skipped: 0, 
          message: "Este projeto usa apenas webhook para receber vendas da Kiwify. As vendas são registradas automaticamente quando chegam via webhook. Para sincronização manual via API, configure Client ID, Client Secret e Account ID nas configurações do projeto." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get OAuth bearer token
    let bearerToken: string;
    try {
      bearerToken = await getOAuthToken(clientId, clientSecret);
    } catch (err) {
      console.error("OAuth error:", err);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with Kiwify" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load registered products for this project
    const { data: registeredProducts } = await supabase
      .from("products")
      .select("name, type")
      .eq("project_id", project_id);

    if (!registeredProducts || registeredProducts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No products registered for this project" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch sales from Kiwify API (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];
    const endDate = now.toISOString().split("T")[0];

    let page = 1;
    let imported = 0;
    let skipped = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `https://public-api.kiwify.com/v1/sales?start_date=${startDate}&end_date=${endDate}&page_number=${page}&page_size=100`;
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${bearerToken}`,
          "x-kiwify-account-id": accountId,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Kiwify API error:", res.status, errText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch sales from Kiwify" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      const transactions = data.data || [];

      if (transactions.length === 0) {
        hasMore = false;
        break;
      }

      for (const tx of transactions) {
        const productName = tx.product?.name || tx.Product?.product_name || tx.product_name || tx.offer?.name || "";
        const matchedProduct = registeredProducts.find(
          (p: any) => p.name.toLowerCase() === productName.toLowerCase()
        );

        if (!matchedProduct) {
          skipped++;
          continue;
        }

        const orderId = tx.reference || tx.id || "";
        const orderStatus = tx.status || "";
        const rawCharge = parseFloat(tx.charge_amount || tx.order_amount || "0") / 100;
        const rawNet = parseFloat(tx.net_amount || "0") / 100;
        const netValue = rawNet || rawCharge;
        const orderAmount = rawCharge > 0 ? rawCharge : netValue;
        const buyerEmail = tx.customer?.email || "";
        const buyerName = tx.customer?.name || "";
        const createdAt = tx.created_at || new Date().toISOString();

        let status: string;
        switch (orderStatus) {
          case "paid":
          case "completed":
            status = "approved";
            break;
          case "refunded":
            status = "refunded";
            break;
          case "cancelled":
          case "canceled":
            status = "cancelled";
            break;
          default:
            status = "pending";
        }

        const platformFee = Math.max(0, orderAmount - netValue);

        const { error } = await supabase
          .from("sales_events")
          .upsert(
            {
              project_id,
              platform: "kiwify",
              external_id: orderId,
              product_name: productName,
              product_type: matchedProduct.type || "main",
              amount: netValue,
              gross_amount: orderAmount,
              platform_fee: platformFee,
              status,
              buyer_email: buyerEmail,
              buyer_name: buyerName,
              sale_date: createdAt,
              payload: tx,
            },
            { onConflict: "platform,external_id,project_id" }
          );

        if (error) {
          console.error("Upsert error:", error);
        } else {
          imported++;
        }
      }

      const pagination = data.pagination || {};
      const totalItems = pagination.count || 0;
      const pageSize = pagination.page_size || 100;
      if (page * pageSize >= totalItems) {
        hasMore = false;
      } else {
        page++;
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
