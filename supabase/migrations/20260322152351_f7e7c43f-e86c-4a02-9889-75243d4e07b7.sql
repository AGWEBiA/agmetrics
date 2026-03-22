
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
