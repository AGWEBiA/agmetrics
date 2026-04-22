import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Project, ProjectStrategy } from "@/types/database";
import type { Database } from "@/integrations/supabase/types";
import { useCurrentOrganization } from "@/hooks/useOrganization";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface ProjectFilters {
  search?: string;
  strategy?: ProjectStrategy | "all";
  status?: "active" | "inactive" | "all";
  organizationId?: string | "all";
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 12;

export function useProjects(filters: ProjectFilters = {}) {
  const { data: currentOrg } = useCurrentOrganization();
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  return useQuery({
    queryKey: ["projects", isAdmin ? "all" : currentOrg?.id, filters],
    enabled: isAdmin || !!currentOrg?.id,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let query = supabase
        .from("projects")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Scope: admin can optionally filter by org, regular users always scoped
      if (isAdmin) {
        if (filters.organizationId && filters.organizationId !== "all") {
          query = query.eq("organization_id", filters.organizationId);
        }
      } else {
        query = query.eq("organization_id", currentOrg!.id);
      }

      // Filters
      if (filters.search?.trim()) {
        query = query.ilike("name", `%${filters.search.trim()}%`);
      }
      if (filters.strategy && filters.strategy !== "all") {
        query = query.eq("strategy", filters.strategy);
      }
      if (filters.status === "active") {
        query = query.eq("is_active", true);
      } else if (filters.status === "inactive") {
        query = query.eq("is_active", false);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        projects: data as unknown as Project[],
        totalCount: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      };
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

/** Fetch all organizations (admin only) for the org filter dropdown */
export function useAllOrganizations() {
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  return useQuery({
    queryKey: ["all-organizations"],
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
}
