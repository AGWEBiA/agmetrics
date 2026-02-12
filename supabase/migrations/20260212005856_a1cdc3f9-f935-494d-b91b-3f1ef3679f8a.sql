
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
