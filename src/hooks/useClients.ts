import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "@/hooks/useOrganization";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch clients for the current org (or all for admins) */
export function useClients(organizationId?: string) {
  const { data: currentOrg } = useCurrentOrganization();
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";
  const orgId = organizationId || currentOrg?.id;

  return useQuery({
    queryKey: ["clients", isAdmin ? (organizationId || "all") : orgId],
    enabled: isAdmin || !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*")
        .order("name");

      if (organizationId && organizationId !== "all") {
        query = query.eq("organization_id", organizationId);
      } else if (!isAdmin && orgId) {
        query = query.eq("organization_id", orgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Client[];
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: { name: string; organization_id: string; email?: string; phone?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .insert(client)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Client;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Client;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}
