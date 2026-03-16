
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
