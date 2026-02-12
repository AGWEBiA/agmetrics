
-- Fix: Restrict public sales view to not expose buyer PII
DROP POLICY IF EXISTS "Public can view approved sales by project token" ON public.sales_events;

CREATE POLICY "Public can view approved sales by project token"
ON public.sales_events
FOR SELECT
USING (
  (status = 'approved'::sale_status)
  AND (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = sales_events.project_id
    AND projects.view_token IS NOT NULL
  ))
);

-- Create a view for public dashboard that masks PII
CREATE OR REPLACE VIEW public.public_sales_summary AS
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
