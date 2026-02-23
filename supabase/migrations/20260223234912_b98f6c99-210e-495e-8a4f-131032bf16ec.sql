
CREATE POLICY "Public can read projects by slug or view_token"
  ON public.projects
  FOR SELECT
  USING (
    slug IS NOT NULL OR view_token IS NOT NULL
  );
