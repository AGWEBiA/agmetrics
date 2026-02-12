
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
