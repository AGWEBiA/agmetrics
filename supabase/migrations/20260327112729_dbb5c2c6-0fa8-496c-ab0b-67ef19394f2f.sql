
-- Fix: restrict org creation to authenticated users with proper check
DROP POLICY "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());
