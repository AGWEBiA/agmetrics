import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, updates } = await req.json();

    if (!projectId || !Array.isArray(updates) || updates.length === 0) {
      return new Response(JSON.stringify({ error: "projectId and updates[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let updated = 0;
    let errors = 0;

    // Process in batches of 50
    for (let i = 0; i < updates.length; i += 50) {
      const batch = updates.slice(i, i + 50);
      const promises = batch.map(async (u: any) => {
        const { error } = await supabase
          .from("sales_events")
          .update({
            utm_source: u.utm_source || "",
            utm_medium: u.utm_medium || "",
            utm_campaign: u.utm_campaign || "",
            utm_content: u.utm_content || "",
            utm_term: u.utm_term || "",
            tracking_src: u.tracking_src || "",
            tracking_sck: u.tracking_sck || "",
          })
          .eq("external_id", u.external_id)
          .eq("project_id", projectId)
          .eq("platform", "kiwify");

        if (error) {
          errors++;
          console.error(`Error updating ${u.external_id}:`, error.message);
        } else {
          updated++;
        }
      });
      await Promise.all(promises);
    }

    return new Response(JSON.stringify({ updated, errors, total: updates.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
