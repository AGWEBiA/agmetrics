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
      signal: AbortSignal.timeout(45000),
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

    // Single query: fetch projects with credential flags using boolean expressions
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from("projects")
      .select("id, name, kiwify_client_id, custom_api_url, custom_api_name, hotmart_webhook_token, evolution_api_url, evolution_api_key, evolution_instance_name, custom_api_key, agsell_api_key")
      .eq("is_active", true);

    if (projectsError) throw projectsError;

    const projectList = projects || [];
    if (projectList.length === 0) {
      return new Response(
        JSON.stringify({ success: true, results: {}, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[auto-sync] ${projectList.length} projects`);

    // Check meta/google credentials in batch (single query each)
    const projectIds = projectList.map((p) => p.id);

    const [metaCredsRes, googleCredsRes] = await Promise.all([
      supabaseAdmin.from("meta_credentials").select("project_id").in("project_id", projectIds),
      supabaseAdmin.from("google_credentials").select("project_id").in("project_id", projectIds),
    ]);

    const metaProjectIds = new Set((metaCredsRes.data || []).map((r) => r.project_id));
    const googleProjectIds = new Set((googleCredsRes.data || []).map((r) => r.project_id));

    // Build sync tasks from pre-fetched data (no extra queries)
    const allSyncPromises: Promise<{ projectId: string; projectName: string; label: string; ok: boolean; text: string }>[] = [];

    for (const project of projectList) {
      const pid = project.id;
      const pname = project.name;
      const syncs: { fn: string; label: string }[] = [];

      if (metaProjectIds.has(pid)) syncs.push({ fn: "sync-meta", label: "Meta" });
      if (googleProjectIds.has(pid)) syncs.push({ fn: "sync-google", label: "Google" });
      if (project.kiwify_client_id) syncs.push({ fn: "sync-kiwify", label: "Kiwify" });
      if (project.hotmart_webhook_token) syncs.push({ fn: "sync-hotmart", label: "Hotmart" });
      if (project.evolution_api_url && project.evolution_api_key && project.evolution_instance_name) {
        syncs.push({ fn: "sync-whatsapp", label: "WhatsApp" });
      }
      if (project.custom_api_url && project.custom_api_key) {
        syncs.push({ fn: "sync-custom-api", label: "Custom API" });
      }
      if (project.agsell_api_key) {
        syncs.push({ fn: "sync-agsell", label: "AG Sell" });
      }

      for (const { fn, label } of syncs) {
        allSyncPromises.push(
          callSync(supabaseUrl, serviceKey, fn, pid).then((result) => ({
            projectId: pid,
            projectName: pname,
            label,
            ...result,
          }))
        );
      }
    }

    if (allSyncPromises.length === 0) {
      return new Response(
        JSON.stringify({ success: true, results: {}, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[auto-sync] ${allSyncPromises.length} sync tasks`);

    const allResults = await Promise.allSettled(allSyncPromises);

    const results: Record<string, { name: string; synced: string[]; failed: string[] }> = {};
    for (const r of allResults) {
      if (r.status === "fulfilled") {
        const { projectId, projectName, label, ok } = r.value;
        if (!results[projectId]) results[projectId] = { name: projectName, synced: [], failed: [] };
        if (ok) results[projectId].synced.push(label);
        else results[projectId].failed.push(label);
      }
    }

    console.log("[auto-sync] Done");
    return new Response(
      JSON.stringify({ success: true, results, timestamp: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[auto-sync] Fatal:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
