import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppPermission } from "@/hooks/useAdminUsers";

export interface CurrentUser {
  id: string;
  role: "admin" | "user";
  permissions: AppPermission[];
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const supabaseUrl = (supabase as any).supabaseUrl;
  console.log("[useCurrentUser] Fetching current user... URL:", supabaseUrl);
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error("[useCurrentUser] Session error:", sessionError);
  }

  const userId = session?.user?.id;
  if (!userId) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log("[useCurrentUser] No user found in session or via getUser()");
      return null;
    }
    return buildCurrentUser(user.id);
  }

  return buildCurrentUser(userId);
}

async function buildCurrentUser(userId: string): Promise<CurrentUser> {
  console.log("[useCurrentUser] Building user data for ID:", userId);
  const [{ data: rolesData, error: rolesError }, { data: permData, error: permsError }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("user_permissions").select("permission").eq("user_id", userId),
  ]);

  if (rolesError) console.error("[useCurrentUser] Roles error:", rolesError);
  if (permsError) console.error("[useCurrentUser] Permissions error:", permsError);

  const roles = (rolesData || []).map((item) => item.role as "admin" | "user");
  const role: CurrentUser["role"] = roles.some(r => r === "admin") ? "admin" : "user";
  const permissions = (permData || []).map((p) => p.permission as AppPermission);

  console.log("[useCurrentUser] Resolved role:", role, "permissions:", permissions.length);
  return { id: userId, role, permissions };
}

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ["current-user", "roles-v3"],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    retry: 1,
  });
}

export function hasPermission(
  user: CurrentUser | null | undefined,
  permission: AppPermission
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.permissions.includes(permission);
}
