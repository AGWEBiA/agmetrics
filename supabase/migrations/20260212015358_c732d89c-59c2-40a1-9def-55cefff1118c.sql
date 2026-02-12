
-- Fix SECURITY DEFINER view issue
DROP VIEW IF EXISTS public.public_sales_summary;

CREATE OR REPLACE VIEW public.public_sales_summary
WITH (security_invoker=on) AS
SELECT
  id,
  project_id,
  platform,
  product_name,
  product_type,
  amount,
  gross_amount,
  platform_fee,
  status,
  sale_date,
  created_at
FROM public.sales_events
WHERE status = 'approved';
