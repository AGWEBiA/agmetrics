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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if project exists
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
