
-- Table for ad platform demographic breakdowns (Meta/Google)
CREATE TABLE public.ad_demographics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  breakdown_type TEXT NOT NULL,
  dimension_1 TEXT NOT NULL,
  dimension_2 TEXT NOT NULL DEFAULT '',
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  date_start DATE NOT NULL DEFAULT '1970-01-01',
  date_end DATE,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, platform, breakdown_type, dimension_1, dimension_2, date_start)
);

-- Add buyer demographic columns to sales_events
ALTER TABLE public.sales_events 
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS buyer_state TEXT,
  ADD COLUMN IF NOT EXISTS buyer_city TEXT,
  ADD COLUMN IF NOT EXISTS buyer_country TEXT;

-- RLS for ad_demographics
ALTER TABLE public.ad_demographics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage ad demographics"
  ON public.ad_demographics
  FOR ALL
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));

CREATE POLICY "Public can view ad demographics"
  ON public.ad_demographics
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = ad_demographics.project_id
    AND projects.view_token IS NOT NULL
  ));

-- Indexes
CREATE INDEX idx_ad_demographics_project_type ON public.ad_demographics(project_id, platform, breakdown_type);
CREATE INDEX idx_sales_events_buyer_state ON public.sales_events(project_id, buyer_state) WHERE buyer_state IS NOT NULL;
