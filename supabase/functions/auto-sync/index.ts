import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-source",
};

async function callSync(supabaseUrl: string, serviceKey: string, fn: string, project_id: string): Promise<{ ok: boolean; text: string }> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "x-sync-source": "auto-sync-cron",
      },
      body: JSON.stringify({ project_id }),
      // 55 second timeout per call
      signal: AbortSignal.timeout(55000),
    });
    const text = await res.text();
    return { ok: res.ok, text };
  } catch (err) {
    return { ok: false, text: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Fetch all active projects
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from("projects")
      .select("id, name, kiwify_client_id, custom_api_url, custom_api_name")
      .eq("is_active", true);

    if (projectsError) throw projectsError;

    const projectList = projects || [];
    console.log(`[auto-sync] Starting sync for ${projectList.length} active projects`);

    // Check integration credentials existence (not values) for each project
    const credChecks = await Promise.all(
      projectList.map(async (project) => {
        const projectId = project.id;
        const [metaCredsRes, googleCredsRes, projectSecrets] = await Promise.all([
          supabaseAdmin.from("meta_credentials").select("id").eq("project_id", projectId).limit(1),
          supabaseAdmin.from("google_credentials").select("id").eq("project_id", projectId).maybeSingle(),
          supabaseAdmin.from("projects").select("hotmart_webhook_token, evolution_api_url, evolution_api_key, evolution_instance_name, custom_api_key").eq("id", projectId).single(),
        ]);

        const ps = projectSecrets.data;
        const syncs: { fn: string; label: string }[] = [];
        if ((metaCredsRes.data || []).length > 0) syncs.push({ fn: "sync-meta", label: "Meta Ads" });
        if (googleCredsRes.data) syncs.push({ fn: "sync-google", label: "Google Ads" });
        if (project.kiwify_client_id) syncs.push({ fn: "sync-kiwify", label: "Kiwify" });
        if (ps?.hotmart_webhook_token) syncs.push({ fn: "sync-hotmart", label: "Hotmart" });
        if (ps?.evolution_api_url && ps?.evolution_api_key && ps?.evolution_instance_name) {
          syncs.push({ fn: "sync-whatsapp", label: "WhatsApp" });
        }
        if (project.custom_api_url && ps?.custom_api_key) {
          syncs.push({ fn: "sync-custom-api", label: "API Customizada" });
        }

        return { projectId, projectName: project.name, syncs };
      })
    );

    const results: Record<string, any> = {};

    // Fire all syncs in parallel across all projects
    const allSyncPromises = credChecks.flatMap(({ projectId, projectName, syncs }) =>
      syncs.map(async ({ fn, label }) => {
        console.log(`[auto-sync] → ${label} for ${projectName}`);
        const result = await callSync(supabaseUrl, serviceKey, fn, projectId);
        if (result.ok) {
          console.log(`[auto-sync] ✅ ${label} ok for ${projectName}`);
        } else {
          console.warn(`[auto-sync] ⚠️ ${label} failed for ${projectName}: ${result.text.slice(0, 200)}`);
        }
        return { projectId, projectName, label, ...result };
      })
    );

    const allResults = await Promise.allSettled(allSyncPromises);

    for (const r of allResults) {
      if (r.status === "fulfilled") {
        const { projectId, projectName, label, ok } = r.value;
        if (!results[projectId]) results[projectId] = { name: projectName, synced: [], failed: [] };
        if (ok) results[projectId].synced.push(label);
        else results[projectId].failed.push(label);
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
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
