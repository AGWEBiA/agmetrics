
-- Drop the RESTRICTIVE policies and recreate as explicitly PERMISSIVE
DROP POLICY IF EXISTS "Project owners can manage ad demographics" ON public.ad_demographics;
DROP POLICY IF EXISTS "Public can view ad demographics" ON public.ad_demographics;

-- Recreate as PERMISSIVE (explicitly stated)
CREATE POLICY "Owners manage ad demographics"
  ON public.ad_demographics FOR ALL
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));

CREATE POLICY "Public view ad demographics"
  ON public.ad_demographics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = ad_demographics.project_id
    AND projects.view_token IS NOT NULL
  ));
