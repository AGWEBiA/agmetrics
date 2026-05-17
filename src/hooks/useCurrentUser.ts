import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppPermission } from "@/hooks/useAdminUsers";

export interface CurrentUser {
  id: string;
  role: "admin" | "user";
  permissions: AppPermission[];
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  console.log("[useCurrentUser] Fetching user...");
  // First try getSession (cached), then fall back to getUser (network)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error("[useCurrentUser] Session error:", sessionError);
  }

  const buildCurrentUser = async (userId: string): Promise<CurrentUser> => {
    console.log("[useCurrentUser] Building user for ID:", userId);
    const [{ data: rolesData, error: rolesError }, { data: permData, error: permsError }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("user_permissions").select("permission").eq("user_id", userId),
    ]);

    if (rolesError) console.error("[useCurrentUser] Roles error:", rolesError);
    if (permsError) console.error("[useCurrentUser] Permissions error:", permsError);

    const roles = (rolesData || []).map((item) => item.role as "admin" | "user");
    console.log("[useCurrentUser] Found roles:", roles);
    const role: CurrentUser["role"] = roles.includes("admin") ? "admin" : "user";
    const permissions = (permData || []).map((p) => p.permission as AppPermission);

    return { id: userId, role, permissions };
  };
  
  if (!session) {
    console.log("[useCurrentUser] No session found, trying getUser...");
    // Session might not be ready yet — try getUser which forces a network call
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) console.error("[useCurrentUser] GetUser error:", userError);
    
    if (!user) {
      console.log("[useCurrentUser] No user found");
      return null;
    }

    return buildCurrentUser(user.id);
  }

  const userId = session.user.id;
  console.log("[useCurrentUser] Using session userId:", userId);

  return buildCurrentUser(userId);
}

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ["current-user", "roles-v2"],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    retry: 3,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 3000),
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
