
CREATE TABLE public.org_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.org_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view audit logs"
ON public.org_audit_logs
FOR SELECT
TO authenticated
USING (organization_id IN (SELECT user_org_ids(auth.uid())));

CREATE POLICY "Org owners and admins can insert audit logs"
ON public.org_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  has_org_role(auth.uid(), organization_id, 'owner'::org_role)
  OR has_org_role(auth.uid(), organization_id, 'admin'::org_role)
);

CREATE POLICY "System admins can manage all audit logs"
ON public.org_audit_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_org_audit_logs_org ON public.org_audit_logs(organization_id, created_at DESC);
