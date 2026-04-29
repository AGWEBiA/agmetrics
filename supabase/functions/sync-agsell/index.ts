import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default to the official AG Sell production URL (v1.1 — recommended for native integrations)
const DEFAULT_BASE_URL =
  "https://rcxrkvwxlzwzrllwdwgz.supabase.co/functions/v1/public-api/v1.1";

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "5", 10);
      const waitMs = Math.min(retryAfter * 1000, 30000);
      console.warn(`[sync-agsell] 429 on ${url}, retrying in ${waitMs}ms (${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    return res;
  }
  return fetch(url, { headers });
}

async function fetchJson(url: string, headers: Record<string, string>) {
  try {
    const res = await fetchWithRetry(url, headers);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { error: `HTTP ${res.status}`, detail: text.slice(0, 200) };
    }
    return await res.json();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown" };
  }
}

/**
 * Aggregate WhatsApp conversations into a summary object that mirrors the
 * shape of the /metrics/* responses. AG Sell's public API does not expose
 * per-group analytics yet, so we derive them from /conversations.
 */
function summarizeWhatsApp(conversations: any[]): Record<string, unknown> {
  if (!Array.isArray(conversations)) {
    return { error: "no_conversations_payload" };
  }

  const total = conversations.length;
  let unread = 0;
  let openLeads = 0;
  const byStatus: Record<string, number> = {};
  const byAssignee: Record<string, number> = {};
  const groups: Record<string, { name: string; messages: number; lastMessageAt: string | null }> = {};
  let lastMessageAt: string | null = null;

  for (const c of conversations) {
    const status = (c.status || "open").toString();
    byStatus[status] = (byStatus[status] || 0) + 1;
    if (status === "open") openLeads += 1;
    if (typeof c.unread_count === "number") unread += c.unread_count;

    const assignee = c.assignee_name || c.assigned_to || "Não atribuído";
    byAssignee[assignee] = (byAssignee[assignee] || 0) + 1;

    // Detect "groups" using common AG Sell flags
    const groupId = c.group_id || c.whatsapp_group_id || (c.is_group ? c.id : null);
    const groupName = c.group_name || c.whatsapp_group_name || c.title || c.name;
    if (groupId) {
      const key = String(groupId);
      const last = c.last_message_at || c.updated_at || c.created_at || null;
      const cur = groups[key] || { name: groupName || key, messages: 0, lastMessageAt: null };
      cur.messages += c.messages_count || 1;
      if (last && (!cur.lastMessageAt || last > cur.lastMessageAt)) cur.lastMessageAt = last;
      groups[key] = cur;
    }

    const lastTs = c.last_message_at || c.updated_at || c.created_at;
    if (lastTs && (!lastMessageAt || lastTs > lastMessageAt)) lastMessageAt = lastTs;
  }

  const groupList = Object.entries(groups)
    .map(([id, g]) => ({ id, ...g }))
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 50);

  return {
    total_conversations: total,
    open_conversations: openLeads,
    unread_messages: unread,
    by_status: byStatus,
    by_assignee: byAssignee,
    groups_count: groupList.length,
    groups: groupList,
    last_message_at: lastMessageAt,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id } = await req.json();
    if (!project_id || typeof project_id !== "string" || project_id.length < 32) {
      return new Response(JSON.stringify({ error: "Invalid project_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("agsell_api_key, agsell_base_url")
      .eq("id", project_id)
      .single();

    if (projErr || !project?.agsell_api_key) {
      return new Response(
        JSON.stringify({ error: "AG Sell credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = project.agsell_api_key;
    const baseUrl = (project.agsell_base_url || DEFAULT_BASE_URL).replace(/\/$/, "");

    const headers = {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    };

    // Metric types from AG Sell public API
    const metricTypes = ["overview", "email", "leads", "pipeline", "automations", "forms"];

    const results: Record<string, unknown> = {};

    // Fetch each metric type via /metrics/{type}?period=30d
    for (const type of metricTypes) {
      results[type] = await fetchJson(`${baseUrl}/metrics/${type}?period=30d`, headers);
    }

    // Fetch WhatsApp conversations and summarize
    const convPayload = await fetchJson(`${baseUrl}/conversations?channel=whatsapp&limit=200`, headers);
    const conversations = Array.isArray(convPayload)
      ? convPayload
      : (convPayload?.data || convPayload?.conversations || []);
    results.whatsapp = summarizeWhatsApp(conversations);

    // Persist each metric snapshot in custom_api_metrics, replacing previous version
    for (const [metricType, data] of Object.entries(results)) {
      await supabase
        .from("custom_api_metrics")
        .delete()
        .eq("project_id", project_id)
        .eq("metric_type", `agsell_${metricType}`);

      await supabase.from("custom_api_metrics").insert({
        project_id,
        metric_type: `agsell_${metricType}`,
        data: data as Record<string, unknown>,
        period: "30d",
      });
    }

    return new Response(
      JSON.stringify({ success: true, synced: Object.keys(results).length, types: Object.keys(results) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[sync-agsell] error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
