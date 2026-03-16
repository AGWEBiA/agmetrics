
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_api_metrics_unique
ON public.custom_api_metrics(project_id, metric_type);
