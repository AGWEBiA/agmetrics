
-- 1. Remove token-based SELECT from sales_events (PII exposure)
DROP POLICY IF EXISTS "Public can view sales by project token" ON public.sales_events;

-- 2. Remove token-based SELECT from lead_events (PII exposure)
DROP POLICY IF EXISTS "Public can view lead events by project token" ON public.lead_events;

-- 3. Create SECURITY DEFINER function for public sales (no PII)
CREATE OR REPLACE FUNCTION public.get_public_sales(_project_id uuid, _token text)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  platform sales_platform,
  product_type product_type,
  amount numeric,
  gross_amount numeric,
  base_price numeric,
  platform_fee numeric,
  coproducer_commission numeric,
  taxes numeric,
  status sale_status,
  sale_date timestamptz,
  created_at timestamptz,
  is_ignored boolean,
  product_name text,
  external_id text,
  payment_method text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  tracking_src text,
  tracking_sck text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.project_id, s.platform, s.product_type,
         s.amount, s.gross_amount, s.base_price, s.platform_fee,
         s.coproducer_commission, s.taxes, s.status,
         s.sale_date, s.created_at, s.is_ignored,
         s.product_name, s.external_id, s.payment_method,
         s.utm_source, s.utm_medium, s.utm_campaign,
         s.utm_content, s.utm_term, s.tracking_src, s.tracking_sck
  FROM public.sales_events s
  JOIN public.projects p ON p.id = s.project_id
  WHERE s.project_id = _project_id
    AND p.view_token = _token
$$;

-- 4. Create SECURITY DEFINER function for public lead events (no PII)
CREATE OR REPLACE FUNCTION public.get_public_lead_events(_project_id uuid, _token text)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  event_date timestamptz,
  amount numeric,
  sale_id uuid,
  metadata jsonb,
  created_at timestamptz,
  event_type text,
  event_source text,
  event_detail text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  tracking_src text,
  tracking_sck text,
  ad_id text,
  ad_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT le.id, le.project_id, le.event_date, le.amount, le.sale_id,
         le.metadata, le.created_at, le.event_type, le.event_source,
         le.event_detail, le.utm_source, le.utm_medium, le.utm_campaign,
         le.utm_content, le.utm_term, le.tracking_src, le.tracking_sck,
         le.ad_id, le.ad_name
  FROM public.lead_events le
  JOIN public.projects p ON p.id = le.project_id
  WHERE le.project_id = _project_id
    AND p.view_token = _token
$$;

-- 5. Fix tracking_events: validate project_id exists on INSERT
DROP POLICY IF EXISTS "Anyone can insert tracking events" ON public.tracking_events;
CREATE POLICY "Anyone can insert tracking events with valid project"
  ON public.tracking_events FOR INSERT TO public
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND is_active = true)
  );

-- 6. Create a safe project view function that strips credentials for org members
CREATE OR REPLACE FUNCTION public.get_project_safe(_project_id uuid)
RETURNS TABLE(
  id uuid, name text, description text, strategy project_strategy,
  start_date date, end_date date, cart_open_date date,
  budget numeric, manual_investment numeric, is_active boolean,
  created_at timestamptz, updated_at timestamptz,
  meta_leads_enabled boolean, google_leads_enabled boolean,
  owner_id uuid, slug text, organization_id uuid,
  view_token text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.name, p.description, p.strategy,
         p.start_date, p.end_date, p.cart_open_date,
         p.budget, p.manual_investment, p.is_active,
         p.created_at, p.updated_at,
         p.meta_leads_enabled, p.google_leads_enabled,
         p.owner_id, p.slug, p.organization_id, p.view_token
  FROM public.projects p
  WHERE p.id = _project_id
    AND (
      p.owner_id = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR (p.organization_id IS NOT NULL AND p.organization_id IN (SELECT user_org_ids(auth.uid())))
    )
  LIMIT 1
$$;
