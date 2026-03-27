-- Fix critical security issue: replace public SELECT policy on projects
-- that exposes ALL columns (including API secrets) to anonymous users.
-- Instead, only allow public reads on non-sensitive columns via the existing projects_public view.

DROP POLICY IF EXISTS "Public can read projects by slug or view_token" ON public.projects;

-- Create a restrictive policy that only allows public to read non-sensitive columns
-- by routing them through the projects_public view instead.
-- The projects table should only be fully accessible to owners and admins.
CREATE POLICY "Public can read basic project info by slug or view_token"
ON public.projects
FOR SELECT
TO public
USING (
  (slug IS NOT NULL OR view_token IS NOT NULL)
  AND (
    auth.uid() IS NULL 
    OR NOT (
      owns_project(id) OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Note: owners and admins already have full access via their own ALL policies.
-- This new policy still allows public reads but we need to use column-level security.
-- Since Postgres RLS cannot restrict columns, the proper fix is to drop public access
-- to the projects table entirely and use the projects_public view.

-- Actually, let's take the correct approach: remove public direct access to projects
-- and ensure all public access goes through projects_public view
DROP POLICY IF EXISTS "Public can read basic project info by slug or view_token" ON public.projects;

-- Re-create a minimal public policy that only works for specific lookups needed by the app
-- (like finding project by slug/view_token for public dashboards)
-- But since projects_public view already exists for this purpose, we should not allow
-- direct public access to the projects table at all.
-- The owner and admin policies already cover authenticated access.