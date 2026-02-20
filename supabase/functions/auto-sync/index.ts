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
    // Use service role for cron-triggered syncs (no user auth context)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all active projects
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from("projects")
      .select("id, name, owner_id, kiwify_webhook_token, kiwify_client_id, hotmart_webhook_token, evolution_api_url, evolution_api_key, evolution_instance_name")
      .eq("is_active", true);

    if (projectsError) throw projectsError;

    console.log(`[auto-sync] Starting sync for ${projects?.length || 0} active projects`);

    const results: Record<string, any> = {};

    for (const project of (projects || [])) {
      const projectId = project.id;
      results[projectId] = { name: project.name, synced: [] };

      // Check which integrations are configured for this project
      const { data: metaCreds } = await supabaseAdmin
        .from("meta_credentials")
        .select("id")
        .eq("project_id", projectId)
        .limit(1);

      const { data: googleCreds } = await supabaseAdmin
        .from("google_credentials")
        .select("id")
        .eq("project_id", projectId)
        .maybeSingle();

      const syncFunctions: { fn: string; label: string; enabled: boolean }[] = [
        { fn: "sync-meta", label: "Meta Ads", enabled: (metaCreds || []).length > 0 },
        { fn: "sync-google", label: "Google Ads", enabled: !!googleCreds },
        { fn: "sync-kiwify", label: "Kiwify", enabled: !!(project.kiwify_webhook_token || project.kiwify_client_id) },
        { fn: "sync-hotmart", label: "Hotmart", enabled: !!project.hotmart_webhook_token },
        { fn: "sync-whatsapp", label: "WhatsApp", enabled: !!(project.evolution_api_url && project.evolution_api_key && project.evolution_instance_name) },
      ];

      for (const { fn, label, enabled } of syncFunctions) {
        if (!enabled) continue;

        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          
          const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
              "x-sync-source": "auto-sync-cron",
            },
            body: JSON.stringify({ project_id: projectId }),
          });

          const responseText = await res.text();
          if (res.ok) {
            console.log(`[auto-sync] ✅ ${label} synced for project ${project.name}`);
            results[projectId].synced.push(label);
          } else {
            console.warn(`[auto-sync] ⚠️ ${label} failed for ${project.name}: ${responseText}`);
            results[projectId][label] = { error: responseText };
          }
        } catch (err) {
          console.error(`[auto-sync] ❌ ${label} error for ${project.name}:`, err);
          results[projectId][label] = { error: String(err) };
        }
      }
    }

    console.log("[auto-sync] Completed.");
    return new Response(
      JSON.stringify({ success: true, results, timestamp: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[auto-sync] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
