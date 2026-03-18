
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
