-- Add UTM tracking columns to sales_events
ALTER TABLE public.sales_events
  ADD COLUMN IF NOT EXISTS utm_source text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_medium text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_campaign text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_term text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_content text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_src text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_sck text DEFAULT '';

-- Create index for UTM-based queries
CREATE INDEX IF NOT EXISTS idx_sales_events_utm_source ON public.sales_events (project_id, utm_source) WHERE utm_source != '';
CREATE INDEX IF NOT EXISTS idx_sales_events_utm_campaign ON public.sales_events (project_id, utm_campaign) WHERE utm_campaign != '';
CREATE INDEX IF NOT EXISTS idx_sales_events_utm_content ON public.sales_events (project_id, utm_content) WHERE utm_content != '';

-- Backfill existing data from payload JSONB
UPDATE public.sales_events
SET
  utm_source = COALESCE(NULLIF(payload->>'tracking utm_source', ''), ''),
  utm_medium = COALESCE(NULLIF(payload->>'tracking utm_medium', ''), ''),
  utm_campaign = COALESCE(NULLIF(payload->>'tracking utm_campaign', ''), ''),
  utm_term = COALESCE(NULLIF(payload->>'tracking utm_term', ''), ''),
  utm_content = COALESCE(NULLIF(payload->>'tracking utm_content', ''), ''),
  tracking_src = COALESCE(NULLIF(payload->>'tracking src', ''), ''),
  tracking_sck = COALESCE(NULLIF(payload->>'tracking sck', ''), '')
WHERE payload IS NOT NULL;