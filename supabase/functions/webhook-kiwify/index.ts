import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-token, x-hotmart-hottok, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Extracts sale data from Kiwify webhook payload.
 * Supports both English (API format) and Portuguese (Kiwify panel/CSV format).
 */
function extractSaleData(payload: Record<string, any>) {
  const isPtBr = !!(payload["id da venda"] || payload["produto"] || payload["valor líquido"]);

  if (isPtBr) {
    const orderId = payload["id da venda"] || "";
    const rawStatus = (payload["status"] || "").toLowerCase();
    const productName = payload["produto"] || "";
    const grossAmount = parseFloat(
      String(payload["total com acréscimo"] || payload["preço base do produto"] || "0").replace(",", ".")
    );
    const netValue = parseFloat(
      String(payload["valor líquido"] || "0").replace(",", ".")
    );
    const platformFee = parseFloat(
      String(payload["taxas"] || "0").replace(",", ".")
    );
    const taxes = parseFloat(
      String(payload["imposto"] || payload["imposto de compra em moeda da conta"] || "0").replace(",", ".")
    );
    const coproducerCommission = parseFloat(
      String(payload["comissões dos coprodutores"] || payload["comissão do afiliado"] || "0").replace(",", ".")
    );
    const buyerEmail = payload["email"] || "";
    const buyerName = payload["cliente"] || "";
    const paymentMethod = payload["pagamento"] || "";
    const installments = parseInt(payload["parcelas"] || "1", 10);

    let createdAt = new Date().toISOString();
    const rawDate = payload["data de criação"] || "";
    if (rawDate) {
      const match = rawDate.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
      if (match) {
        createdAt = new Date(
          parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]),
          parseInt(match[4]), parseInt(match[5]), parseInt(match[6])
        ).toISOString();
      }
    }

    let status: string;
    switch (rawStatus) {
      case "paid": case "completed": case "aprovado":
        status = "approved"; break;
      case "refunded": case "reembolsado":
        status = "refunded"; break;
      case "cancelled": case "canceled": case "cancelado":
        status = "cancelled"; break;
      default:
        status = "pending";
    }

    return {
      orderId, productName, grossAmount, netValue, platformFee,
      taxes, coproducerCommission, buyerEmail, buyerName, status,
      createdAt, paymentMethod, installments,
    };
  }

  // English format (standard Kiwify webhook/API)
  const orderId = payload.order_id || payload.subscription_id || "";
  const rawStatus = payload.order_status || "";
  const productName = payload.Product?.product_name || payload.product?.product_name || "";
  const grossAmount = parseFloat(payload.order_amount || payload.sale_amount || "0");
  const netValue = parseFloat(payload.net_value || payload.order_amount || "0");
  const platformFee = Math.max(0, grossAmount - netValue);
  const buyerEmail = payload.Customer?.email || payload.customer?.email || "";
  const buyerName = payload.Customer?.full_name || payload.customer?.full_name || "";
  const createdAt = payload.created_at || new Date().toISOString();
  const paymentMethod = payload.pagamento || payload.payment_method || "";
  const installments = parseInt(payload.parcelas || payload.installments || "1", 10);

  let status: string;
  switch (rawStatus) {
    case "paid": case "completed":
      status = "approved"; break;
    case "refunded":
      status = "refunded"; break;
    case "cancelled": case "canceled":
      status = "cancelled"; break;
    default:
      status = "pending";
  }

  return {
    orderId, productName, grossAmount, netValue, platformFee,
    taxes: 0, coproducerCommission: 0, buyerEmail, buyerName, status,
    createdAt, paymentMethod, installments,
  };
}

/**
 * Finds the best matching product for a sale using multiple strategies:
 * 1. Exact match (ilike)
 * 2. Partial match (product name contains or is contained in sale product name)
 * 3. Fallback to first "main" product if only one exists
 */
async function findMatchingProduct(
  supabase: any,
  projectId: string,
  saleProductName: string
): Promise<{ type: string; name: string } | null> {
  // Strategy 1: exact match
  const { data: exact } = await supabase
    .from("products")
    .select("type, name")
    .eq("project_id", projectId)
    .ilike("name", saleProductName)
    .maybeSingle();

  if (exact) return exact;

  // Strategy 2: partial match — sale product name contains registered name or vice-versa
  const { data: allProducts } = await supabase
    .from("products")
    .select("type, name")
    .eq("project_id", projectId);

  if (allProducts && allProducts.length > 0) {
    const saleLower = saleProductName.toLowerCase();
    
    // Check if any registered product name is contained in the sale product name
    for (const p of allProducts) {
      const pLower = p.name.toLowerCase();
      if (saleLower.includes(pLower) || pLower.includes(saleLower)) {
        console.log(`Partial match: "${saleProductName}" matched with "${p.name}"`);
        return p;
      }
    }

    // Strategy 3: if there's only one main product, use it as fallback
    const mainProducts = allProducts.filter((p: any) => p.type === "main");
    if (mainProducts.length === 1) {
      console.log(`Fallback: using single main product "${mainProducts[0].name}" for "${saleProductName}"`);
      return mainProducts[0];
    }
  }

  return null;
}

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
    console.log("Kiwify webhook received. Keys:", Object.keys(payload).slice(0, 15));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, kiwify_webhook_token")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project not found:", projectId);
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate webhook token if configured
    if (project.kiwify_webhook_token) {
      const providedToken = req.headers.get("x-webhook-token") || url.searchParams.get("token") || payload?.webhook_token;
      if (providedToken !== project.kiwify_webhook_token) {
        console.error("Invalid webhook token for project:", projectId);
        return new Response(
          JSON.stringify({ error: "Invalid webhook token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const sale = extractSaleData(payload);
    console.log("Extracted sale:", JSON.stringify({ orderId: sale.orderId, productName: sale.productName, gross: sale.grossAmount, net: sale.netValue, status: sale.status }));

    if (!sale.orderId) {
      console.error("No order ID extracted from payload");
      return new Response(
        JSON.stringify({ error: "Could not extract order ID from payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find matching product with flexible matching
    const matchedProduct = await findMatchingProduct(supabase, projectId, sale.productName);

    if (!matchedProduct) {
      console.log("Product not registered:", sale.productName, "for project:", projectId);
      return new Response(
        JSON.stringify({ skipped: true, reason: "Product not registered in project", product_name: sale.productName }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Matched product:", matchedProduct.name, "type:", matchedProduct.type);

    const { data: saleRecord, error: saleError } = await supabase
      .from("sales_events")
      .upsert(
        {
          project_id: projectId,
          platform: "kiwify",
          external_id: sale.orderId,
          product_name: sale.productName,
          product_type: matchedProduct.type,
          amount: sale.netValue,
          gross_amount: sale.grossAmount,
          platform_fee: sale.platformFee,
          taxes: sale.taxes,
          coproducer_commission: sale.coproducerCommission,
          status: sale.status,
          buyer_email: sale.buyerEmail,
          buyer_name: sale.buyerName,
          sale_date: sale.createdAt,
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

    console.log("Sale upserted successfully:", saleRecord.id);
    return new Response(
      JSON.stringify({ success: true, sale_id: saleRecord.id }),
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
