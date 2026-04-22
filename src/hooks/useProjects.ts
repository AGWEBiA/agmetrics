import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/types/database";
import type { Database } from "@/integrations/supabase/types";
import { useCurrentOrganization } from "@/hooks/useOrganization";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function useProjects() {
  const { data: currentOrg } = useCurrentOrganization();
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  return useQuery({
    queryKey: ["projects", isAdmin ? "all" : currentOrg?.id],
    enabled: isAdmin || !!currentOrg?.id,
    queryFn: async () => {
      let query = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      // Admins see all projects; regular users see only their org's projects
      if (!isAdmin) {
        query = query.eq("organization_id", currentOrg!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Project[];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["projects", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as Project;
    },
  });
}

export function useProjectByToken(viewToken: string | undefined) {
  return useQuery({
    queryKey: ["projects", "token", viewToken],
    enabled: !!viewToken,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_project_by_view_token", { _token: viewToken! });
      if (error) throw error;
      const rows = data as any[];
      if (!rows || rows.length === 0) throw new Error("Project not found");
      return rows[0] as unknown as Project;
    },
  });
}

function generateSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function useProjectBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["projects", "slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_project_by_slug", { _slug: slug! });
      if (error) throw error;
      const rows = data as any[];
      if (!rows || rows.length === 0) throw new Error("Project not found");
      return rows[0] as unknown as Project;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { data: currentOrg } = useCurrentOrganization();

  return useMutation({
    mutationFn: async (project: {
      name: string;
      description?: string;
      strategy?: Database["public"]["Enums"]["project_strategy"];
      start_date?: string;
      end_date?: string;
      cart_open_date?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      if (!currentOrg?.id) throw new Error("Nenhuma organização selecionada");

      const slug = generateSlug(project.name);
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...project, owner_id: user.id, organization_id: currentOrg.id, slug })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Project;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Project;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", vars.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}
