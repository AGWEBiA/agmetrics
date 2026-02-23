import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get credentials from secrets
    const clientId = Deno.env.get("HOTMART_CLIENT_ID");
    const clientSecret = Deno.env.get("HOTMART_CLIENT_SECRET");
    const basicAuth = Deno.env.get("HOTMART_BASIC_AUTH");

    if (!clientId || !clientSecret || !basicAuth) {
      return new Response(
        JSON.stringify({ error: "Hotmart credentials not configured. Add HOTMART_CLIENT_ID, HOTMART_CLIENT_SECRET, and HOTMART_BASIC_AUTH secrets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Step 1: Get access token from Hotmart
    const tokenRes = await fetch("https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
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

    let page = 0;
    let imported = 0;
    let skipped = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `https://developers.hotmart.com/payments/api/v1/sales/history?start_date=${thirtyDaysAgo}&end_date=${now}&max_results=50&page=${page}`;
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
        const matchedProduct = registeredProducts.find(
          (p: any) => p.name.toLowerCase() === productName.toLowerCase()
        );

        if (!matchedProduct) {
          skipped++;
          continue;
        }

        const transactionId = purchase.transaction || "";
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
              platform_fee: platformFee,
              status,
              buyer_email: buyerEmail,
              buyer_name: buyerName,
              sale_date: saleDate,
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

      // Check pagination
      if (items.length < 50) {
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
