ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS link_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS results integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS landing_page_views integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkouts_initiated integer DEFAULT 0;