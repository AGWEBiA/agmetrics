
-- ============================================================
-- FIX ALL RLS POLICIES: Convert from RESTRICTIVE to PERMISSIVE
-- PostgreSQL requires at least one PERMISSIVE policy to grant access.
-- RESTRICTIVE policies only further restrict already-granted access.
-- ============================================================

-- ==================== meta_campaigns ====================
DROP POLICY IF EXISTS "Admins can view all meta campaigns" ON public.meta_campaigns;
DROP POLICY IF EXISTS "Project owners can manage meta campaigns" ON public.meta_campaigns;

CREATE POLICY "Admins can manage all meta campaigns" ON public.meta_campaigns
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage meta campaigns" ON public.meta_campaigns
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

-- ==================== meta_credentials ====================
DROP POLICY IF EXISTS "Admins can view all meta credentials" ON public.meta_credentials;
DROP POLICY IF EXISTS "Project owners can manage meta credentials" ON public.meta_credentials;

CREATE POLICY "Admins can manage all meta credentials" ON public.meta_credentials
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage meta credentials" ON public.meta_credentials
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

-- ==================== meta_metrics ====================
DROP POLICY IF EXISTS "Admins can view all meta metrics" ON public.meta_metrics;
DROP POLICY IF EXISTS "Project owners can manage meta metrics" ON public.meta_metrics;
DROP POLICY IF EXISTS "Public can view meta metrics" ON public.meta_metrics;

CREATE POLICY "Admins can manage all meta metrics" ON public.meta_metrics
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage meta metrics" ON public.meta_metrics
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

CREATE POLICY "Public can view meta metrics" ON public.meta_metrics
  FOR SELECT USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = meta_metrics.project_id AND projects.view_token IS NOT NULL));

-- ==================== meta_ads ====================
DROP POLICY IF EXISTS "Admins can view all meta ads" ON public.meta_ads;
DROP POLICY IF EXISTS "Project owners can manage meta ads" ON public.meta_ads;
DROP POLICY IF EXISTS "Public can view meta ads" ON public.meta_ads;

CREATE POLICY "Admins can manage all meta ads" ON public.meta_ads
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage meta ads" ON public.meta_ads
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

CREATE POLICY "Public can view meta ads" ON public.meta_ads
  FOR SELECT USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = meta_ads.project_id AND projects.view_token IS NOT NULL));

-- ==================== google_credentials ====================
DROP POLICY IF EXISTS "Admins can view all google credentials" ON public.google_credentials;
DROP POLICY IF EXISTS "Project owners can manage google credentials" ON public.google_credentials;

CREATE POLICY "Admins can manage all google credentials" ON public.google_credentials
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage google credentials" ON public.google_credentials
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

-- ==================== google_metrics ====================
DROP POLICY IF EXISTS "Admins can view all google metrics" ON public.google_metrics;
DROP POLICY IF EXISTS "Project owners can manage google metrics" ON public.google_metrics;
DROP POLICY IF EXISTS "Public can view google metrics" ON public.google_metrics;

CREATE POLICY "Admins can manage all google metrics" ON public.google_metrics
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage google metrics" ON public.google_metrics
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

CREATE POLICY "Public can view google metrics" ON public.google_metrics
  FOR SELECT USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = google_metrics.project_id AND projects.view_token IS NOT NULL));

-- ==================== ad_demographics ====================
DROP POLICY IF EXISTS "Admins can view all ad demographics" ON public.ad_demographics;
DROP POLICY IF EXISTS "Owners manage ad demographics" ON public.ad_demographics;
DROP POLICY IF EXISTS "Public view ad demographics" ON public.ad_demographics;

CREATE POLICY "Admins can manage all ad demographics" ON public.ad_demographics
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners manage ad demographics" ON public.ad_demographics
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

CREATE POLICY "Public view ad demographics" ON public.ad_demographics
  FOR SELECT USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = ad_demographics.project_id AND projects.view_token IS NOT NULL));

-- ==================== sales_events ====================
DROP POLICY IF EXISTS "Admins can view all sales" ON public.sales_events;
DROP POLICY IF EXISTS "Project owners can manage sales" ON public.sales_events;
DROP POLICY IF EXISTS "Public can view sales by project token" ON public.sales_events;

CREATE POLICY "Admins can manage all sales" ON public.sales_events
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage sales" ON public.sales_events
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

CREATE POLICY "Public can view sales by project token" ON public.sales_events
  FOR SELECT USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = sales_events.project_id AND projects.view_token IS NOT NULL));

-- ==================== manual_investments ====================
DROP POLICY IF EXISTS "Admins can view all manual investments" ON public.manual_investments;
DROP POLICY IF EXISTS "Project owners can manage investments" ON public.manual_investments;
DROP POLICY IF EXISTS "Public can view investments by project token" ON public.manual_investments;

CREATE POLICY "Admins can manage all manual investments" ON public.manual_investments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage investments" ON public.manual_investments
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

CREATE POLICY "Public can view investments by project token" ON public.manual_investments
  FOR SELECT USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = manual_investments.project_id AND projects.view_token IS NOT NULL));

-- ==================== products ====================
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
DROP POLICY IF EXISTS "Project owners can manage products" ON public.products;

CREATE POLICY "Admins can manage all products" ON public.products
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage products" ON public.products
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

-- ==================== projects ====================
DROP POLICY IF EXISTS "Admins can delete all projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update all projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated owners can select projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can do everything with their projects" ON public.projects;
DROP POLICY IF EXISTS "Public can view projects by slug or token" ON public.projects;

CREATE POLICY "Admins can manage all projects" ON public.projects
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can manage own projects" ON public.projects
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Public can view projects by slug or token" ON public.projects
  FOR SELECT USING (slug IS NOT NULL OR view_token IS NOT NULL);

-- ==================== project_goals ====================
DROP POLICY IF EXISTS "Admins can view all project goals" ON public.project_goals;
DROP POLICY IF EXISTS "Project owners can manage goals" ON public.project_goals;
DROP POLICY IF EXISTS "Public can view goals" ON public.project_goals;

CREATE POLICY "Admins can manage all project goals" ON public.project_goals
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage goals" ON public.project_goals
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

CREATE POLICY "Public can view goals" ON public.project_goals
  FOR SELECT USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_goals.project_id AND projects.view_token IS NOT NULL));

-- ==================== whatsapp_groups ====================
DROP POLICY IF EXISTS "Admins can view all whatsapp groups" ON public.whatsapp_groups;
DROP POLICY IF EXISTS "Project owners can manage whatsapp groups" ON public.whatsapp_groups;
DROP POLICY IF EXISTS "Public can view whatsapp groups" ON public.whatsapp_groups;

CREATE POLICY "Admins can manage all whatsapp groups" ON public.whatsapp_groups
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage whatsapp groups" ON public.whatsapp_groups
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

CREATE POLICY "Public can view whatsapp groups" ON public.whatsapp_groups
  FOR SELECT USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = whatsapp_groups.project_id AND projects.view_token IS NOT NULL));

-- ==================== whatsapp_member_history ====================
DROP POLICY IF EXISTS "Admins can view all whatsapp history" ON public.whatsapp_member_history;
DROP POLICY IF EXISTS "Project owners can manage whatsapp history" ON public.whatsapp_member_history;
DROP POLICY IF EXISTS "Public can view whatsapp member history" ON public.whatsapp_member_history;

CREATE POLICY "Admins can manage all whatsapp history" ON public.whatsapp_member_history
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage whatsapp history" ON public.whatsapp_member_history
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

CREATE POLICY "Public can view whatsapp member history" ON public.whatsapp_member_history
  FOR SELECT USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = whatsapp_member_history.project_id AND projects.view_token IS NOT NULL));

-- ==================== profiles ====================
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== user_roles ====================
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- ==================== user_permissions ====================
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_permissions;

CREATE POLICY "Users can view own permissions" ON public.user_permissions
  FOR SELECT USING (auth.uid() = user_id);

-- ==================== user_dashboard_preferences ====================
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_dashboard_preferences;

CREATE POLICY "Users can manage own preferences" ON public.user_dashboard_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
