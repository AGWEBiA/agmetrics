
-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_organization_id ON public.clients(organization_id);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all clients"
  ON public.clients FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view clients"
  ON public.clients FOR SELECT TO authenticated
  USING (organization_id IN (SELECT user_org_ids(auth.uid())));

CREATE POLICY "Org owners and admins can manage clients"
  ON public.clients FOR ALL
  USING (
    has_org_role(auth.uid(), organization_id, 'owner'::org_role)
    OR has_org_role(auth.uid(), organization_id, 'admin'::org_role)
  )
  WITH CHECK (
    has_org_role(auth.uid(), organization_id, 'owner'::org_role)
    OR has_org_role(auth.uid(), organization_id, 'admin'::org_role)
  );

-- Add client_id to projects
ALTER TABLE public.projects ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
CREATE INDEX idx_projects_client_id ON public.projects(client_id);

-- Trigger for updated_at on clients
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
