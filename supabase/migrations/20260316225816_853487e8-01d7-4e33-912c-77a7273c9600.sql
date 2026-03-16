
-- Add custom API fields to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS custom_api_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_api_key text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_api_name text DEFAULT NULL;

-- Create table to store custom API metrics
CREATE TABLE public.custom_api_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  metric_type text NOT NULL, -- e.g. 'overview', 'campaigns', 'contacts', 'automations'
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  period text DEFAULT '30d',
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_custom_api_metrics_project_type ON public.custom_api_metrics(project_id, metric_type);

-- Enable RLS
ALTER TABLE public.custom_api_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all custom api metrics"
ON public.custom_api_metrics FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Project owners can manage custom api metrics"
ON public.custom_api_metrics FOR ALL
TO public
USING (owns_project(project_id))
WITH CHECK (owns_project(project_id));

CREATE POLICY "Public can view custom api metrics by token"
ON public.custom_api_metrics FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = custom_api_metrics.project_id
  AND projects.view_token IS NOT NULL
));
