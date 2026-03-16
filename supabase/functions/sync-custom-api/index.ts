import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-source, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const syncSource = req.headers.get("x-sync-source");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    const token = authHeader.replace("Bearer ", "");
    const isInternalCron = syncSource === "auto-sync-cron" && token === serviceRoleKey;

    let userId: string | null = null;

    if (!isInternalCron) {
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify ownership for non-cron calls
    if (!isInternalCron && userId) {
      const { data: project } = await supabase
        .from("projects")
        .select("id, owner_id")
        .eq("id", project_id)
        .single();

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      const isAdmin = roleData?.role === "admin";
      if (!project || (!isAdmin && project.owner_id !== userId)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!isInternalCron) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get custom API config from project
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("custom_api_url, custom_api_key, custom_api_name, custom_api_endpoints")
      .eq("id", project_id)
      .single();

    if (projectError || !projectData) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { custom_api_url, custom_api_key, custom_api_endpoints } = projectData;

    if (!custom_api_url || !custom_api_key) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: "API customizada não configurada neste projeto." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use custom endpoints if defined, otherwise fall back to defaults
    const defaultEndpoints = [
      { path: "/metrics/overview?period=30d", label: "overview" },
      { path: "/metrics/campaigns?period=30d", label: "campaigns" },
      { path: "/metrics/contacts", label: "contacts" },
      { path: "/metrics/automations", label: "automations" },
    ];

    const endpoints: { path: string; label: string }[] =
      Array.isArray(custom_api_endpoints) && custom_api_endpoints.length > 0
        ? custom_api_endpoints
        : defaultEndpoints;

    let synced = 0;
    const errors: string[] = [];

    for (const endpoint of endpoints) {
      try {
        const url = `${custom_api_url.replace(/\/$/, "")}${endpoint.path}`;
        console.log(`[sync-custom-api] Fetching ${endpoint.label}: ${url}`);

        const res = await fetch(url, {
          method: "GET",
          headers: {
            "X-API-Key": custom_api_key,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[sync-custom-api] ${endpoint.label} failed (${res.status}): ${errText.slice(0, 200)}`);
          if (res.status !== 404) {
            errors.push(`${endpoint.label}: ${res.status}`);
          }
          continue;
        }

        const data = await res.json();

        const { error: upsertError } = await supabase
          .from("custom_api_metrics")
          .upsert(
            {
              project_id,
              metric_type: endpoint.label,
              data,
              period: "30d",
              synced_at: new Date().toISOString(),
            },
            { onConflict: "project_id,metric_type" }
          );

        if (upsertError) {
          console.error(`[sync-custom-api] Upsert error for ${endpoint.label}:`, upsertError);
          await supabase
            .from("custom_api_metrics")
            .delete()
            .eq("project_id", project_id)
            .eq("metric_type", endpoint.label);

          const { error: insertError } = await supabase
            .from("custom_api_metrics")
            .insert({
              project_id,
              metric_type: endpoint.label,
              data,
              period: "30d",
              synced_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error(`[sync-custom-api] Insert error for ${endpoint.label}:`, insertError);
            errors.push(`${endpoint.label}: db error`);
            continue;
          }
        }

        synced++;
        console.log(`[sync-custom-api] ✅ ${endpoint.label} synced`);
      } catch (err) {
        console.error(`[sync-custom-api] Error fetching ${endpoint.label}:`, err);
        errors.push(`${endpoint.label}: ${String(err).slice(0, 100)}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[sync-custom-api] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
