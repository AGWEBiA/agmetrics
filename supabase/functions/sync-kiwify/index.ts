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

    // Get API key from secrets
    const apiKey = Deno.env.get("KIWIFY_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "KIWIFY_API_KEY not configured. Add the secret in project settings." }),
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
      const url = `https://api.kiwify.com.br/v1/transactions?start_date=${startDate}&end_date=${endDate}&page=${page}&limit=100`;
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Kiwify API error:", res.status, errText);
        return new Response(
          JSON.stringify({ error: `Kiwify API error: ${res.status}`, details: errText }),
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
        const productName = tx.Product?.product_name || tx.product?.product_name || "";
        const matchedProduct = registeredProducts.find(
          (p: any) => p.name.toLowerCase() === productName.toLowerCase()
        );

        if (!matchedProduct) {
          skipped++;
          continue;
        }

        const orderId = tx.order_id || tx.subscription_id || "";
        const orderStatus = tx.order_status || "";
        const orderAmount = parseFloat(tx.order_amount || tx.sale_amount || "0");
        const netValue = parseFloat(tx.net_value || tx.order_amount || "0");
        const buyerEmail = tx.Customer?.email || tx.customer?.email || "";
        const buyerName = tx.Customer?.full_name || tx.customer?.full_name || "";
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

      // Check pagination
      const pagination = data.pagination || {};
      if (page >= (pagination.last_page || 1)) {
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
