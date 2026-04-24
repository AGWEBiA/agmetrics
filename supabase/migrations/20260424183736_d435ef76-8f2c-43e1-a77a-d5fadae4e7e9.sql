
-- Helper function: can the user manage (write) on a given project via org membership?
CREATE OR REPLACE FUNCTION public.can_manage_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id
      AND (
        p.owner_id = _user_id
        OR public.has_role(_user_id, 'admin'::app_role)
        OR (
          p.organization_id IS NOT NULL
          AND public.is_org_member(_user_id, p.organization_id)
        )
      )
  )
$$;

-- Add ALL-command policies for org members on each project-scoped table
-- products
CREATE POLICY "Org members can manage products"
  ON public.products FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- meta_credentials
CREATE POLICY "Org members can manage meta credentials"
  ON public.meta_credentials FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- meta_campaigns
CREATE POLICY "Org members can manage meta campaigns"
  ON public.meta_campaigns FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- meta_metrics
CREATE POLICY "Org members can manage meta metrics"
  ON public.meta_metrics FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- meta_ads
CREATE POLICY "Org members can manage meta ads"
  ON public.meta_ads FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- google_credentials
CREATE POLICY "Org members can manage google credentials"
  ON public.google_credentials FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- google_metrics
CREATE POLICY "Org members can manage google metrics"
  ON public.google_metrics FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- ad_demographics
CREATE POLICY "Org members can manage ad demographics"
  ON public.ad_demographics FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- custom_api_metrics
CREATE POLICY "Org members can manage custom api metrics"
  ON public.custom_api_metrics FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- manual_investments
CREATE POLICY "Org members can manage manual investments"
  ON public.manual_investments FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- project_goals
CREATE POLICY "Org members can manage project goals"
  ON public.project_goals FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- project_domains
CREATE POLICY "Org members can manage project domains"
  ON public.project_domains FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- project_debriefings
CREATE POLICY "Org members can manage debriefings"
  ON public.project_debriefings FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- whatsapp_groups
CREATE POLICY "Org members can manage whatsapp groups"
  ON public.whatsapp_groups FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- sales_events
CREATE POLICY "Org members can manage sales"
  ON public.sales_events FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- lead_events
CREATE POLICY "Org members can manage lead events"
  ON public.lead_events FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

-- ai_insights_history (insert + select already gated; add update/delete via ALL)
CREATE POLICY "Org members can manage ai insights"
  ON public.ai_insights_history FOR ALL
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));
