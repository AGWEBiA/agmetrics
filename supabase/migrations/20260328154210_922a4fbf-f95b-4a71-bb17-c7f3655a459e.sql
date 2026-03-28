
-- Create a secure function to look up project by view_token without exposing tokens
CREATE OR REPLACE FUNCTION public.get_project_by_view_token(_token text)
RETURNS TABLE(
  id uuid, name text, description text, strategy project_strategy,
  start_date date, end_date date, cart_open_date date,
  budget numeric, manual_investment numeric, is_active boolean,
  created_at timestamptz, updated_at timestamptz,
  meta_leads_enabled boolean, google_leads_enabled boolean,
  owner_id uuid, slug text, organization_id uuid, view_token text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.description, p.strategy,
         p.start_date, p.end_date, p.cart_open_date,
         p.budget, p.manual_investment, p.is_active,
         p.created_at, p.updated_at,
         p.meta_leads_enabled, p.google_leads_enabled,
         p.owner_id, p.slug, p.organization_id, p.view_token
  FROM public.projects p
  WHERE p.view_token = _token
  LIMIT 1
$$;
