
-- Add coproducer_commission and taxes columns to sales_events
ALTER TABLE public.sales_events 
ADD COLUMN coproducer_commission numeric DEFAULT 0,
ADD COLUMN taxes numeric DEFAULT 0;
