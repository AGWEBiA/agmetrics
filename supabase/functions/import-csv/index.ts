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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("project_id") as string;
    const platform = formData.get("platform") as string;

    if (!file || !projectId || !platform) {
      return new Response(JSON.stringify({ error: "file, project_id, and platform are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership OR admin role
    const { data: project } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", projectId)
      .single();

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = roleData?.role === "admin";
    if (!project || (!isAdmin && project.owner_id !== user.id)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((l: string) => l.trim());
    if (lines.length < 2) {
      return new Response(JSON.stringify({ error: "CSV must have at least a header and one data row" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-detect delimiter: semicolon (Hotmart) or comma (Kiwify)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(";") ? ";" : ",";
    console.log(`[import-csv] Detected delimiter: "${delimiter}"`);

    const headers = splitCSVLine(firstLine, delimiter).map((h: string) => h.trim().toLowerCase().replace(/"/g, "").replace(/^\uFEFF/, ""));
    console.log(`[import-csv] Headers found: ${JSON.stringify(headers.slice(0, 10))}...`);
    // Load registered products for this project
    const { data: registeredProducts } = await supabase
      .from("products")
      .select("name, type")
      .eq("project_id", projectId);

    const productNames = (registeredProducts || []).map((p: any) => p.name.toLowerCase());

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = splitCSVLine(lines[i], delimiter);
        const row: Record<string, string> = {};
        headers.forEach((h: string, idx: number) => { row[h] = (values[idx] || "").trim().replace(/^"|"$/g, ""); });

        // Flexible column mapping (supports Kiwify and Hotmart PT-BR exports)
        const externalId = row["transaction_id"] || row["order_id"] || row["external_id"] || row["id da venda"] || row["id"] || row["código da transação"] || row["codigo da transacao"] || `csv-${i}`;
        const productName = row["product_name"] || row["produto"] || row["product"] || "";

        // Flexible product matching: exact → partial → single main fallback
        let matchedProduct = (registeredProducts || []).find((p: any) => p.name.toLowerCase() === productName.toLowerCase());
        if (!matchedProduct) {
          const saleLower = productName.toLowerCase();
          matchedProduct = (registeredProducts || []).find((p: any) => {
            const pLower = p.name.toLowerCase();
            return saleLower.includes(pLower) || pLower.includes(saleLower);
          });
        }
        if (!matchedProduct) {
          const mainProducts = (registeredProducts || []).filter((p: any) => p.type === "main");
          if (mainProducts.length === 1) matchedProduct = mainProducts[0];
        }
        if (!matchedProduct) {
          console.log(`[import-csv] Skipped: product "${productName}" not found in project`);
          skipped++;
          continue;
        }

        // Hotmart CSV columns: "valor de compra sem impostos" (gross), "faturamento líquido" (net), "faturamento líquido do(a) produtor(a)" (producer net)
        const grossAmount = parseBRNumber(row["gross_amount"] || row["total com acréscimo"] || row["total com acrescimo"] || row["valor_bruto"] || row["amount"] || row["valor"] || row["valor de compra sem impostos"] || row["faturamento bruto (sem impostos)"] || "0");
        const netAmount = parseBRNumber(row["net_amount"] || row["valor líquido"] || row["valor liquido"] || row["valor_liquido"] || row["net_value"] || row["faturamento líquido"] || row["faturamento liquido"] || row["faturamento líquido do(a) produtor(a)"] || row["faturamento liquido do(a) produtor(a)"] || String(grossAmount));
        const buyerEmail = row["buyer_email"] || row["email"] || row["email do(a) comprador(a)"] || "";
        const buyerName = row["buyer_name"] || row["cliente"] || row["nome"] || row["name"] || row["comprador(a)"] || "";
        const rawStatus = row["status"] || row["status da transação"] || row["status da transacao"] || "approved";
        const status = mapStatus(rawStatus);
        const rawDate = row["sale_date"] || row["data de criação"] || row["data de criacao"] || row["data"] || row["date"] || row["created_at"] || row["data da transação"] || row["data da transacao"] || "";
        const saleDate = parseDateFlexible(rawDate);

        // Hotmart-specific: "taxa de processamento" for platform fee, "faturamento do(a) coprodutor(a)" for coproducer
        const taxes = parseBRNumber(row["taxas"] || row["taxes"] || row["platform_tax"] || row["taxa de processamento"] || "0");
        const coproducerCommission = parseBRNumber(row["comissões dos coprodutores"] || row["comissoes dos coprodutores"] || row["coproducer_commission"] || row["faturamento do(a) coprodutor(a)"] || "0");
        const platformFee = taxes > 0 ? taxes : Math.max(0, grossAmount - netAmount - coproducerCommission);

        // Hotmart tracking columns
        const paymentMethod = row["payment_method"] || row["método de pagamento"] || row["metodo de pagamento"] || "";
        const trackingSrc = row["código src"] || row["codigo src"] || "";
        const trackingSck = row["código sck"] || row["codigo sck"] || "";
        const buyerState = row["estado / província"] || row["estado / provincia"] || row["buyer_state"] || "";
        const buyerCity = row["cidade"] || row["buyer_city"] || "";
        const buyerCountry = row["país"] || row["pais"] || row["buyer_country"] || "";

        // Use registered product type
        const productType = matchedProduct.type || "main";

        const { error: upsertError } = await supabase
          .from("sales_events")
          .upsert(
            {
              project_id: projectId,
              platform,
              external_id: externalId,
              product_name: productName,
              product_type: productType,
              amount: netAmount,
              gross_amount: grossAmount,
              platform_fee: platformFee,
              taxes,
              coproducer_commission: coproducerCommission,
              status,
              buyer_email: buyerEmail,
              buyer_name: buyerName,
              sale_date: saleDate,
              payment_method: paymentMethod || undefined,
              tracking_src: trackingSrc || undefined,
              tracking_sck: trackingSck || undefined,
              buyer_state: buyerState || undefined,
              buyer_city: buyerCity || undefined,
              buyer_country: buyerCountry || undefined,
              payload: row,
            },
            { onConflict: "platform,external_id,project_id" }
          );

        if (upsertError) {
          errors.push(`Row ${i + 1}: ${upsertError.message}`);
          skipped++;
        } else {
          imported++;
        }
      } catch (rowErr) {
        errors.push(`Row ${i + 1}: parse error`);
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported, skipped, errors: errors.slice(0, 10) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("CSV import error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === delimiter && !inQuotes) { result.push(current); current = ""; }
    else { current += char; }
  }
  result.push(current);
  return result;
}

// Parse Brazilian number format: "1.234,56" → 1234.56
function parseBRNumber(value: string): number {
  if (!value || value === "(none)") return 0;
  // If contains comma as decimal separator (BR format)
  if (value.includes(",") && value.includes(".")) {
    return parseFloat(value.replace(/\./g, "").replace(",", "."));
  }
  if (value.includes(",") && !value.includes(".")) {
    return parseFloat(value.replace(",", "."));
  }
  return parseFloat(value) || 0;
}

function mapStatus(s: string): string {
  const lower = s.toLowerCase().trim();
  if (["paid", "completed", "approved", "aprovado"].includes(lower)) return "approved";
  if (["refunded", "reembolsado"].includes(lower)) return "refunded";
  if (["cancelled", "canceled", "cancelado"].includes(lower)) return "cancelled";
  return "pending";
}

function parseDateFlexible(raw: string): string {
  if (!raw || !raw.trim()) return new Date().toISOString();
  // Try DD/MM/YYYY HH:mm:ss (Brazilian format)
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (brMatch) {
    const [, day, month, year, hour, min, sec] = brMatch;
    return `${year}-${month}-${day}T${hour}:${min}:${sec}+00:00`;
  }
  // Try DD/MM/YYYY (no time)
  const brDateOnly = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDateOnly) {
    const [, day, month, year] = brDateOnly;
    return `${year}-${month}-${day}T00:00:00+00:00`;
  }
  // Already ISO or other parseable format
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString();
}
