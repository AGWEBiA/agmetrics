import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppPermission } from "@/hooks/useAdminUsers";

export interface CurrentUser {
  id: string;
  role: "admin" | "user";
  permissions: AppPermission[];
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  // First try getSession (cached), then fall back to getUser (network)
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // Session might not be ready yet — try getUser which forces a network call
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const [{ data: roleData }, { data: permData }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
      supabase.from("user_permissions").select("permission").eq("user_id", user.id),
    ]);

    return {
      id: user.id,
      role: (roleData?.role as "admin" | "user") || "user",
      permissions: (permData || []).map((p) => p.permission as AppPermission),
    };
  }

  const userId = session.user.id;

  const [{ data: roleData }, { data: permData }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).single(),
    supabase.from("user_permissions").select("permission").eq("user_id", userId),
  ]);

  const role = (roleData?.role as "admin" | "user") || "user";
  const permissions = (permData || []).map((p) => p.permission as AppPermission);

  return { id: userId, role, permissions };
}

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
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
