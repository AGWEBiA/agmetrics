import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  created_at: string;
  profile?: { name: string; email: string | null; avatar_url: string | null };
}

/** Fetch all organizations the current user belongs to */
export function useUserOrganizations() {
  return useQuery({
    queryKey: ["user-organizations"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from("organization_members" as any)
        .select("organization_id, role, organizations:organization_id(id, name, slug, created_at, updated_at, created_by)")
        .eq("user_id", session.user.id);
      if (error) throw error;

      return (data || []).map((m: any) => ({
        ...m.organizations,
        userRole: m.role,
      })) as (Organization & { userRole: string })[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Get the user's current organization from their profile */
export function useCurrentOrganization() {
  return useQuery({
    queryKey: ["current-organization"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      // Get current_organization_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_organization_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.current_organization_id) {
        // Fallback: get first org
        const { data: membership } = await supabase
          .from("organization_members" as any)
          .select("organization_id")
          .eq("user_id", session.user.id)
          .limit(1)
          .single();

        if (!membership) return null;
        const orgId = (membership as any).organization_id;

        // Set it as current
        await supabase
          .from("profiles")
          .update({ current_organization_id: orgId } as any)
          .eq("id", session.user.id);

        const { data: org } = await supabase
          .from("organizations" as any)
          .select("*")
          .eq("id", orgId)
          .single();
        return org as Organization | null;
      }

      const { data: org } = await supabase
        .from("organizations" as any)
        .select("*")
        .eq("id", profile.current_organization_id)
        .single();
      return org as Organization | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Switch to a different organization */
export function useSwitchOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orgId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ current_organization_id: orgId } as any)
        .eq("id", session.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-organization"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/** Fetch members of an organization */
export function useOrgMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ["org-members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members" as any)
        .select("id, organization_id, user_id, role, created_at")
        .eq("organization_id", orgId!);
      if (error) throw error;

      // Fetch profiles for each member
      const userIds = (data || []).map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return (data || []).map((m: any) => ({
        ...m,
        profile: profileMap.get(m.user_id) || null,
      })) as OrganizationMember[];
    },
  });
}

/** Invite a user to an organization */
export function useInviteToOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, userId, role }: { orgId: string; userId: string; role: "admin" | "member" | "viewer" }) => {
      const { error } = await supabase
        .from("organization_members" as any)
        .insert({ organization_id: orgId, user_id: userId, role } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["org-members", vars.orgId] });
    },
  });
}

/** Remove a member from organization */
export function useRemoveFromOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, orgId }: { memberId: string; orgId: string }) => {
      const { error } = await supabase
        .from("organization_members" as any)
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["org-members", vars.orgId] });
    },
  });
}
