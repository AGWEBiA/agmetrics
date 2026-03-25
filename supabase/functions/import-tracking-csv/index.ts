import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { updates, project_id } = await req.json();
    if (!updates || !project_id) {
      return new Response(JSON.stringify({ error: "missing data" }), { status: 400, headers: corsHeaders });
    }

    let updated = 0;
    const batchSize = 50;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      for (const row of batch) {
        const { error } = await supabase
          .from("sales_events")
          .update({
            tracking_src: row.tracking_src || "",
            tracking_sck: row.tracking_sck || "",
            utm_source: row.utm_source || "",
            utm_medium: row.utm_medium || "",
            utm_campaign: row.utm_campaign || "",
            utm_content: row.utm_content || "",
            utm_term: row.utm_term || "",
          })
          .eq("external_id", row.external_id)
          .eq("project_id", project_id);
        
        if (!error) updated++;
      }
    }

    return new Response(JSON.stringify({ success: true, updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
