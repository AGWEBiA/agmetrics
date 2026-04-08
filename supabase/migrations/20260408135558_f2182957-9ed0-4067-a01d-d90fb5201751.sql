-- Allow all authenticated users to view all projects
CREATE POLICY "All authenticated users can view projects"
ON public.projects
FOR SELECT
TO authenticated
USING (true);
