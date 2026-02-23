
-- Fix products: ensure permissive policies exist
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Project owners can manage products" ON public.products;

CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Project owners can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (owns_project(project_id))
  WITH CHECK (owns_project(project_id));
