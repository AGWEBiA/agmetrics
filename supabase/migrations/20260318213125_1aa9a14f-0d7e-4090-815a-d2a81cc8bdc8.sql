
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
