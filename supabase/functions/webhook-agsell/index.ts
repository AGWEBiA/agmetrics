import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agsell-project-id",
};

interface FieldMapping {
  formField: string;
  targetField: string;
  enabled: boolean;
}

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

    // Get project with field mapping config
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, agsell_form_field_mapping")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event === "form_submission") {
      const mappings: FieldMapping[] = (project.agsell_form_field_mapping as FieldMapping[]) || [];
      const activeMappings = mappings.filter((m) => m.enabled && m.formField);

      // If no mappings configured, use default extraction (backwards compatible)
      let buyerName = "";
      let buyerEmail = "";
      let phone = "";
      let utmSource = "";
      let utmMedium = "";
      let utmCampaign = "";
      let eventDetail = form_id ? `form:${form_id}` : "form_submission";
      const customMetadata: Record<string, unknown> = {};

      if (activeMappings.length > 0) {
        // Use configured mapping — only extract mapped fields
        for (const mapping of activeMappings) {
          const value = data[mapping.formField];
          if (value === undefined || value === null) continue;

          switch (mapping.targetField) {
            case "buyer_name":
              buyerName = String(value);
              break;
            case "buyer_email":
              buyerEmail = String(value);
              break;
            case "phone":
              phone = String(value);
              break;
            case "utm_source":
              utmSource = String(value);
              break;
            case "utm_medium":
              utmMedium = String(value);
              break;
            case "utm_campaign":
              utmCampaign = String(value);
              break;
            case "event_detail":
              eventDetail = String(value);
              break;
            case "metadata_custom":
              customMetadata[mapping.formField] = value;
              break;
          }
        }
      } else {
        // Fallback: auto-detect common fields
        buyerName = data.nome || data.name || data.first_name || "";
        buyerEmail = data.email || data["e-mail"] || "";
        phone = data.telefone || data.phone || data.whatsapp || "";
      }

      // Build filtered raw_data with only mapped fields (or all if no mapping)
      const filteredData =
        activeMappings.length > 0
          ? Object.fromEntries(
              activeMappings
                .filter((m) => data[m.formField] !== undefined)
                .map((m) => [m.formField, data[m.formField]])
            )
          : data;

      const { error: insertErr } = await supabase.from("lead_events").insert({
        project_id: projectId,
        event_type: "agsell_form_submission",
        event_source: "agsell",
        event_detail: eventDetail,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        event_date: submitted_at || new Date().toISOString(),
        metadata: {
          contact_id,
          form_id,
          phone,
          ...customMetadata,
          raw_data: filteredData,
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
