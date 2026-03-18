
-- Update owns_project to handle nullable owner_id
CREATE OR REPLACE FUNCTION public.owns_project(_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND owner_id IS NOT NULL AND owner_id = auth.uid()
  )
$$;
