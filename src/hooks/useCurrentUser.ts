import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppPermission } from "@/hooks/useAdminUsers";

export interface CurrentUser {
  id: string;
  role: "admin" | "user";
  permissions: AppPermission[];
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

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
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Wait for auth to be initialized before enabling the query
    supabase.auth.getSession().then(() => setSessionReady(true));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  return useQuery<CurrentUser | null>({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    enabled: sessionReady,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
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
