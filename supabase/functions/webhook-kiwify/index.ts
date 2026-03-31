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
    const basePrice = parseFloat(
      String(payload["preço base do produto"] || "0").replace(",", ".")
    );
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
      createdAt, paymentMethod, installments, basePrice,
    };
  }

  // English format (standard Kiwify webhook/API)
  const orderId = payload.order_id || payload.subscription_id || "";
  const rawStatus = payload.order_status || "";
  const productName = payload.Product?.product_name || payload.product?.product_name || "";
  const basePrice = parseFloat(payload.Commissions?.product_base_price || payload.Product?.product_price || payload.product?.product_price || payload.product?.price || "0") / (payload.Commissions?.product_base_price ? 100 : 1);
  const grossAmount = payload.Commissions?.charge_amount
    ? parseFloat(payload.Commissions.charge_amount) / 100
    : parseFloat(payload.order_amount || payload.sale_amount || "0");
  const kiwifyFee = payload.Commissions?.kiwify_fee
    ? parseFloat(payload.Commissions.kiwify_fee) / 100
    : 0;
  const myCommission = payload.Commissions?.my_commission
    ? parseFloat(payload.Commissions.my_commission) / 100
    : 0;
  const netValue = myCommission || parseFloat(payload.net_value || payload.order_amount || "0");
  const platformFee = kiwifyFee || Math.max(0, grossAmount - netValue);
  const buyerEmail = payload.Customer?.email || payload.customer?.email || "";
  const buyerName = payload.Customer?.full_name || payload.customer?.full_name || "";
  const createdAt = payload.approved_date || payload.updated_at || payload.created_at || new Date().toISOString();
  const paymentMethod = payload.payment_method || payload.pagamento || "";
  const installments = parseInt(payload.installments || payload.parcelas || "1", 10);

  // Extract tracking from nested TrackingParameters (new Kiwify format)
  const trackingParams = payload.TrackingParameters || {};

  // Extract coproducer commission:
  // 1. Direct field co_production_commission (Kiwify's standard webhook field, in reais)
  // 2. Derive from Commissions breakdown: charge_amount - kiwify_fee - my_commission
  let coproducerCommission = 0;
  const rawCoProdCommission = parseFloat(payload.co_production_commission || payload.order?.co_production_commission || "0");
  if (rawCoProdCommission > 0) {
    coproducerCommission = rawCoProdCommission;
  } else if (payload.Commissions?.charge_amount && payload.Commissions?.kiwify_fee && payload.Commissions?.my_commission) {
    const chargeTotal = parseFloat(payload.Commissions.charge_amount) / 100;
    coproducerCommission = Math.max(0, chargeTotal - kiwifyFee - netValue);
  }

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
    taxes: 0, coproducerCommission, buyerEmail, buyerName, status,
    createdAt, paymentMethod, installments, basePrice,
    trackingParams,
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

  // Health check endpoint
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", function: "webhook-kiwify", timestamp: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const projectId = pathParts[pathParts.length - 1] || url.searchParams.get("projectId");

    // Input validation: projectId must be a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!projectId || !uuidRegex.test(projectId)) {
      return new Response(
        JSON.stringify({ error: "Valid projectId (UUID) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read raw body for HMAC signature verification
    const rawBody = await req.text();
    const rawPayload = JSON.parse(rawBody);
    console.log("Kiwify webhook received. Keys:", Object.keys(rawPayload).slice(0, 15));

    // Kiwify may send data nested under "order" key (dashboard format) or flat (webhook POST)
    const payload = rawPayload.order ? { ...rawPayload.order, _root_signature: rawPayload.signature } : rawPayload;

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
    // Kiwify uses HMAC-SHA1 signature verification: they sign the payload body
    // with the configured token as secret and send the signature in headers or query params
    if (project.kiwify_webhook_token) {
      const signatureHeader = req.headers.get("x-kiwify-signature")
        || req.headers.get("x-webhook-signature") 
        || req.headers.get("x-signature");
      const providedToken = req.headers.get("x-webhook-token")
        || url.searchParams.get("token")
        || rawPayload?.signature
        || payload?.webhook_token
        || payload?._root_signature;

      let isValid = false;

      // Method 1: Direct token match
      if (providedToken === project.kiwify_webhook_token) {
        isValid = true;
      }

      // Method 2: HMAC-SHA1 signature verification
      if (!isValid && (signatureHeader || providedToken)) {
        try {
          const sigToVerify = signatureHeader || providedToken;
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(project.kiwify_webhook_token),
            { name: "HMAC", hash: "SHA-1" },
            false,
            ["sign"]
          );
          const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
          const computedHex = Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
          isValid = computedHex === sigToVerify;
          if (!isValid) {
            console.log("HMAC mismatch. Computed:", computedHex.slice(0, 12) + "...", "Received:", String(sigToVerify).slice(0, 12) + "...");
          }
        } catch (hmacErr) {
          console.error("HMAC verification error:", hmacErr);
        }
      }

      // Method 3: If Kiwify doesn't send any token/signature, skip validation
      // (some Kiwify plans don't support signature verification)
      if (!isValid && !signatureHeader && !providedToken) {
        console.log("No signature/token provided by Kiwify, skipping validation");
        isValid = true;
      }

      if (!isValid) {
        console.error("Invalid webhook token/signature for project:", projectId);
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

    // Extract buyer location from payload
    const buyerCountry = payload.Customer?.country || payload["país"] || payload["country"] || "br";
    const buyerState = payload["estado"] || payload["state"] || "";
    const buyerCity = payload["cidade"] || payload["city"] || "";

    // Extract UTM tracking data from Kiwify payload (supports nested TrackingParameters and flat keys)
    const tp = sale.trackingParams || {};
    const utmSource = tp.utm_source || payload["tracking utm_source"] || payload["utm_source"] || "";
    const utmMedium = tp.utm_medium || payload["tracking utm_medium"] || payload["utm_medium"] || "";
    const utmCampaign = tp.utm_campaign || payload["tracking utm_campaign"] || payload["utm_campaign"] || "";
    const utmTerm = tp.utm_term || payload["tracking utm_term"] || payload["utm_term"] || "";
    const utmContent = tp.utm_content || payload["tracking utm_content"] || payload["utm_content"] || "";
    const trackingSrc = tp.src || payload["tracking src"] || payload["src"] || "";
    const trackingSck = tp.sck || payload["tracking sck"] || payload["sck"] || "";

    // Extract refund reason from Kiwify payload
    const refundReason = payload.refund_reason || payload.cancellation_reason || payload.reason || payload["motivo do reembolso"] || payload["motivo"] || null;

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
          base_price: sale.basePrice,
          platform_fee: sale.platformFee,
          taxes: sale.taxes,
          coproducer_commission: sale.coproducerCommission,
          status: sale.status,
          buyer_email: sale.buyerEmail,
          buyer_name: sale.buyerName,
          sale_date: sale.createdAt,
          payment_method: sale.paymentMethod,
          buyer_state: buyerState,
          buyer_city: buyerCity,
          buyer_country: buyerCountry,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_term: utmTerm,
          utm_content: utmContent,
          tracking_src: trackingSrc,
          tracking_sck: trackingSck,
          refund_reason: sale.status === "refunded" ? refundReason : null,
          payload: rawPayload,
        },
        { onConflict: "platform,external_id,project_id" }
      )
      .select()
      .single();

    if (saleError) {
      console.error("Error inserting sale:", saleError);
      return new Response(
        JSON.stringify({ error: "Failed to process sale" }),
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
