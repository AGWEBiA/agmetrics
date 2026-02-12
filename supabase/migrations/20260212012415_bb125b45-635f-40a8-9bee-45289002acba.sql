-- Add unique constraints for upsert in sync functions
CREATE UNIQUE INDEX IF NOT EXISTS meta_metrics_project_date_unique ON public.meta_metrics (project_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS google_metrics_project_date_unique ON public.google_metrics (project_id, date);

-- Add public read policy for manual_investments via view_token
CREATE POLICY "Public can view investments by project token"
ON public.manual_investments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = manual_investments.project_id
  AND projects.view_token IS NOT NULL
));
