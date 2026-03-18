import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Bulk-update tracking fields on sales_events from parsed spreadsheet rows.
 * Accepts: {
 *   project_id: string,
 *   rows: Array<{
 *     external_id: string,
 *     tracking_src?: string,
 *     tracking_sck?: string,
 *     utm_source?: string,
 *     utm_medium?: string,
 *     utm_campaign?: string,
 *     utm_content?: string,
 *     utm_term?: string,
 *     buyer_city?: string,
 *     buyer_state?: string,
 *     buyer_country?: string,
 *   }>
 * }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    // Verify auth
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { project_id, rows } = await req.json();
    if (!project_id || !rows || !Array.isArray(rows)) {
      return new Response(JSON.stringify({ error: "project_id and rows[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: project } = await supabase.from("projects").select("id, owner_id").eq("id", project_id).single();
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    const isAdmin = roleData?.role === "admin";
    if (!project || (!isAdmin && project.owner_id !== user.id)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    let skipped = 0;

    // Process in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const promises = batch.map(async (row: any) => {
        if (!row.external_id) { skipped++; return; }

        const updateData: Record<string, any> = {};
        if (row.tracking_src) updateData.tracking_src = row.tracking_src;
        if (row.tracking_sck) updateData.tracking_sck = row.tracking_sck;
        if (row.utm_source) updateData.utm_source = row.utm_source;
        if (row.utm_medium) updateData.utm_medium = row.utm_medium;
        if (row.utm_campaign) updateData.utm_campaign = row.utm_campaign;
        if (row.utm_content) updateData.utm_content = row.utm_content;
        if (row.utm_term) updateData.utm_term = row.utm_term;
        if (row.buyer_city) updateData.buyer_city = row.buyer_city;
        if (row.buyer_state) updateData.buyer_state = row.buyer_state;
        if (row.buyer_country) updateData.buyer_country = row.buyer_country;

        if (Object.keys(updateData).length === 0) { skipped++; return; }

        const { error } = await supabase
          .from("sales_events")
          .update(updateData)
          .eq("external_id", row.external_id)
          .eq("project_id", project_id)
          .eq("platform", "kiwify");

        if (error) {
          console.error(`Update error for ${row.external_id}:`, error);
          skipped++;
        } else {
          updated++;
        }
      });

      await Promise.all(promises);
    }

    console.log(`Tracking import: ${updated} updated, ${skipped} skipped`);
    return new Response(
      JSON.stringify({ success: true, updated, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Import error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
