
-- Remove the public policy that exposes all columns on the base table
DROP POLICY IF EXISTS "Anyone can lookup projects by view_token" ON public.projects;

-- The base table is now only accessible to authenticated owners (via "Authenticated owners can select projects" and "Owners can do everything")

-- Grant anon access to the safe view
GRANT SELECT ON public.projects_public TO anon;
GRANT SELECT ON public.projects_public TO authenticated;
