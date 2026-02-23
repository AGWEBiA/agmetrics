
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can view all meta campaigns" ON public.meta_campaigns;
DROP POLICY IF EXISTS "Project owners can manage meta campaigns" ON public.meta_campaigns;

CREATE POLICY "Admins can view all meta campaigns" ON public.meta_campaigns
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage meta campaigns" ON public.meta_campaigns
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));
