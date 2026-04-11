
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
