
-- Allow public to view ALL sales statuses (for boleto tracking, status counts)
DROP POLICY IF EXISTS "Public can view approved sales by project token" ON public.sales_events;
CREATE POLICY "Public can view sales by project token" 
ON public.sales_events FOR SELECT
USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = sales_events.project_id AND projects.view_token IS NOT NULL));

-- Allow public to view whatsapp groups
CREATE POLICY "Public can view whatsapp groups"
ON public.whatsapp_groups FOR SELECT
USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = whatsapp_groups.project_id AND projects.view_token IS NOT NULL));

-- Allow public to view whatsapp member history
CREATE POLICY "Public can view whatsapp member history"
ON public.whatsapp_member_history FOR SELECT
USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = whatsapp_member_history.project_id AND projects.view_token IS NOT NULL));

-- Allow public to view manual investments (verify existing or create)
-- Already has "Public can view investments by project token"

NOTIFY pgrst, 'reload schema';
