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