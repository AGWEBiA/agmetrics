-- Create dedicated table for Meta ads data
CREATE TABLE IF NOT EXISTS public.meta_ads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ad_id text NOT NULL,
  ad_name text,
  status text,
  spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  cpm numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  purchases integer DEFAULT 0,
  leads integer DEFAULT 0,
  preview_link text,
  date_start date,
  date_end date,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(project_id, ad_id, date_start)
);

ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage meta ads"
  ON public.meta_ads FOR ALL
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));

CREATE POLICY "Admins can view all meta ads"
  ON public.meta_ads FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view meta ads"
  ON public.meta_ads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = meta_ads.project_id AND projects.view_token IS NOT NULL
  ));

CREATE INDEX IF NOT EXISTS idx_meta_ads_project_date ON public.meta_ads(project_id, date_start DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ads_project_spend ON public.meta_ads(project_id, spend DESC);
