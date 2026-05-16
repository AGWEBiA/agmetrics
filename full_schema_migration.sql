
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  view_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  start_date DATE,
  end_date DATE,
  cart_open_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Helper function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function: update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies: profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies: user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies: projects
CREATE POLICY "Owners can do everything with their projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Public access to projects via view_token (for public dashboard)
CREATE POLICY "Anyone can view projects by view_token"
  ON public.projects FOR SELECT
  TO anon
  USING (view_token IS NOT NULL);

-- Platform enums
CREATE TYPE public.sales_platform AS ENUM ('kiwify', 'hotmart');
CREATE TYPE public.product_type AS ENUM ('main', 'order_bump');
CREATE TYPE public.sale_status AS ENUM ('approved', 'pending', 'cancelled', 'refunded');
CREATE TYPE public.product_platform AS ENUM ('kiwify', 'hotmart', 'both');
CREATE TYPE public.goal_type AS ENUM ('revenue', 'sales', 'roi', 'leads', 'margin');
CREATE TYPE public.goal_period AS ENUM ('daily', 'weekly', 'monthly', 'total');
CREATE TYPE public.dashboard_type AS ENUM ('public', 'admin');

-- Sales events table
CREATE TABLE public.sales_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  platform sales_platform NOT NULL,
  external_id TEXT NOT NULL,
  product_name TEXT,
  product_type product_type,
  amount DECIMAL(10, 2) DEFAULT 0,
  gross_amount DECIMAL(10, 2) DEFAULT 0,
  platform_fee DECIMAL(10, 2) DEFAULT 0,
  status sale_status DEFAULT 'pending',
  buyer_email TEXT,
  buyer_name TEXT,
  sale_date TIMESTAMP WITH TIME ZONE,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(platform, external_id, project_id)
);
ALTER TABLE public.sales_events ENABLE ROW LEVEL SECURITY;

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type product_type NOT NULL DEFAULT 'main',
  platform product_platform NOT NULL DEFAULT 'both',
  price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Meta credentials
CREATE TABLE public.meta_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  ad_account_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.meta_credentials ENABLE ROW LEVEL SECURITY;

-- Meta metrics
CREATE TABLE public.meta_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  investment DECIMAL(10, 2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  results INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  landing_page_views INTEGER DEFAULT 0,
  checkouts_initiated INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  cpm DECIMAL(10, 4) DEFAULT 0,
  ctr DECIMAL(10, 4) DEFAULT 0,
  cpc DECIMAL(10, 4) DEFAULT 0,
  cpa DECIMAL(10, 4) DEFAULT 0,
  cost_per_lead DECIMAL(10, 4) DEFAULT 0,
  cost_per_result DECIMAL(10, 4) DEFAULT 0,
  cost_per_purchase DECIMAL(10, 4) DEFAULT 0,
  link_ctr DECIMAL(10, 4) DEFAULT 0,
  link_cpc DECIMAL(10, 4) DEFAULT 0,
  connect_rate DECIMAL(10, 4) DEFAULT 0,
  page_conversion_rate DECIMAL(10, 4) DEFAULT 0,
  checkout_conversion_rate DECIMAL(10, 4) DEFAULT 0,
  lead_event_type TEXT,
  top_ads JSONB,
  cache_expiry BIGINT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, date)
);
ALTER TABLE public.meta_metrics ENABLE ROW LEVEL SECURITY;

-- Google credentials
CREATE TABLE public.google_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.google_credentials ENABLE ROW LEVEL SECURITY;

-- Google metrics
CREATE TABLE public.google_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  investment DECIMAL(10, 2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cpc DECIMAL(10, 4) DEFAULT 0,
  ctr DECIMAL(10, 4) DEFAULT 0,
  conversion_rate DECIMAL(10, 4) DEFAULT 0,
  cost_per_conversion DECIMAL(10, 4) DEFAULT 0,
  cache_expiry BIGINT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, date)
);
ALTER TABLE public.google_metrics ENABLE ROW LEVEL SECURITY;

-- WhatsApp groups
CREATE TABLE public.whatsapp_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  member_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;

-- Manual investments
CREATE TABLE public.manual_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_investments ENABLE ROW LEVEL SECURITY;

-- Project goals
CREATE TABLE public.project_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  type goal_type NOT NULL,
  target_value DECIMAL(15, 2) NOT NULL,
  period goal_period NOT NULL DEFAULT 'total',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.project_goals ENABLE ROW LEVEL SECURITY;

-- Dashboard preferences
CREATE TABLE public.user_dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  dashboard_type dashboard_type NOT NULL,
  section_order JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id, dashboard_type)
);
ALTER TABLE public.user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_meta_credentials_updated_at BEFORE UPDATE ON public.meta_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_google_credentials_updated_at BEFORE UPDATE ON public.google_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_groups_updated_at BEFORE UPDATE ON public.whatsapp_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_goals_updated_at BEFORE UPDATE ON public.project_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dashboard_prefs_updated_at BEFORE UPDATE ON public.user_dashboard_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: All project-owned tables - owner access via project ownership
-- Helper function to check project ownership
CREATE OR REPLACE FUNCTION public.owns_project(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND owner_id = auth.uid()
  )
$$;

-- Sales events RLS
CREATE POLICY "Project owners can manage sales" ON public.sales_events FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));
CREATE POLICY "Public can view approved sales by project token" ON public.sales_events FOR SELECT TO anon
  USING (status = 'approved' AND EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND view_token IS NOT NULL));

-- Products RLS
CREATE POLICY "Project owners can manage products" ON public.products FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));

-- Meta credentials RLS (owner only)
CREATE POLICY "Project owners can manage meta credentials" ON public.meta_credentials FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));

-- Meta metrics RLS
CREATE POLICY "Project owners can manage meta metrics" ON public.meta_metrics FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));
CREATE POLICY "Public can view meta metrics" ON public.meta_metrics FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND view_token IS NOT NULL));

-- Google credentials RLS
CREATE POLICY "Project owners can manage google credentials" ON public.google_credentials FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));

-- Google metrics RLS
CREATE POLICY "Project owners can manage google metrics" ON public.google_metrics FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));
CREATE POLICY "Public can view google metrics" ON public.google_metrics FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND view_token IS NOT NULL));

-- WhatsApp groups RLS
CREATE POLICY "Project owners can manage whatsapp groups" ON public.whatsapp_groups FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));

-- Manual investments RLS
CREATE POLICY "Project owners can manage investments" ON public.manual_investments FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));

-- Project goals RLS
CREATE POLICY "Project owners can manage goals" ON public.project_goals FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));
CREATE POLICY "Public can view goals" ON public.project_goals FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND view_token IS NOT NULL));

-- Dashboard preferences RLS
CREATE POLICY "Users can manage own preferences" ON public.user_dashboard_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Add unique constraints for upsert in sync functions
CREATE UNIQUE INDEX IF NOT EXISTS meta_metrics_project_date_unique ON public.meta_metrics (project_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS google_metrics_project_date_unique ON public.google_metrics (project_id, date);

-- Add public read policy for manual_investments via view_token
CREATE POLICY "Public can view investments by project token"
ON public.manual_investments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = manual_investments.project_id
  AND projects.view_token IS NOT NULL
));
-- Enable realtime for sales_events table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_events;
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

-- Fix SECURITY DEFINER view issue
DROP VIEW IF EXISTS public.public_sales_summary;

CREATE OR REPLACE VIEW public.public_sales_summary
WITH (security_invoker=on) AS
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

-- Create strategy enum
CREATE TYPE public.project_strategy AS ENUM ('perpetuo', 'lancamento', 'lancamento_pago', 'funis');

-- Add new columns to projects
ALTER TABLE public.projects
  ADD COLUMN strategy public.project_strategy NOT NULL DEFAULT 'perpetuo',
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN budget numeric DEFAULT 0,
  ADD COLUMN manual_investment numeric DEFAULT 0,
  ADD COLUMN meta_leads_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN google_leads_enabled boolean NOT NULL DEFAULT false;

-- Add webhook token columns to projects
ALTER TABLE public.projects
  ADD COLUMN kiwify_webhook_token text DEFAULT NULL,
  ADD COLUMN hotmart_webhook_token text DEFAULT NULL;

-- Add coproducer_commission and taxes columns to sales_events
ALTER TABLE public.sales_events 
ADD COLUMN coproducer_commission numeric DEFAULT 0,
ADD COLUMN taxes numeric DEFAULT 0;

-- Table to store available Meta campaigns fetched from the API
CREATE TABLE public.meta_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  status TEXT,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, campaign_id)
);

-- Enable RLS
ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;

-- Only project owners can manage campaigns
CREATE POLICY "Project owners can manage meta campaigns"
ON public.meta_campaigns
FOR ALL
USING (owns_project(project_id))
WITH CHECK (owns_project(project_id));

-- Trigger for updated_at
CREATE TRIGGER update_meta_campaigns_updated_at
BEFORE UPDATE ON public.meta_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remove unique constraint on meta_credentials.project_id to allow multiple accounts per project
ALTER TABLE public.meta_credentials DROP CONSTRAINT IF EXISTS meta_credentials_project_id_key;

-- Add a label column to identify accounts
ALTER TABLE public.meta_credentials ADD COLUMN IF NOT EXISTS label TEXT DEFAULT '';

-- Add credential_id reference to meta_campaigns to link campaigns to specific accounts
ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS credential_id UUID REFERENCES public.meta_credentials(id) ON DELETE CASCADE;

-- Add Evolution API credentials to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS evolution_api_url text,
ADD COLUMN IF NOT EXISTS evolution_api_key text,
ADD COLUMN IF NOT EXISTS evolution_instance_name text;

-- Add tracking columns to whatsapp_groups
ALTER TABLE public.whatsapp_groups
ADD COLUMN IF NOT EXISTS group_jid text,
ADD COLUMN IF NOT EXISTS peak_members integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS members_left integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;

-- Create whatsapp_member_history table for temporal tracking
CREATE TABLE IF NOT EXISTS public.whatsapp_member_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.whatsapp_groups(id) ON DELETE CASCADE,
  member_count integer NOT NULL DEFAULT 0,
  members_joined integer NOT NULL DEFAULT 0,
  members_left integer NOT NULL DEFAULT 0,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_member_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Project owners can manage whatsapp history"
ON public.whatsapp_member_history
FOR ALL
USING (owns_project(project_id))
WITH CHECK (owns_project(project_id));

-- Index for performance
CREATE INDEX idx_whatsapp_member_history_group ON public.whatsapp_member_history(group_id, recorded_at DESC);
CREATE INDEX idx_whatsapp_member_history_project ON public.whatsapp_member_history(project_id, recorded_at DESC);
ALTER TYPE public.project_strategy ADD VALUE IF NOT EXISTS 'evento_presencial';
-- Add Kiwify OAuth credentials per project
ALTER TABLE public.projects
ADD COLUMN kiwify_client_id text DEFAULT NULL,
ADD COLUMN kiwify_client_secret text DEFAULT NULL,
ADD COLUMN kiwify_account_id text DEFAULT NULL;

-- Create enum for permissions
CREATE TYPE public.app_permission AS ENUM (
  'projects.view',
  'projects.edit',
  'sales.view',
  'integrations.manage',
  'data.export'
);

-- Create user_permissions table
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission app_permission NOT NULL,
  UNIQUE (user_id, permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view own permissions
CREATE POLICY "Users can view own permissions"
  ON public.user_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Security definer function to check permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission app_permission)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id AND permission = _permission
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Auto-grant all permissions to new users via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_permissions (user_id, permission)
  VALUES
    (NEW.id, 'projects.view'),
    (NEW.id, 'projects.edit'),
    (NEW.id, 'sales.view'),
    (NEW.id, 'integrations.manage'),
    (NEW.id, 'data.export');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_user_grant_permissions
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_permissions();

-- 1. Fix projects: Replace the overly permissive public SELECT policy
-- Drop the old policy that exposes all columns
DROP POLICY IF EXISTS "Anyone can view projects by view_token" ON public.projects;

-- Create a restricted public view that excludes sensitive columns
CREATE OR REPLACE VIEW public.projects_public
WITH (security_invoker = on) AS
SELECT 
  id, name, description, strategy, start_date, end_date, cart_open_date,
  budget, manual_investment, is_active, created_at, updated_at, view_token,
  meta_leads_enabled, google_leads_enabled, owner_id
FROM public.projects;
-- Excludes: evolution_api_key, evolution_api_url, evolution_instance_name,
-- kiwify_client_id, kiwify_client_secret, kiwify_account_id, kiwify_webhook_token,
-- hotmart_webhook_token

-- New public policy: only allow authenticated users who own OR have view_token access
-- Owner access (full columns via direct table)
CREATE POLICY "Owners can select their projects"
ON public.projects FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Anon/public access via view_token (will use the view instead)
CREATE POLICY "Public can view projects by view_token"
ON public.projects FOR SELECT
TO anon, authenticated
USING (view_token IS NOT NULL);

-- But we need the owner ALL policy to still work for write operations
-- The existing "Owners can do everything" is already for ALL, let's keep it

-- 2. Fix public_sales_summary: enable RLS on the view's base - it's a view so we add security
-- The view already reads from sales_events which has RLS, and uses security_invoker
-- So it inherits the RLS of the underlying table. This is safe.
-- But let's verify by checking if RLS is enabled on it - views don't have RLS directly.

-- 3. Update the public SELECT policy to be more restrictive
-- Actually, the issue is that the current policy exposes ALL columns.
-- We can't do column-level RLS in Postgres. The solution is:
-- a) Use the view for public access
-- b) Make the base table only accessible to owners

-- Let's redo this properly:
DROP POLICY IF EXISTS "Owners can select their projects" ON public.projects;
DROP POLICY IF EXISTS "Public can view projects by view_token" ON public.projects;

-- Re-add the public policy but it will still expose all columns...
-- The ONLY real fix is to use the view for public queries and restrict base table

-- Owner-only SELECT on base table (they need all columns for config)
CREATE POLICY "Authenticated owners can select projects"
ON public.projects FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Public/anon needs view_token lookup but should NOT see secrets
-- We allow this minimal access for view_token lookup only
CREATE POLICY "Anyone can lookup projects by view_token"
ON public.projects FOR SELECT
USING (view_token IS NOT NULL);

-- Remove the public policy that exposes all columns on the base table
DROP POLICY IF EXISTS "Anyone can lookup projects by view_token" ON public.projects;

-- The base table is now only accessible to authenticated owners (via "Authenticated owners can select projects" and "Owners can do everything")

-- Grant anon access to the safe view
GRANT SELECT ON public.projects_public TO anon;
GRANT SELECT ON public.projects_public TO authenticated;

-- Step 1: Drop the view that depends on projects table
DROP VIEW IF EXISTS public.projects_public;

-- Step 2: Add slug column
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Step 3: Create index
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects (slug);

-- Step 4: Recreate view with slug
CREATE VIEW public.projects_public AS
SELECT 
  id, name, description, strategy,
  start_date, end_date, cart_open_date,
  budget, manual_investment, is_active,
  created_at, updated_at, view_token,
  meta_leads_enabled, google_leads_enabled,
  owner_id, slug
FROM public.projects;

-- Fix security definer view by setting security_invoker
ALTER VIEW public.projects_public SET (security_invoker = on);

-- Table for ad platform demographic breakdowns (Meta/Google)
CREATE TABLE public.ad_demographics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  breakdown_type TEXT NOT NULL,
  dimension_1 TEXT NOT NULL,
  dimension_2 TEXT NOT NULL DEFAULT '',
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  date_start DATE NOT NULL DEFAULT '1970-01-01',
  date_end DATE,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, platform, breakdown_type, dimension_1, dimension_2, date_start)
);

-- Add buyer demographic columns to sales_events
ALTER TABLE public.sales_events 
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS buyer_state TEXT,
  ADD COLUMN IF NOT EXISTS buyer_city TEXT,
  ADD COLUMN IF NOT EXISTS buyer_country TEXT;

-- RLS for ad_demographics
ALTER TABLE public.ad_demographics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage ad demographics"
  ON public.ad_demographics
  FOR ALL
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));

CREATE POLICY "Public can view ad demographics"
  ON public.ad_demographics
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = ad_demographics.project_id
    AND projects.view_token IS NOT NULL
  ));

-- Indexes
CREATE INDEX idx_ad_demographics_project_type ON public.ad_demographics(project_id, platform, breakdown_type);
CREATE INDEX idx_sales_events_buyer_state ON public.sales_events(project_id, buyer_state) WHERE buyer_state IS NOT NULL;

-- Fix ad_demographics RLS: all policies are RESTRICTIVE which means default deny
-- Need to recreate them as PERMISSIVE

DROP POLICY IF EXISTS "Project owners can manage ad demographics" ON public.ad_demographics;
DROP POLICY IF EXISTS "Public can view ad demographics" ON public.ad_demographics;

-- Recreate as PERMISSIVE
CREATE POLICY "Project owners can manage ad demographics"
  ON public.ad_demographics FOR ALL
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));

CREATE POLICY "Public can view ad demographics"
  ON public.ad_demographics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = ad_demographics.project_id
    AND projects.view_token IS NOT NULL
  ));

-- Drop the RESTRICTIVE policies and recreate as explicitly PERMISSIVE
DROP POLICY IF EXISTS "Project owners can manage ad demographics" ON public.ad_demographics;
DROP POLICY IF EXISTS "Public can view ad demographics" ON public.ad_demographics;

-- Recreate as PERMISSIVE (explicitly stated)
CREATE POLICY "Owners manage ad demographics"
  ON public.ad_demographics FOR ALL
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));

CREATE POLICY "Public view ad demographics"
  ON public.ad_demographics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = ad_demographics.project_id
    AND projects.view_token IS NOT NULL
  ));
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
-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
-- Create dedicated table for Meta ads data
CREATE TABLE IF NOT EXISTS public.meta_ads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ad_id text NOT NULL,
  ad_name text,
  status text,
  spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  cpm numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  purchases integer DEFAULT 0,
  leads integer DEFAULT 0,
  preview_link text,
  date_start date,
  date_end date,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(project_id, ad_id, date_start)
);

ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage meta ads"
  ON public.meta_ads FOR ALL
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));

CREATE POLICY "Admins can view all meta ads"
  ON public.meta_ads FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view meta ads"
  ON public.meta_ads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = meta_ads.project_id AND projects.view_token IS NOT NULL
  ));

CREATE INDEX IF NOT EXISTS idx_meta_ads_project_date ON public.meta_ads(project_id, date_start DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ads_project_spend ON public.meta_ads(project_id, spend DESC);

-- Allow public/anonymous access to projects for public dashboard
CREATE POLICY "Public can view projects by slug or token"
ON public.projects
FOR SELECT
USING (slug IS NOT NULL OR view_token IS NOT NULL);

-- Add hook_rate and hold_rate columns to meta_ads for video ad metrics
ALTER TABLE public.meta_ads
ADD COLUMN IF NOT EXISTS hook_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS hold_rate numeric DEFAULT 0;

-- Allow public to view ALL sales statuses (for boleto tracking, status counts)
DROP POLICY IF EXISTS "Public can view approved sales by project token" ON public.sales_events;
CREATE POLICY "Public can view sales by project token" 
ON public.sales_events FOR SELECT
USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = sales_events.project_id AND projects.view_token IS NOT NULL));

-- Allow public to view whatsapp groups
CREATE POLICY "Public can view whatsapp groups"
ON public.whatsapp_groups FOR SELECT
USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = whatsapp_groups.project_id AND projects.view_token IS NOT NULL));

-- Allow public to view whatsapp member history
CREATE POLICY "Public can view whatsapp member history"
ON public.whatsapp_member_history FOR SELECT
USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = whatsapp_member_history.project_id AND projects.view_token IS NOT NULL));

-- Allow public to view manual investments (verify existing or create)
-- Already has "Public can view investments by project token"

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.meta_ads
ADD CONSTRAINT meta_ads_ad_id_project_id_unique UNIQUE (ad_id, project_id);

-- Composite indexes for dashboard query performance
CREATE INDEX IF NOT EXISTS idx_meta_metrics_project_date ON public.meta_metrics (project_id, date);
CREATE INDEX IF NOT EXISTS idx_google_metrics_project_date ON public.google_metrics (project_id, date);
CREATE INDEX IF NOT EXISTS idx_sales_events_project_date ON public.sales_events (project_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_events_project_platform ON public.sales_events (project_id, platform);
CREATE INDEX IF NOT EXISTS idx_ad_demographics_project_type ON public.ad_demographics (project_id, breakdown_type);
CREATE INDEX IF NOT EXISTS idx_meta_ads_project ON public.meta_ads (project_id, ad_id);
-- Add UTM tracking columns to sales_events
ALTER TABLE public.sales_events
  ADD COLUMN IF NOT EXISTS utm_source text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_medium text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_campaign text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_term text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_content text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_src text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_sck text DEFAULT '';

-- Create index for UTM-based queries
CREATE INDEX IF NOT EXISTS idx_sales_events_utm_source ON public.sales_events (project_id, utm_source) WHERE utm_source != '';
CREATE INDEX IF NOT EXISTS idx_sales_events_utm_campaign ON public.sales_events (project_id, utm_campaign) WHERE utm_campaign != '';
CREATE INDEX IF NOT EXISTS idx_sales_events_utm_content ON public.sales_events (project_id, utm_content) WHERE utm_content != '';

-- Backfill existing data from payload JSONB
UPDATE public.sales_events
SET
  utm_source = COALESCE(NULLIF(payload->>'tracking utm_source', ''), ''),
  utm_medium = COALESCE(NULLIF(payload->>'tracking utm_medium', ''), ''),
  utm_campaign = COALESCE(NULLIF(payload->>'tracking utm_campaign', ''), ''),
  utm_term = COALESCE(NULLIF(payload->>'tracking utm_term', ''), ''),
  utm_content = COALESCE(NULLIF(payload->>'tracking utm_content', ''), ''),
  tracking_src = COALESCE(NULLIF(payload->>'tracking src', ''), ''),
  tracking_sck = COALESCE(NULLIF(payload->>'tracking sck', ''), '')
WHERE payload IS NOT NULL;-- Composite indexes for most queried patterns (project_id + date DESC)
CREATE INDEX IF NOT EXISTS idx_sales_events_project_date ON public.sales_events(project_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_events_project_status ON public.sales_events(project_id, status);
CREATE INDEX IF NOT EXISTS idx_meta_metrics_project_date ON public.meta_metrics(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_google_metrics_project_date ON public.google_metrics(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_demographics_project_type ON public.ad_demographics(project_id, breakdown_type);
CREATE INDEX IF NOT EXISTS idx_meta_ads_project_id ON public.meta_ads(project_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_history_project_group ON public.whatsapp_member_history(project_id, group_id, recorded_at DESC);

-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Project owners can manage products" ON public.products;

CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage products"
  ON public.products FOR ALL
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));

-- Fix products: ensure permissive policies exist
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Project owners can manage products" ON public.products;

CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));

-- Allow admins full CRUD on products (not just SELECT)
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;

CREATE POLICY "Admins can manage all products"
  ON public.products FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
UPDATE sales_events SET status = 'approved' WHERE external_id = 'HP1064622775' AND platform = 'hotmart' AND status = 'pending';ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS hotmart_client_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hotmart_client_secret text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hotmart_basic_auth text DEFAULT NULL;
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can view all meta campaigns" ON public.meta_campaigns;
DROP POLICY IF EXISTS "Project owners can manage meta campaigns" ON public.meta_campaigns;

CREATE POLICY "Admins can view all meta campaigns" ON public.meta_campaigns
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage meta campaigns" ON public.meta_campaigns
  FOR ALL USING (owns_project(project_id)) WITH CHECK (owns_project(project_id));

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

-- Fix: Remove public policy that exposes sensitive project credentials
-- Public access should go through projects_public view instead
DROP POLICY IF EXISTS "Public can view projects by slug or token" ON public.projects;
-- Add is_ignored column to sales_events
ALTER TABLE public.sales_events ADD COLUMN IF NOT EXISTS is_ignored boolean NOT NULL DEFAULT false;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_sales_events_is_ignored ON public.sales_events (project_id, is_ignored) WHERE is_ignored = false;-- Update public_sales_summary view to exclude ignored sales
CREATE OR REPLACE VIEW public.public_sales_summary
WITH (security_invoker=on) AS
SELECT id, project_id, platform, product_name, product_type, amount, gross_amount, platform_fee, status, sale_date, created_at
FROM sales_events
WHERE status = 'approved'::sale_status AND is_ignored = false;
CREATE POLICY "Public can read projects by slug or view_token"
  ON public.projects
  FOR SELECT
  USING (
    slug IS NOT NULL OR view_token IS NOT NULL
  );
ALTER TABLE public.sales_events ADD COLUMN IF NOT EXISTS refund_reason text DEFAULT NULL;ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS link_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS results integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS landing_page_views integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkouts_initiated integer DEFAULT 0;ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS thumbnail_url text;
-- Enum for WhatsApp report frequency
CREATE TYPE public.report_frequency AS ENUM ('daily', 'weekly', 'monthly');

-- Table for WhatsApp metric report configs
CREATE TABLE public.whatsapp_report_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Relatório padrão',
  phone_number TEXT NOT NULL,
  frequency report_frequency NOT NULL DEFAULT 'daily',
  send_hour INTEGER NOT NULL DEFAULT 8,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metrics JSONB NOT NULL DEFAULT '["investment","revenue","sales","roi","leads","cpl","cpc","ctr"]'::jsonb,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_report_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own project report configs"
  ON public.whatsapp_report_configs
  FOR ALL
  TO authenticated
  USING (public.owns_project(project_id))
  WITH CHECK (public.owns_project(project_id));

-- Table for lead journey events
CREATE TABLE public.lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  buyer_email TEXT,
  buyer_name TEXT,
  event_type TEXT NOT NULL,
  event_source TEXT,
  event_detail TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  tracking_src TEXT,
  tracking_sck TEXT,
  ad_id TEXT,
  ad_name TEXT,
  amount NUMERIC DEFAULT 0,
  sale_id UUID,
  metadata JSONB,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project lead events"
  ON public.lead_events
  FOR SELECT
  TO authenticated
  USING (public.owns_project(project_id));

-- Indexes
CREATE INDEX idx_lead_events_project_date ON public.lead_events(project_id, event_date);
CREATE INDEX idx_lead_events_buyer ON public.lead_events(project_id, buyer_email);
CREATE INDEX idx_whatsapp_report_configs_project ON public.whatsapp_report_configs(project_id);

-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can insert notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create tracking_events table for pixel data
CREATE TABLE public.tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  visitor_id TEXT,
  event_type TEXT NOT NULL,
  page_url TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  user_agent TEXT,
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracking_events_project ON public.tracking_events(project_id, created_at DESC);
CREATE INDEX idx_tracking_events_visitor ON public.tracking_events(project_id, visitor_id);

ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view tracking events" ON public.tracking_events
  FOR SELECT TO authenticated
  USING (owns_project(project_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert tracking events" ON public.tracking_events
  FOR INSERT
  WITH CHECK (true);

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
-- Fix lead_events RLS: add admin access and public view
CREATE POLICY "Admins can manage all lead events"
  ON public.lead_events FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can view lead events for projects with view_token
CREATE POLICY "Public can view lead events by project token"
  ON public.lead_events FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = lead_events.project_id
    AND projects.view_token IS NOT NULL
  ));
-- Table to store selected domains/pages for a project's pixel tracking
CREATE TABLE public.project_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, domain)
);

ALTER TABLE public.project_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all project domains"
  ON public.project_domains FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage domains"
  ON public.project_domains FOR ALL
  TO authenticated
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));

-- Add custom API fields to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS custom_api_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_api_key text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_api_name text DEFAULT NULL;

-- Create table to store custom API metrics
CREATE TABLE public.custom_api_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  metric_type text NOT NULL, -- e.g. 'overview', 'campaigns', 'contacts', 'automations'
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  period text DEFAULT '30d',
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_custom_api_metrics_project_type ON public.custom_api_metrics(project_id, metric_type);

-- Enable RLS
ALTER TABLE public.custom_api_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all custom api metrics"
ON public.custom_api_metrics FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Project owners can manage custom api metrics"
ON public.custom_api_metrics FOR ALL
TO public
USING (owns_project(project_id))
WITH CHECK (owns_project(project_id));

CREATE POLICY "Public can view custom api metrics by token"
ON public.custom_api_metrics FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = custom_api_metrics.project_id
  AND projects.view_token IS NOT NULL
));

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_api_metrics_unique
ON public.custom_api_metrics(project_id, metric_type);
ALTER TABLE public.projects ADD COLUMN custom_api_endpoints jsonb DEFAULT NULL;
CREATE TABLE public.dashboard_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tab_name text NOT NULL DEFAULT 'Painel 1',
  tab_order integer NOT NULL DEFAULT 0,
  widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id, tab_name)
);

ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own layouts"
  ON public.dashboard_layouts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_dashboard_layouts_updated_at
  BEFORE UPDATE ON public.dashboard_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agsell_api_key text DEFAULT NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agsell_base_url text DEFAULT NULL;ALTER TABLE public.projects ADD COLUMN agsell_form_field_mapping jsonb DEFAULT '[]'::jsonb;
-- Remove the CASCADE FK and replace with SET NULL so deleting a user doesn't delete their projects
ALTER TABLE public.projects DROP CONSTRAINT projects_owner_id_fkey;

-- Make owner_id nullable
ALTER TABLE public.projects ALTER COLUMN owner_id DROP NOT NULL;

-- Re-add FK with SET NULL
ALTER TABLE public.projects
  ADD CONSTRAINT projects_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update owns_project to handle nullable owner_id
CREATE OR REPLACE FUNCTION public.owns_project(_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND owner_id IS NOT NULL AND owner_id = auth.uid()
  )
$$;

CREATE TABLE public.integration_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'meta',
  status text NOT NULL DEFAULT 'success',
  ads_synced integer DEFAULT 0,
  metrics_synced integer DEFAULT 0,
  demographics_synced integer DEFAULT 0,
  accounts_synced integer DEFAULT 0,
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_logs_project_platform ON public.integration_sync_logs(project_id, platform, created_at DESC);

ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sync logs for owned projects"
  ON public.integration_sync_logs
  FOR SELECT
  TO authenticated
  USING (public.owns_project(project_id));

CREATE TABLE public.ai_insights_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  summary text NOT NULL,
  health_score integer NOT NULL DEFAULT 0,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_insights_project ON public.ai_insights_history(project_id, created_at DESC);

ALTER TABLE public.ai_insights_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insights for owned projects"
  ON public.ai_insights_history
  FOR SELECT TO authenticated
  USING (public.owns_project(project_id));

CREATE POLICY "Users can insert insights for owned projects"
  ON public.ai_insights_history
  FOR INSERT TO authenticated
  WITH CHECK (public.owns_project(project_id));

CREATE TABLE public.projection_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_ids uuid[] NOT NULL,
  project_names text[] NOT NULL,
  projection_days integer NOT NULL DEFAULT 30,
  price_variation numeric NOT NULL DEFAULT 0.15,
  demand_variation numeric NOT NULL DEFAULT 0.20,
  scenarios jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  sensitivity_matrix jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_recommendation text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.projection_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own simulations"
  ON public.projection_simulations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_projection_simulations_user ON public.projection_simulations(user_id);
ALTER TABLE public.sales_events ADD COLUMN base_price numeric NULL DEFAULT 0;-- Fix critical security issue: replace public SELECT policy on projects
-- that exposes ALL columns (including API secrets) to anonymous users.
-- Instead, only allow public reads on non-sensitive columns via the existing projects_public view.

DROP POLICY IF EXISTS "Public can read projects by slug or view_token" ON public.projects;

-- Create a restrictive policy that only allows public to read non-sensitive columns
-- by routing them through the projects_public view instead.
-- The projects table should only be fully accessible to owners and admins.
CREATE POLICY "Public can read basic project info by slug or view_token"
ON public.projects
FOR SELECT
TO public
USING (
  (slug IS NOT NULL OR view_token IS NOT NULL)
  AND (
    auth.uid() IS NULL 
    OR NOT (
      owns_project(id) OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Note: owners and admins already have full access via their own ALL policies.
-- This new policy still allows public reads but we need to use column-level security.
-- Since Postgres RLS cannot restrict columns, the proper fix is to drop public access
-- to the projects table entirely and use the projects_public view.

-- Actually, let's take the correct approach: remove public direct access to projects
-- and ensure all public access goes through projects_public view
DROP POLICY IF EXISTS "Public can read basic project info by slug or view_token" ON public.projects;

-- Re-create a minimal public policy that only works for specific lookups needed by the app
-- (like finding project by slug/view_token for public dashboards)
-- But since projects_public view already exists for this purpose, we should not allow
-- direct public access to the projects table at all.
-- The owner and admin policies already cover authenticated access.
-- 1. Create organization role enum
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- 2. Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Create organization_members table
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4. Add organization_id to projects (nullable initially for migration)
ALTER TABLE public.projects ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 5. Security definer function: check if user belongs to an organization
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- 6. Security definer function: check org role
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _role org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  )
$$;

-- 7. Get user's organization IDs (for use in policies)
CREATE OR REPLACE FUNCTION public.user_org_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = _user_id
$$;

-- 8. Add organization_id to profiles for quick access
ALTER TABLE public.profiles ADD COLUMN current_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 9. RLS for organizations: members can view their own orgs
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (id IN (SELECT public.user_org_ids(auth.uid())));

CREATE POLICY "Org owners can update their organization"
  ON public.organizations FOR UPDATE
  USING (public.has_org_role(auth.uid(), id, 'owner'))
  WITH CHECK (public.has_org_role(auth.uid(), id, 'owner'));

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage all organizations"
  ON public.organizations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. RLS for organization_members
CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT
  USING (organization_id IN (SELECT public.user_org_ids(auth.uid())));

CREATE POLICY "Org admins can manage members"
  ON public.organization_members FOR ALL
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner')
    OR public.has_org_role(auth.uid(), organization_id, 'admin')
  )
  WITH CHECK (
    public.has_org_role(auth.uid(), organization_id, 'owner')
    OR public.has_org_role(auth.uid(), organization_id, 'admin')
  );

CREATE POLICY "System admins can manage all members"
  ON public.organization_members FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 11. Update projects RLS to include org-based access
CREATE POLICY "Org members can view org projects"
  ON public.projects FOR SELECT
  USING (
    organization_id IS NOT NULL 
    AND organization_id IN (SELECT public.user_org_ids(auth.uid()))
  );

CREATE POLICY "Org members can insert org projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL 
    AND organization_id IN (SELECT public.user_org_ids(auth.uid()))
  );

CREATE POLICY "Org members can update org projects"
  ON public.projects FOR UPDATE
  USING (
    organization_id IS NOT NULL 
    AND organization_id IN (SELECT public.user_org_ids(auth.uid()))
  )
  WITH CHECK (
    organization_id IS NOT NULL 
    AND organization_id IN (SELECT public.user_org_ids(auth.uid()))
  );

CREATE POLICY "Org members can delete org projects"
  ON public.projects FOR DELETE
  USING (
    organization_id IS NOT NULL 
    AND (
      public.has_org_role(auth.uid(), organization_id, 'owner')
      OR public.has_org_role(auth.uid(), organization_id, 'admin')
    )
  );

-- 12. Create a default organization for each existing user and migrate projects
-- First create a function to handle the migration
CREATE OR REPLACE FUNCTION public.migrate_to_organizations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user RECORD;
  _org_id UUID;
BEGIN
  -- For each user with projects, create an org
  FOR _user IN 
    SELECT DISTINCT owner_id FROM public.projects WHERE owner_id IS NOT NULL
  LOOP
    -- Create org
    INSERT INTO public.organizations (name, created_by)
    SELECT COALESCE(p.name, 'Minha Organização'), _user.owner_id
    FROM public.profiles p WHERE p.id = _user.owner_id
    RETURNING id INTO _org_id;
    
    -- Add user as owner
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (_org_id, _user.owner_id, 'owner');
    
    -- Update profile
    UPDATE public.profiles SET current_organization_id = _org_id WHERE id = _user.owner_id;
    
    -- Assign projects
    UPDATE public.projects SET organization_id = _org_id WHERE owner_id = _user.owner_id;
  END LOOP;
END;
$$;

-- Run migration
SELECT public.migrate_to_organizations();

-- Clean up migration function
DROP FUNCTION public.migrate_to_organizations();

-- 13. Update handle_new_user to auto-create an organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  
  -- Create default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Create default organization
  INSERT INTO public.organizations (name, created_by)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'name', 'Minha Organização'), NEW.id)
  RETURNING id INTO _org_id;
  
  -- Add user as org owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, NEW.id, 'owner');
  
  -- Set as current org
  UPDATE public.profiles SET current_organization_id = _org_id WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- 14. Update the projects_public view to include organization_id
CREATE OR REPLACE VIEW public.projects_public
WITH (security_invoker=on) AS
  SELECT 
    id, name, description, strategy, start_date, end_date, cart_open_date,
    budget, manual_investment, is_active, created_at, updated_at,
    view_token, meta_leads_enabled, google_leads_enabled, owner_id, slug,
    organization_id
  FROM public.projects;

-- 15. Create index for org lookups
CREATE INDEX idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);

-- Fix: restrict org creation to authenticated users with proper check
DROP POLICY "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

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

-- Fix all views to use SECURITY INVOKER (inherit caller's RLS)
ALTER VIEW public.projects_public SET (security_invoker = on);
ALTER VIEW public.public_sales_view SET (security_invoker = on);
ALTER VIEW public.public_lead_events_view SET (security_invoker = on);
ALTER VIEW public.public_sales_summary SET (security_invoker = on);

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
-- Fix Kiwify sales: move fee from taxes to platform_fee where it was misplaced
-- Case 1: platform_fee=0, taxes>0 → move taxes to platform_fee, zero taxes
UPDATE sales_events
SET platform_fee = taxes, taxes = 0
WHERE platform = 'kiwify' AND platform_fee = 0 AND taxes > 0;

-- Case 2: both have same value (duplicated) → zero out taxes
UPDATE sales_events
SET taxes = 0
WHERE platform = 'kiwify' AND platform_fee > 0 AND taxes > 0 AND platform_fee = taxes;
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
ALTER PUBLICATION supabase_realtime DROP TABLE public.sales_events;-- Allow all authenticated users to view all projects
CREATE POLICY "All authenticated users can view projects"
ON public.projects
FOR SELECT
TO authenticated
USING (true);

-- Create project_debriefings table
CREATE TABLE public.project_debriefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  period_start DATE,
  period_end DATE,
  strategy TEXT,
  overall_score INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  comparison_with_previous JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_debriefings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Project owners can manage debriefings"
ON public.project_debriefings FOR ALL
TO authenticated
USING (owns_project(project_id))
WITH CHECK (owns_project(project_id));

CREATE POLICY "Org members can view debriefings"
ON public.project_debriefings FOR SELECT
TO authenticated
USING (is_org_project_member(auth.uid(), project_id));

CREATE POLICY "Admins can manage all debriefings"
ON public.project_debriefings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_debriefings_project_created ON public.project_debriefings (project_id, created_at DESC);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_organization_id ON public.clients(organization_id);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all clients"
  ON public.clients FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view clients"
  ON public.clients FOR SELECT TO authenticated
  USING (organization_id IN (SELECT user_org_ids(auth.uid())));

CREATE POLICY "Org owners and admins can manage clients"
  ON public.clients FOR ALL
  USING (
    has_org_role(auth.uid(), organization_id, 'owner'::org_role)
    OR has_org_role(auth.uid(), organization_id, 'admin'::org_role)
  )
  WITH CHECK (
    has_org_role(auth.uid(), organization_id, 'owner'::org_role)
    OR has_org_role(auth.uid(), organization_id, 'admin'::org_role)
  );

-- Add client_id to projects
ALTER TABLE public.projects ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
CREATE INDEX idx_projects_client_id ON public.projects(client_id);

-- Trigger for updated_at on clients
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.org_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.org_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view audit logs"
ON public.org_audit_logs
FOR SELECT
TO authenticated
USING (organization_id IN (SELECT user_org_ids(auth.uid())));

CREATE POLICY "Org owners and admins can insert audit logs"
ON public.org_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  has_org_role(auth.uid(), organization_id, 'owner'::org_role)
  OR has_org_role(auth.uid(), organization_id, 'admin'::org_role)
);

CREATE POLICY "System admins can manage all audit logs"
ON public.org_audit_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_org_audit_logs_org ON public.org_audit_logs(organization_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _org_id UUID;
  _target_org_id UUID;
  _target_org_role TEXT;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  
  -- Create default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Check if admin assigned an organization
  _target_org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
  _target_org_role := COALESCE(NEW.raw_user_meta_data->>'org_role', 'member');

  IF _target_org_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.organizations WHERE id = _target_org_id) THEN
    -- Add to existing organization
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (_target_org_id, NEW.id, _target_org_role::org_role);
    
    -- Set as current org
    UPDATE public.profiles SET current_organization_id = _target_org_id WHERE id = NEW.id;
  ELSE
    -- Create default organization (self-signup)
    INSERT INTO public.organizations (name, created_by)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'name', 'Minha Organização'), NEW.id)
    RETURNING id INTO _org_id;
    
    -- Add user as org owner
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (_org_id, NEW.id, 'owner');
    
    -- Set as current org
    UPDATE public.profiles SET current_organization_id = _org_id WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

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
