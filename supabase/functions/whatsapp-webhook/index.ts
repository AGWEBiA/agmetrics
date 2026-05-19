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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    console.log("WhatsApp Webhook received:", JSON.stringify(body, null, 2));

    const { event, instance, data } = body;

    if (!instance) {
      return new Response(JSON.stringify({ error: "Missing instance name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find project by instance name
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id")
      .eq("evolution_instance_name", instance)
      .maybeSingle();

    if (projErr || !project) {
      console.warn(`Project not found for instance: ${instance}`);
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectId = project.id;

    // Handle group updates (Evolution API events)
    // Common events: groups.upsert, groups.update, group-participants.update
    if (event === "groups.upsert" || event === "groups.update" || event === "group-participants.update") {
      const groupData = event === "group-participants.update" ? data : data[0] || data;
      const jid = groupData.id || groupData.jid || groupData.remoteJid;
      
      if (jid) {
        // We might need to fetch full group info if it's just a participant update
        // But for now, let's just log and see if we can update the count if provided
        console.log(`Processing group event for JID: ${jid}`);
        
        // If it's a participant update, we usually get the action and who joined/left
        // This is complex to track perfectly without full fetch, 
        // but we can trigger a sync-whatsapp for this project to be sure
        await fetch(`${supabaseUrl}/functions/v1/sync-whatsapp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
            "x-sync-source": "auto-sync-cron" // Reuse cron logic bypass
          },
          body: JSON.stringify({ project_id: projectId }),
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("whatsapp-webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
