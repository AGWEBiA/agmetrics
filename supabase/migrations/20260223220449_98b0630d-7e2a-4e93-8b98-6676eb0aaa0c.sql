
-- Fix: Remove public policy that exposes sensitive project credentials
-- Public access should go through projects_public view instead
DROP POLICY IF EXISTS "Public can view projects by slug or token" ON public.projects;
