-- Add is_ignored column to sales_events
ALTER TABLE public.sales_events ADD COLUMN IF NOT EXISTS is_ignored boolean NOT NULL DEFAULT false;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_sales_events_is_ignored ON public.sales_events (project_id, is_ignored) WHERE is_ignored = false;