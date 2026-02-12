import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Generic hook factory for project-scoped CRUD
type TableName = "products" | "whatsapp_groups" | "manual_investments" | "project_goals";

function useProjectList<T>(table: TableName, projectId: string | undefined) {
  return useQuery({
    queryKey: [table, projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as T[];
    },
  });
}

function useProjectCreate<T>(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase
        .from(table)
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as T;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [table, vars.project_id] }),
  });
}

function useProjectUpdate<T>(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...updates }: Record<string, any> & { id: string; project_id: string }) => {
      const { data, error } = await supabase
        .from(table)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as T;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [table, vars.project_id] }),
  });
}

function useProjectDelete(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [table, vars.project_id] }),
  });
}

// Products
export interface Product {
  id: string;
  project_id: string;
  name: string;
  type: "main" | "order_bump";
  platform: "kiwify" | "hotmart" | "both";
  price: number;
  created_at: string;
}

export const useProducts = (projectId?: string) => useProjectList<Product>("products", projectId);
export const useCreateProduct = () => useProjectCreate<Product>("products");
export const useUpdateProduct = () => useProjectUpdate<Product>("products");
export const useDeleteProduct = () => useProjectDelete("products");

// WhatsApp Groups
export interface WhatsAppGroup {
  id: string;
  project_id: string;
  name: string;
  member_count: number;
  engagement_rate: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useWhatsAppGroups = (projectId?: string) => useProjectList<WhatsAppGroup>("whatsapp_groups", projectId);
export const useCreateWhatsAppGroup = () => useProjectCreate<WhatsAppGroup>("whatsapp_groups");
export const useUpdateWhatsAppGroup = () => useProjectUpdate<WhatsAppGroup>("whatsapp_groups");
export const useDeleteWhatsAppGroup = () => useProjectDelete("whatsapp_groups");

// Manual Investments
export interface ManualInvestment {
  id: string;
  project_id: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

export const useManualInvestments = (projectId?: string) => useProjectList<ManualInvestment>("manual_investments", projectId);
export const useCreateManualInvestment = () => useProjectCreate<ManualInvestment>("manual_investments");
export const useDeleteManualInvestment = () => useProjectDelete("manual_investments");

// Project Goals
export interface ProjectGoal {
  id: string;
  project_id: string;
  type: "revenue" | "sales" | "roi" | "leads" | "margin";
  target_value: number;
  period: "daily" | "weekly" | "monthly" | "total";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useProjectGoals = (projectId?: string) => useProjectList<ProjectGoal>("project_goals", projectId);
export const useCreateProjectGoal = () => useProjectCreate<ProjectGoal>("project_goals");
export const useUpdateProjectGoal = () => useProjectUpdate<ProjectGoal>("project_goals");
export const useDeleteProjectGoal = () => useProjectDelete("project_goals");

// Meta Credentials
export interface MetaCredentials {
  id: string;
  project_id: string;
  access_token: string;
  ad_account_id: string;
  label: string;
  created_at: string;
  updated_at: string;
}

export const useMetaCredentials = (projectId?: string) => {
  return useQuery({
    queryKey: ["meta_credentials", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_credentials")
        .select("*")
        .eq("project_id", projectId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as MetaCredentials | null;
    },
  });
};

export const useMetaCredentialsList = (projectId?: string) => {
  return useQuery({
    queryKey: ["meta_credentials_list", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_credentials")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at");
      if (error) throw error;
      return (data || []) as unknown as MetaCredentials[];
    },
  });
};

export const useSaveMetaCredentials = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { id?: string; project_id: string; access_token: string; ad_account_id: string; label?: string }) => {
      if (values.id) {
        // Update existing
        const { data, error } = await supabase
          .from("meta_credentials")
          .update({ access_token: values.access_token, ad_account_id: values.ad_account_id, label: values.label || "" })
          .eq("id", values.id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as MetaCredentials;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("meta_credentials")
          .insert({ project_id: values.project_id, access_token: values.access_token, ad_account_id: values.ad_account_id, label: values.label || "" })
          .select()
          .single();
        if (error) throw error;
        return data as unknown as MetaCredentials;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["meta_credentials", vars.project_id] });
      qc.invalidateQueries({ queryKey: ["meta_credentials_list", vars.project_id] });
    },
  });
};

export const useDeleteMetaCredentials = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("meta_credentials")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ["meta_credentials", projectId] });
      qc.invalidateQueries({ queryKey: ["meta_credentials_list", projectId] });
    },
  });
};

// Google Credentials
export interface GoogleCredentials {
  id: string;
  project_id: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
}

export const useGoogleCredentials = (projectId?: string) => {
  return useQuery({
    queryKey: ["google_credentials", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_credentials")
        .select("*")
        .eq("project_id", projectId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as GoogleCredentials | null;
    },
  });
};

export const useSaveGoogleCredentials = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { project_id: string; client_id: string; client_secret: string; refresh_token: string; customer_id: string }) => {
      const { data, error } = await supabase
        .from("google_credentials")
        .upsert(values, { onConflict: "project_id" })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as GoogleCredentials;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["google_credentials", vars.project_id] }),
  });
};
