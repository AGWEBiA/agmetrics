import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppPermission = "projects.view" | "projects.edit" | "sales.view" | "integrations.manage" | "data.export";

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  role: "admin" | "user";
  permissions: AppPermission[];
}

async function callAdminUsers(method: string, body?: any, params?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => callAdminUsers("GET"),
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { user_id: string; role: "admin" | "user" }) =>
      callAdminUsers("PATCH", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user_id: string) =>
      callAdminUsers("DELETE", undefined, { user_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useUpdatePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { user_id: string; permissions: AppPermission[] }) =>
      callAdminUsers("PUT", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { email: string; name: string; password: string; role: "admin" | "user"; organization_id?: string; org_role?: string }) =>
      callAdminUsers("POST", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}
