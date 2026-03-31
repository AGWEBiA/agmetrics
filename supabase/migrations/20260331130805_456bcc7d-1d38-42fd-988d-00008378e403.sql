
-- 1. Create get_project_by_slug RPC for public dashboard
CREATE OR REPLACE FUNCTION public.get_project_by_slug(_slug text)
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
  WHERE p.slug = _slug
  LIMIT 1
$$;

-- 2. Helper function: check if user is member of the org that owns a project
CREATE OR REPLACE FUNCTION public.is_org_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = _project_id AND om.user_id = _user_id
  )
$$;

-- 3. Add org member SELECT policies to data tables

-- sales_events
CREATE POLICY "Org members can view project sales"
ON public.sales_events FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- meta_metrics
CREATE POLICY "Org members can view meta metrics"
ON public.meta_metrics FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- google_metrics
CREATE POLICY "Org members can view google metrics"
ON public.google_metrics FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- meta_ads
CREATE POLICY "Org members can view meta ads"
ON public.meta_ads FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- ad_demographics
CREATE POLICY "Org members can view ad demographics"
ON public.ad_demographics FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- lead_events
CREATE POLICY "Org members can view lead events"
ON public.lead_events FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- manual_investments
CREATE POLICY "Org members can view manual investments"
ON public.manual_investments FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- project_goals
CREATE POLICY "Org members can view project goals"
ON public.project_goals FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- products
CREATE POLICY "Org members can view products"
ON public.products FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- meta_campaigns
CREATE POLICY "Org members can view meta campaigns"
ON public.meta_campaigns FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- integration_sync_logs
CREATE POLICY "Org members can view sync logs"
ON public.integration_sync_logs FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- whatsapp_groups
CREATE POLICY "Org members can view whatsapp groups"
ON public.whatsapp_groups FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- whatsapp_member_history
CREATE POLICY "Org members can view whatsapp history"
ON public.whatsapp_member_history FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- custom_api_metrics
CREATE POLICY "Org members can view custom api metrics"
ON public.custom_api_metrics FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- notifications (project-scoped)
CREATE POLICY "Org members can view project notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (project_id IS NOT NULL AND is_org_project_member(auth.uid(), project_id));

-- tracking_events
CREATE POLICY "Org members can view tracking events"
ON public.tracking_events FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- ai_insights_history
CREATE POLICY "Org members can view ai insights"
ON public.ai_insights_history FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- meta_credentials (read-only for org members)
CREATE POLICY "Org members can view meta credentials"
ON public.meta_credentials FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- google_credentials (read-only for org members)
CREATE POLICY "Org members can view google credentials"
ON public.google_credentials FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- whatsapp_report_configs
CREATE POLICY "Org members can view report configs"
ON public.whatsapp_report_configs FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

-- project_domains
CREATE POLICY "Org members can view project domains"
ON public.project_domains FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));
