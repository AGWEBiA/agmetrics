
-- Table to store selected domains/pages for a project's pixel tracking
CREATE TABLE public.project_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, domain)
);

ALTER TABLE public.project_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all project domains"
  ON public.project_domains FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage domains"
  ON public.project_domains FOR ALL
  TO authenticated
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));
