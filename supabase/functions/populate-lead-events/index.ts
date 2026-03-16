import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-source, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify project access
    const { data: project } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", project_id)
      .single();

    if (!project || project.owner_id !== user.id) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      if (roleData?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch all sales for project
    const { data: sales } = await supabase
      .from("sales_events")
      .select("*")
      .eq("project_id", project_id)
      .eq("is_ignored", false)
      .order("sale_date", { ascending: true });

    if (!sales || sales.length === 0) {
      return new Response(
        JSON.stringify({ success: true, events_created: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch meta ads for cross-referencing
    const { data: metaAds } = await supabase
      .from("meta_ads")
      .select("ad_id, ad_name")
      .eq("project_id", project_id);
    const adMap = new Map((metaAds || []).map((a: any) => [a.ad_id, a.ad_name]));

    // Build lead events from sales
    const leadEvents: any[] = [];
    for (const sale of sales) {
      const baseEvent = {
        project_id,
        buyer_email: sale.buyer_email,
        buyer_name: sale.buyer_name,
        utm_source: sale.utm_source || null,
        utm_medium: sale.utm_medium || null,
        utm_campaign: sale.utm_campaign || null,
        utm_content: sale.utm_content || null,
        utm_term: sale.utm_term || null,
        tracking_src: sale.tracking_src || null,
        tracking_sck: sale.tracking_sck || null,
        sale_id: sale.id,
      };

      // Determine ad attribution from utm_content or tracking_sck
      let adId: string | null = null;
      let adName: string | null = null;
      if (sale.utm_content) {
        // Try to match ad ID from utm_content
        for (const [id, name] of adMap.entries()) {
          if (sale.utm_content.includes(id)) {
            adId = id;
            adName = name as string;
            break;
          }
        }
      }

      // Create "ad_click" event if we have UTM data
      if (sale.utm_source || sale.tracking_src) {
        leadEvents.push({
          ...baseEvent,
          event_type: "ad_click",
          event_source: sale.utm_source || sale.tracking_src || sale.platform,
          event_detail: sale.utm_campaign || sale.tracking_sck || null,
          ad_id: adId,
          ad_name: adName,
          event_date: sale.sale_date || sale.created_at,
        });
      }

      // Create purchase/lead event
      const eventType = sale.status === "approved" ? "purchase"
        : sale.status === "pending" ? "checkout"
        : sale.status === "refunded" ? "refund"
        : "other";

      leadEvents.push({
        ...baseEvent,
        event_type: eventType,
        event_source: sale.platform,
        event_detail: sale.product_name,
        ad_id: adId,
        ad_name: adName,
        amount: sale.amount || 0,
        event_date: sale.sale_date || sale.created_at,
      });
    }

    // Delete existing events and insert new ones
    await supabase
      .from("lead_events")
      .delete()
      .eq("project_id", project_id);

    let created = 0;
    const BATCH_SIZE = 50;
    for (let i = 0; i < leadEvents.length; i += BATCH_SIZE) {
      const batch = leadEvents.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("lead_events").insert(batch);
      if (!error) created += batch.length;
      else console.error("[populate-lead-events] Insert error:", error.message);
    }

    return new Response(
      JSON.stringify({ success: true, events_created: created, sales_processed: sales.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[populate-lead-events] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
