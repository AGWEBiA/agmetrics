import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IntegrationAccount {
  id: string;
  name: string;
  platform: string;
  credentials: any;
  is_active: boolean;
  org_id: string;
  created_at: string;
}

export function useIntegrationAccounts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["integration_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as IntegrationAccount[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (account: { name: string; platform: string; credentials: any; org_id?: string }) => {
      const { data, error } = await supabase
        .from("integration_accounts")
        .insert([account])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration_accounts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("integration_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration_accounts"] });
    },
  });

  return {
    ...query,
    createAccount: createMutation.mutateAsync,
    deleteAccount: deleteMutation.mutateAsync,
  };
}
