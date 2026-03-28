
-- Create a function to validate view_token from request headers
CREATE OR REPLACE FUNCTION public.has_valid_view_token(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id
      AND view_token IS NOT NULL
      AND view_token = current_setting('request.headers', true)::json->>'x-view-token'
  )
$$;

-- Fix sales_events: replace broken public policy
DROP POLICY IF EXISTS "Public can view sales by project token" ON public.sales_events;
CREATE POLICY "Public can view sales by project token" ON public.sales_events
  FOR SELECT TO public
  USING (has_valid_view_token(project_id));

-- Fix lead_events: replace broken public policy
DROP POLICY IF EXISTS "Public can view lead events by project token" ON public.lead_events;
CREATE POLICY "Public can view lead events by project token" ON public.lead_events
  FOR SELECT TO public
  USING (has_valid_view_token(project_id));

-- Fix meta_metrics
DROP POLICY IF EXISTS "Public can view meta metrics" ON public.meta_metrics;
CREATE POLICY "Public can view meta metrics" ON public.meta_metrics
  FOR SELECT TO public
  USING (has_valid_view_token(project_id));

-- Fix google_metrics
DROP POLICY IF EXISTS "Public can view google metrics" ON public.google_metrics;
CREATE POLICY "Public can view google metrics" ON public.google_metrics
  FOR SELECT TO public
  USING (has_valid_view_token(project_id));

-- Fix meta_ads
DROP POLICY IF EXISTS "Public can view meta ads" ON public.meta_ads;
CREATE POLICY "Public can view meta ads" ON public.meta_ads
  FOR SELECT TO public
  USING (has_valid_view_token(project_id));

-- Fix ad_demographics
DROP POLICY IF EXISTS "Public view ad demographics" ON public.ad_demographics;
CREATE POLICY "Public view ad demographics" ON public.ad_demographics
  FOR SELECT TO public
  USING (has_valid_view_token(project_id));

-- Fix products
DROP POLICY IF EXISTS "Public can view products by project token" ON public.products;
CREATE POLICY "Public can view products by project token" ON public.products
  FOR SELECT TO public
  USING (has_valid_view_token(project_id));

-- Fix project_goals
DROP POLICY IF EXISTS "Public can view goals" ON public.project_goals;
CREATE POLICY "Public can view goals" ON public.project_goals
  FOR SELECT TO public
  USING (has_valid_view_token(project_id));

-- Fix manual_investments
DROP POLICY IF EXISTS "Public can view investments by project token" ON public.manual_investments;
CREATE POLICY "Public can view investments by project token" ON public.manual_investments
  FOR SELECT TO public
  USING (has_valid_view_token(project_id));

-- Fix custom_api_metrics
DROP POLICY IF EXISTS "Public can view custom api metrics by token" ON public.custom_api_metrics;
CREATE POLICY "Public can view custom api metrics by token" ON public.custom_api_metrics
  FOR SELECT TO public
  USING (has_valid_view_token(project_id));

-- Fix whatsapp_groups
DROP POLICY IF EXISTS "Public can view whatsapp groups" ON public.whatsapp_groups;
CREATE POLICY "Public can view whatsapp groups" ON public.whatsapp_groups
  FOR SELECT TO public
  USING (has_valid_view_token(project_id));

-- Fix whatsapp_member_history
DROP POLICY IF EXISTS "Public can view whatsapp member history" ON public.whatsapp_member_history;
CREATE POLICY "Public can view whatsapp member history" ON public.whatsapp_member_history
  FOR SELECT TO public
  USING (has_valid_view_token(project_id));

-- Fix notifications: restrict INSERT to authenticated users with matching user_id
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Also allow service role / admin to insert for any user (edge functions use service role)
CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
