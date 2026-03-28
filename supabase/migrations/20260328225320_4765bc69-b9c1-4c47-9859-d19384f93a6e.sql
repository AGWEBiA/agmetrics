
-- Enable RLS on public views (they are actually materialized/regular views, but let's secure them)
-- Drop the old views and recreate as SECURITY INVOKER (default) so they inherit base table RLS
-- First check: these are views, not tables. Views inherit RLS from base tables in SECURITY INVOKER mode.
-- The issue is these views may have been created with SECURITY DEFINER or without proper settings.

-- Drop and recreate public_sales_view without PII, using SECURITY INVOKER
DROP VIEW IF EXISTS public.public_sales_view;
CREATE VIEW public.public_sales_view
WITH (security_invoker = true)
AS
SELECT
  id, project_id, platform, product_type,
  amount, gross_amount, base_price, platform_fee,
  coproducer_commission, taxes, status,
  sale_date, created_at, is_ignored,
  product_name, external_id,
  utm_source, utm_medium, utm_campaign, utm_content, utm_term,
  tracking_src, tracking_sck
FROM public.sales_events;

-- Drop and recreate public_sales_summary without PII
DROP VIEW IF EXISTS public.public_sales_summary;
CREATE VIEW public.public_sales_summary
WITH (security_invoker = true)
AS
SELECT
  id, project_id, platform, product_type,
  amount, gross_amount, platform_fee, status,
  sale_date, created_at, product_name
FROM public.sales_events;

-- Drop and recreate public_lead_events_view without PII
DROP VIEW IF EXISTS public.public_lead_events_view;
CREATE VIEW public.public_lead_events_view
WITH (security_invoker = true)
AS
SELECT
  id, project_id, event_date, amount, sale_id,
  metadata, created_at, event_type, event_source,
  event_detail, utm_source, utm_medium, utm_campaign,
  utm_content, utm_term, tracking_src, tracking_sck,
  ad_id, ad_name
FROM public.lead_events;

-- Recreate projects_public without credentials/secrets
DROP VIEW IF EXISTS public.projects_public;
CREATE VIEW public.projects_public
WITH (security_invoker = true)
AS
SELECT
  id, name, description, strategy,
  start_date, end_date, cart_open_date,
  budget, manual_investment, is_active,
  created_at, updated_at,
  meta_leads_enabled, google_leads_enabled,
  owner_id, slug, organization_id
FROM public.projects;
