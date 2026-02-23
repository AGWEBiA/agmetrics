
-- Composite indexes for dashboard query performance
CREATE INDEX IF NOT EXISTS idx_meta_metrics_project_date ON public.meta_metrics (project_id, date);
CREATE INDEX IF NOT EXISTS idx_google_metrics_project_date ON public.google_metrics (project_id, date);
CREATE INDEX IF NOT EXISTS idx_sales_events_project_date ON public.sales_events (project_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_events_project_platform ON public.sales_events (project_id, platform);
CREATE INDEX IF NOT EXISTS idx_ad_demographics_project_type ON public.ad_demographics (project_id, breakdown_type);
CREATE INDEX IF NOT EXISTS idx_meta_ads_project ON public.meta_ads (project_id, ad_id);
