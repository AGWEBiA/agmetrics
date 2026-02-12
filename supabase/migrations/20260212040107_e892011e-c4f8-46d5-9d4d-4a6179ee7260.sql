
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
