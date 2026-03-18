import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agsell-project-id",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const projectId = req.headers.get("x-agsell-project-id");
    if (!projectId || projectId.length < 32) {
      return new Response(JSON.stringify({ error: "Missing x-agsell-project-id header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { event, form_id, data, contact_id, submitted_at } = body;

    if (!event || !data) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify project exists
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract common fields from form submission
    const buyerName = data.nome || data.name || data.first_name || "";
    const buyerEmail = data.email || data["e-mail"] || "";
    const phone = data.telefone || data.phone || data.whatsapp || "";

    if (event === "form_submission") {
      // Insert as a lead event
      const { error: insertErr } = await supabase.from("lead_events").insert({
        project_id: projectId,
        event_type: "agsell_form_submission",
        event_source: "agsell",
        event_detail: form_id ? `form:${form_id}` : "form_submission",
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        event_date: submitted_at || new Date().toISOString(),
        metadata: {
          contact_id,
          form_id,
          phone,
          raw_data: data,
        },
      });

      if (insertErr) {
        console.error("Insert lead_event error:", insertErr);
        return new Response(JSON.stringify({ error: "Failed to store event" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("webhook-agsell error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
