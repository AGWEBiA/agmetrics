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

    const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase().replace(/"/g, ""));
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
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h: string, idx: number) => { row[h] = (values[idx] || "").trim().replace(/^"|"$/g, ""); });

        // Flexible column mapping (supports Kiwify PT-BR exports)
        const externalId = row["transaction_id"] || row["order_id"] || row["external_id"] || row["id da venda"] || row["id"] || `csv-${i}`;
        const productName = row["product_name"] || row["produto"] || row["product"] || "";

        // Skip products not registered in the project
        const matchedProduct = (registeredProducts || []).find((p: any) => p.name.toLowerCase() === productName.toLowerCase());
        if (!matchedProduct) {
          skipped++;
          continue;
        }

        const grossAmount = parseFloat(row["gross_amount"] || row["total com acréscimo"] || row["total com acrescimo"] || row["valor_bruto"] || row["amount"] || row["valor"] || "0");
        const netAmount = parseFloat(row["net_amount"] || row["valor líquido"] || row["valor liquido"] || row["valor_liquido"] || row["net_value"] || String(grossAmount));
        const buyerEmail = row["buyer_email"] || row["email"] || "";
        const buyerName = row["buyer_name"] || row["cliente"] || row["nome"] || row["name"] || "";
        const status = mapStatus(row["status"] || "approved");
        const rawDate = row["sale_date"] || row["data de criação"] || row["data de criacao"] || row["data"] || row["date"] || row["created_at"] || "";
        const saleDate = parseDateFlexible(rawDate);

        const taxes = parseFloat(row["taxas"] || row["taxes"] || row["platform_tax"] || "0");
        const coproducerCommission = parseFloat(row["comissões dos coprodutores"] || row["comissoes dos coprodutores"] || row["coproducer_commission"] || "0");
        const platformFee = taxes > 0 ? taxes : Math.max(0, grossAmount - netAmount - coproducerCommission);

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

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += char; }
  }
  result.push(current);
  return result;
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
