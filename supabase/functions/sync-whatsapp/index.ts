import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-source",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const syncSource = req.headers.get("x-sync-source");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const isInternalCron = syncSource === "auto-sync-cron" && token === serviceRoleKey;

    if (!isInternalCron) {
      // Normal user auth flow
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
      if (authError || !user) throw new Error("Unauthorized");

      const { project_id } = await req.json();
      if (!project_id) throw new Error("project_id is required");

      // Verify ownership OR admin
      const { data: project, error: projErr } = await supabase
        .from("projects")
        .select("id, evolution_api_url, evolution_api_key, evolution_instance_name, owner_id")
        .eq("id", project_id)
        .single();

      if (projErr || !project) throw new Error("Project not found");

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const isAdmin = roleData?.role === "admin";
      if (!isAdmin && project.owner_id !== user.id) throw new Error("Unauthorized");

      return await syncWhatsapp(supabase, project_id, project, corsHeaders);
    }

    // Internal cron path
    const { project_id } = await req.json();
    if (!project_id) throw new Error("project_id is required");

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, evolution_api_url, evolution_api_key, evolution_instance_name, owner_id")
      .eq("id", project_id)
      .single();

    if (projErr || !project) throw new Error("Project not found");

    return await syncWhatsapp(supabase, project_id, project, corsHeaders);
  } catch (error: any) {
    console.error("sync-whatsapp error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function syncWhatsapp(supabase: any, project_id: string, project: any, corsHeaders: Record<string, string>) {
    const { evolution_api_url, evolution_api_key, evolution_instance_name } = project;
    if (!evolution_api_url || !evolution_api_key || !evolution_instance_name) {
      throw new Error("Evolution API credentials not configured for this project");
    }

    const baseUrl = evolution_api_url.replace(/\/$/, "");

    const groupsRes = await fetch(`${baseUrl}/group/fetchAllGroups/${evolution_instance_name}?getParticipants=false`, {
      headers: { apikey: evolution_api_key },
    });

    if (!groupsRes.ok) {
      const errText = await groupsRes.text();
      throw new Error(`Evolution API error [${groupsRes.status}]: ${errText}`);
    }

    const groupsData = await groupsRes.json();
    const groups = Array.isArray(groupsData) ? groupsData : (groupsData?.groups || groupsData?.data || []);

    let synced = 0;

    for (const group of groups) {
      const jid = group.id || group.jid || group.groupJid;
      const groupName = group.subject || group.name || jid;
      const size = group.size || group.participants?.length || 0;

      if (!jid) continue;

      const { data: existing } = await supabase
        .from("whatsapp_groups")
        .select("id, member_count, peak_members")
        .eq("project_id", project_id)
        .eq("group_jid", jid)
        .maybeSingle();

      const now = new Date().toISOString();
      const peakMembers = Math.max(size, existing?.peak_members || 0);
      const prevCount = existing?.member_count || 0;
      const membersLeft = prevCount > size ? prevCount - size : 0;

      let groupId: string;

      if (existing) {
        await supabase
          .from("whatsapp_groups")
          .update({
            name: groupName,
            member_count: size,
            peak_members: peakMembers,
            members_left: (existing as any).members_left ? (existing as any).members_left + membersLeft : membersLeft,
            last_synced_at: now,
          })
          .eq("id", existing.id);
        groupId = existing.id;
      } else {
        const { data: newGroup } = await supabase
          .from("whatsapp_groups")
          .insert({
            project_id,
            name: groupName,
            member_count: size,
            group_jid: jid,
            peak_members: size,
            members_left: 0,
            last_synced_at: now,
          })
          .select("id")
          .single();
        groupId = newGroup!.id;
      }

      await supabase.from("whatsapp_member_history").insert({
        project_id,
        group_id: groupId,
        member_count: size,
        members_joined: size > prevCount ? size - prevCount : 0,
        members_left: membersLeft,
        recorded_at: now,
      });

      synced++;
    }

    return new Response(
      JSON.stringify({ success: true, synced, total_groups: groups.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}
