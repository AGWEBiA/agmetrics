import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify caller is admin
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const callerId = claimsData.claims.sub;

  const adminClient = createClient(supabaseUrl, serviceKey);

  // Check caller is admin
  const { data: callerRole } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .single();

  if (callerRole?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const url = new URL(req.url);
  const method = req.method;

  // GET /admin-users → list all users with roles and permissions
  if (method === "GET") {
    const { data: profiles, error } = await adminClient
      .from("profiles")
      .select("id, name, email, avatar_url, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Admin users list error:", error);
      return new Response(JSON.stringify({ error: "Failed to list users" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: roles } = await adminClient.from("user_roles").select("user_id, role");
    const roleMap: Record<string, string> = {};
    (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

    const { data: perms } = await adminClient.from("user_permissions").select("user_id, permission");
    const permMap: Record<string, string[]> = {};
    (perms || []).forEach((p: any) => {
      if (!permMap[p.user_id]) permMap[p.user_id] = [];
      permMap[p.user_id].push(p.permission);
    });

    const users = (profiles || []).map((p: any) => ({
      ...p,
      role: roleMap[p.id] || "user",
      permissions: permMap[p.id] || [],
    }));

    return new Response(JSON.stringify(users), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // POST /admin-users → create user { email, name, password, role }
  if (method === "POST") {
    const body = await req.json();
    const { email, name, password, role } = body;

    if (!email || !password || password.length < 6) {
      return new Response(JSON.stringify({ error: "E-mail e senha (mín. 6 caracteres) são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const validRole = ["admin", "user"].includes(role) ? role : "user";

    // Create user via admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || "" },
    });

    if (createError) {
      console.error("Admin create user error:", createError);
      return new Response(JSON.stringify({ error: "Failed to create user" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update role if admin
    if (validRole === "admin" && newUser?.user?.id) {
      await adminClient.from("user_roles").update({ role: "admin" }).eq("user_id", newUser.user.id);
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser?.user?.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // PATCH /admin-users → update role { user_id, role }
  if (method === "PATCH") {
    const body = await req.json();
    const { user_id, role } = body;

    if (!user_id || !["admin", "user"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Prevent removing own admin
    if (user_id === callerId && role !== "admin") {
      return new Response(JSON.stringify({ error: "Não é possível remover seu próprio admin" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error } = await adminClient
      .from("user_roles")
      .update({ role })
      .eq("user_id", user_id);

    if (error) {
      console.error("Admin update role error:", error);
      return new Response(JSON.stringify({ error: "Failed to update role" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // DELETE /admin-users?user_id=xxx → delete user
  if (method === "DELETE") {
    const userId = url.searchParams.get("user_id");
    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (userId === callerId) {
      return new Response(JSON.stringify({ error: "Não é possível deletar a si mesmo" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Reassign orphaned projects to the admin who is deleting
    await adminClient
      .from("projects")
      .update({ owner_id: callerId })
      .eq("owner_id", userId);

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      console.error("Admin delete user error:", error);
      return new Response(JSON.stringify({ error: "Failed to delete user" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // PUT /admin-users → update permissions { user_id, permissions: string[] }
  if (method === "PUT") {
    const body = await req.json();
    const { user_id, permissions } = body;

    const validPerms = ["projects.view", "projects.edit", "sales.view", "integrations.manage", "data.export"];
    if (!user_id || !Array.isArray(permissions) || permissions.some((p: string) => !validPerms.includes(p))) {
      return new Response(JSON.stringify({ error: "Invalid params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Delete existing permissions
    await adminClient.from("user_permissions").delete().eq("user_id", user_id);

    // Insert new permissions
    if (permissions.length > 0) {
      const rows = permissions.map((p: string) => ({ user_id, permission: p }));
      const { error } = await adminClient.from("user_permissions").insert(rows);
      if (error) {
        console.error("Admin update permissions error:", error);
        return new Response(JSON.stringify({ error: "Failed to update permissions" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
