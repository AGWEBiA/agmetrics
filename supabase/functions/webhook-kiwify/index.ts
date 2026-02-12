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
      .select("id, kiwify_webhook_token")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate webhook token if configured
    if (project.kiwify_webhook_token) {
      const providedToken = req.headers.get("x-webhook-token") || url.searchParams.get("token") || payload?.webhook_token;
      if (providedToken !== project.kiwify_webhook_token) {
        return new Response(
          JSON.stringify({ error: "Invalid webhook token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Extract data from Kiwify webhook payload
    const orderId = payload.order_id || payload.subscription_id || "";
    const orderStatus = payload.order_status || "";
    const productName = payload.Product?.product_name || payload.product?.product_name || "";
    const orderAmount = parseFloat(payload.order_amount || payload.sale_amount || "0");
    const netValue = parseFloat(payload.net_value || payload.order_amount || "0");
    const buyerEmail = payload.Customer?.email || payload.customer?.email || "";
    const buyerName = payload.Customer?.full_name || payload.customer?.full_name || "";
    const createdAt = payload.created_at || new Date().toISOString();

    // Map Kiwify status to our status
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

    // Try to match product type
    let productType: string | null = null;
    if (productName) {
      const { data: matchedProduct } = await supabase
        .from("products")
        .select("type")
        .eq("project_id", projectId)
        .ilike("name", productName)
        .maybeSingle();
      if (matchedProduct) {
        productType = matchedProduct.type;
      }
    }

    // Upsert sale (deduplication by platform + external_id + project_id)
    const { data: sale, error: saleError } = await supabase
      .from("sales_events")
      .upsert(
        {
          project_id: projectId,
          platform: "kiwify",
          external_id: orderId,
          product_name: productName,
          product_type: productType,
          amount: netValue,
          gross_amount: orderAmount,
          platform_fee: platformFee,
          status,
          buyer_email: buyerEmail,
          buyer_name: buyerName,
          sale_date: createdAt,
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
