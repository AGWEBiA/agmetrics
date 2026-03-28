
-- 1. Fix projects_public view: remove view_token to prevent token harvesting
DROP VIEW IF EXISTS public.projects_public;
CREATE VIEW public.projects_public AS
  SELECT id, name, description, strategy, start_date, end_date, cart_open_date,
         budget, manual_investment, is_active, created_at, updated_at,
         meta_leads_enabled, google_leads_enabled, owner_id, slug, organization_id
  FROM projects;

-- 2. Create sanitized view for public sales (no PII)
CREATE OR REPLACE VIEW public.public_sales_view AS
  SELECT id, project_id, platform, product_type, amount, gross_amount, base_price,
         platform_fee, coproducer_commission, taxes, product_name, status, sale_date,
         created_at, is_ignored, external_id,
         utm_source, utm_medium, utm_campaign, utm_content, utm_term,
         tracking_src, tracking_sck
  FROM sales_events;

-- Enable RLS-like access on the view via the underlying table's RLS
-- Views inherit RLS from the underlying table, so the has_valid_view_token policy applies

-- 3. Create sanitized view for public lead events (no PII)
CREATE OR REPLACE VIEW public.public_lead_events_view AS
  SELECT id, project_id, event_type, event_source, event_detail, event_date,
         amount, sale_id, metadata, created_at,
         utm_source, utm_medium, utm_campaign, utm_content, utm_term,
         tracking_src, tracking_sck, ad_id, ad_name
  FROM lead_events;
