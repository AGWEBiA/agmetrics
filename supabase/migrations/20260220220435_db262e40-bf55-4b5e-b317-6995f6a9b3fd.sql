-- Allow admins to SELECT all projects
CREATE POLICY "Admins can view all projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to UPDATE all projects
CREATE POLICY "Admins can update all projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to DELETE all projects
CREATE POLICY "Admins can delete all projects"
ON public.projects
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Also allow admins to manage sales_events of any project
CREATE POLICY "Admins can view all sales"
ON public.sales_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all meta_metrics
CREATE POLICY "Admins can view all meta metrics"
ON public.meta_metrics
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all google_metrics
CREATE POLICY "Admins can view all google metrics"
ON public.google_metrics
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all products
CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all project_goals
CREATE POLICY "Admins can view all project goals"
ON public.project_goals
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all manual_investments
CREATE POLICY "Admins can view all manual investments"
ON public.manual_investments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all ad_demographics
CREATE POLICY "Admins can view all ad demographics"
ON public.ad_demographics
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all whatsapp_groups
CREATE POLICY "Admins can view all whatsapp groups"
ON public.whatsapp_groups
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all whatsapp_member_history
CREATE POLICY "Admins can view all whatsapp history"
ON public.whatsapp_member_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all meta_credentials
CREATE POLICY "Admins can view all meta credentials"
ON public.meta_credentials
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all google_credentials
CREATE POLICY "Admins can view all google credentials"
ON public.google_credentials
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all meta_campaigns
CREATE POLICY "Admins can view all meta campaigns"
ON public.meta_campaigns
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));