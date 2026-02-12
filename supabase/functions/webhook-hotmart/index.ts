import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-token, x-hotmart-hottok, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const projectId = pathParts[pathParts.length - 1] || url.searchParams.get("projectId");

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if project exists and get webhook token
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, hotmart_webhook_token")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate webhook token if configured
    if (project.hotmart_webhook_token) {
      const hottok = req.headers.get("x-hotmart-hottok") || url.searchParams.get("hottok") || payload?.hottok;
      if (hottok !== project.hotmart_webhook_token) {
        return new Response(
          JSON.stringify({ error: "Invalid webhook token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Extract data from Hotmart webhook payload
    const event = payload.event || "";
    const purchase = payload.data?.purchase || {};
    const product = purchase.product || payload.data?.product || {};
    const price = purchase.price || payload.data?.price || {};
    const buyer = purchase.buyer || payload.data?.buyer || {};

    const transactionId = purchase.transaction || payload.data?.transaction || "";
    const productName = product.name || "";
    const grossValue = parseFloat(price.value || "0");
    const netValue = parseFloat(price.net_value || price.value || "0");
    const buyerEmail = buyer.email || "";
    const buyerName = buyer.name || "";

    // Map Hotmart event/status to our status
    let status: string;
    const hotmartStatus = purchase.status || "";
    switch (event) {
      case "PURCHASE_COMPLETE":
      case "PURCHASE_APPROVED":
        status = "approved";
        break;
      case "PURCHASE_REFUNDED":
        status = "refunded";
        break;
      case "PURCHASE_CANCELED":
        status = "cancelled";
        break;
      default:
        status = hotmartStatus === "approved" ? "approved" : "pending";
    }

    // Parse sale date
    let saleDate: string;
    if (purchase.approved_date && typeof purchase.approved_date === "number") {
      saleDate = new Date(purchase.approved_date).toISOString();
    } else if (purchase.order_date) {
      saleDate = new Date(purchase.order_date).toISOString();
    } else {
      saleDate = new Date().toISOString();
    }

    const platformFee = Math.max(0, grossValue - netValue);

    // Match product — only accept sales for registered products
    const { data: matchedProduct } = await supabase
      .from("products")
      .select("type")
      .eq("project_id", projectId)
      .ilike("name", productName)
      .maybeSingle();

    if (!matchedProduct) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Product not registered in project", product_name: productName }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const productType = matchedProduct.type;

    // Upsert sale
    const { data: sale, error: saleError } = await supabase
      .from("sales_events")
      .upsert(
        {
          project_id: projectId,
          platform: "hotmart",
          external_id: transactionId,
          product_name: productName,
          product_type: productType,
          amount: netValue,
          gross_amount: grossValue,
          platform_fee: platformFee,
          status,
          buyer_email: buyerEmail,
          buyer_name: buyerName,
          sale_date: saleDate,
          payload,
        },
        { onConflict: "platform,external_id,project_id" }
      )
      .select()
      .single();

    if (saleError) {
      console.error("Error inserting sale:", saleError);
      return new Response(
        JSON.stringify({ error: saleError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sale_id: sale.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
