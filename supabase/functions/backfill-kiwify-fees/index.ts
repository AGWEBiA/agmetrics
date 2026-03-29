import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function getOAuthToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch("https://public-api.kiwify.com/v1/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) throw new Error(`OAuth error: ${res.status}`);
  return (await res.json()).access_token;
}

async function fetchWithRetry(url: string, headers: Record<string, string>, retries = 5): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      const wait = Math.min(3000 * Math.pow(2, i), 30000);
      console.warn(`[backfill] 429 rate limited, waiting ${wait}ms`);
      await res.text();
      await sleep(wait);
      continue;
    }
    return res;
  }
  return fetch(url, { headers });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    // This function can be called with service role key (internal) or skip auth entirely
    // Since it's a one-time backfill, we just validate project_id exists

    const { project_id, batch_size = 50 } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project with credentials
    const { data: project } = await supabase.from("projects").select("id, owner_id, kiwify_client_id, kiwify_client_secret, kiwify_account_id").eq("id", project_id).single();
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { kiwify_client_id: clientId, kiwify_client_secret: clientSecret, kiwify_account_id: accountId } = project;
    if (!clientId || !clientSecret || !accountId) {
      return new Response(JSON.stringify({ error: "Kiwify credentials not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OAuth token
    const bearerToken = await getOAuthToken(clientId, clientSecret);

    const apiHeaders = {
      "Authorization": `Bearer ${bearerToken}`,
      "x-kiwify-account-id": accountId,
      "Content-Type": "application/json",
    };

    // Fetch sales missing platform_fee (exclude ones already attempted with error)
    const { data: salesMissingFee, error: fetchError } = await supabase
      .from("sales_events")
      .select("id, external_id, amount, gross_amount, base_price, payload")
      .eq("project_id", project_id)
      .eq("platform", "kiwify")
      .eq("status", "approved")
      .eq("is_ignored", false)
      .or("platform_fee.eq.0,platform_fee.is.null")
      .order("sale_date", { ascending: false })
      .limit(batch_size);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch sales" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!salesMissingFee || salesMissingFee.length === 0) {
      return new Response(JSON.stringify({ success: true, updated: 0, remaining: 0, message: "All fees are up to date" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Count remaining
    const { count: totalRemaining } = await supabase
      .from("sales_events")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project_id)
      .eq("platform", "kiwify")
      .eq("status", "approved")
      .eq("is_ignored", false)
      .or("platform_fee.eq.0,platform_fee.is.null");

    let updated = 0;
    let errors = 0;

    for (const sale of salesMissingFee) {
      // Use payload.id (UUID) if available, fallback to external_id
      const existingPayload = (sale.payload && typeof sale.payload === 'object') ? sale.payload as Record<string, unknown> : {};
      const orderId = (existingPayload.id as string) || sale.external_id;
      if (!orderId) { errors++; continue; }

      // Skip already-attempted sales that returned errors
      if (existingPayload._detail && typeof existingPayload._detail === 'object' && (existingPayload._detail as Record<string, unknown>).error) {
        // Clear old error detail and retry with correct ID
      }

      try {
        const detailUrl = `https://public-api.kiwify.com/v1/sales/${orderId}`;
        const detailRes = await fetchWithRetry(detailUrl, apiHeaders);

        if (!detailRes.ok) {
          if (detailRes.status === 429) {
            console.warn(`[backfill] Rate limited on ${orderId}, stopping batch`);
            break;
          }
          await detailRes.text();
          errors++;
          await sleep(200);
          continue;
        }

        const detail = await detailRes.json();
        const commissions = detail.Commissions || detail.commissions || {};
        const payment = detail.payment || detail.Payment || {};

        // Extract fee (in cents)
        const rawKiwifyFee = parseFloat(commissions.kiwify_fee || "0") / 100;
        const rawFeeAmount = parseFloat(payment.fee_amount || detail.fee_amount || "0") / 100;
        const rawTaxas = parseFloat(detail.taxas || "0"); // already in decimal

        // Extract charge amount
        const rawCharge = parseFloat(payment.charge_amount || detail.charge_amount || "0") / 100;
        const rawMyCommission = parseFloat(commissions.my_commission || "0") / 100;

        // Determine platform fee
        let platformFee = 0;
        if (rawTaxas > 0) {
          platformFee = rawTaxas;
        } else if (rawKiwifyFee > 0) {
          platformFee = rawKiwifyFee;
        } else if (rawFeeAmount > 0) {
          platformFee = rawFeeAmount;
        } else if (rawCharge > 0 && rawMyCommission > 0) {
          // Derive: charge - my_commission = total deductions (fee + coproducer)
          platformFee = Math.max(0, rawCharge - rawMyCommission);
        }

        // Also update gross_amount if missing
        const grossAmount = rawCharge > 0 ? rawCharge : (sale.gross_amount || sale.amount);

        // Coproducer commission
        let coproducerCommission = 0;
        if (rawKiwifyFee > 0 && rawMyCommission > 0 && rawCharge > 0) {
          coproducerCommission = Math.max(0, rawCharge - rawKiwifyFee - rawMyCommission);
        }

        // Merge detail into existing payload
        const updatedPayload = { ...existingPayload, _detail: detail };

        const updateData: Record<string, unknown> = {
          platform_fee: platformFee,
          payload: updatedPayload,
        };
        if (rawCharge > 0) {
          updateData.gross_amount = grossAmount;
          updateData.base_price = rawCharge;
        }
        if (coproducerCommission > 0) {
          updateData.coproducer_commission = coproducerCommission;
        }

        const { error: updateError } = await supabase
          .from("sales_events")
          .update(updateData)
          .eq("id", sale.id);

        if (updateError) {
          console.error(`[backfill] Update error for ${orderId}:`, updateError);
          errors++;
        } else {
          updated++;
        }
      } catch (e) {
        console.error(`[backfill] Error for ${orderId}:`, e);
        errors++;
      }

      await sleep(250); // Rate limit protection
    }

    const remaining = (totalRemaining || 0) - updated;

    return new Response(JSON.stringify({
      success: true,
      updated,
      errors,
      remaining: Math.max(0, remaining),
      message: remaining > 0
        ? `Updated ${updated} sales. ${remaining} remaining — call again to continue.`
        : `All ${updated} sales updated successfully!`
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[backfill] Fatal:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
