
-- Allow admins full CRUD on products (not just SELECT)
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;

CREATE POLICY "Admins can manage all products"
  ON public.products FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
