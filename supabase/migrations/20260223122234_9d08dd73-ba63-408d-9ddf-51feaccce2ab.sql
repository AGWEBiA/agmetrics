-- Composite indexes for most queried patterns (project_id + date DESC)
CREATE INDEX IF NOT EXISTS idx_sales_events_project_date ON public.sales_events(project_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_events_project_status ON public.sales_events(project_id, status);
CREATE INDEX IF NOT EXISTS idx_meta_metrics_project_date ON public.meta_metrics(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_google_metrics_project_date ON public.google_metrics(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_demographics_project_type ON public.ad_demographics(project_id, breakdown_type);
CREATE INDEX IF NOT EXISTS idx_meta_ads_project_id ON public.meta_ads(project_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_history_project_group ON public.whatsapp_member_history(project_id, group_id, recorded_at DESC);
