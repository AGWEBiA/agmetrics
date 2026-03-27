
-- 1. Create organization role enum
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- 2. Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Create organization_members table
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4. Add organization_id to projects (nullable initially for migration)
ALTER TABLE public.projects ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 5. Security definer function: check if user belongs to an organization
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- 6. Security definer function: check org role
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _role org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  )
$$;

-- 7. Get user's organization IDs (for use in policies)
CREATE OR REPLACE FUNCTION public.user_org_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = _user_id
$$;

-- 8. Add organization_id to profiles for quick access
ALTER TABLE public.profiles ADD COLUMN current_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 9. RLS for organizations: members can view their own orgs
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (id IN (SELECT public.user_org_ids(auth.uid())));

CREATE POLICY "Org owners can update their organization"
  ON public.organizations FOR UPDATE
  USING (public.has_org_role(auth.uid(), id, 'owner'))
  WITH CHECK (public.has_org_role(auth.uid(), id, 'owner'));

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage all organizations"
  ON public.organizations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. RLS for organization_members
CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT
  USING (organization_id IN (SELECT public.user_org_ids(auth.uid())));

CREATE POLICY "Org admins can manage members"
  ON public.organization_members FOR ALL
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner')
    OR public.has_org_role(auth.uid(), organization_id, 'admin')
  )
  WITH CHECK (
    public.has_org_role(auth.uid(), organization_id, 'owner')
    OR public.has_org_role(auth.uid(), organization_id, 'admin')
  );

CREATE POLICY "System admins can manage all members"
  ON public.organization_members FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 11. Update projects RLS to include org-based access
CREATE POLICY "Org members can view org projects"
  ON public.projects FOR SELECT
  USING (
    organization_id IS NOT NULL 
    AND organization_id IN (SELECT public.user_org_ids(auth.uid()))
  );

CREATE POLICY "Org members can insert org projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL 
    AND organization_id IN (SELECT public.user_org_ids(auth.uid()))
  );

CREATE POLICY "Org members can update org projects"
  ON public.projects FOR UPDATE
  USING (
    organization_id IS NOT NULL 
    AND organization_id IN (SELECT public.user_org_ids(auth.uid()))
  )
  WITH CHECK (
    organization_id IS NOT NULL 
    AND organization_id IN (SELECT public.user_org_ids(auth.uid()))
  );

CREATE POLICY "Org members can delete org projects"
  ON public.projects FOR DELETE
  USING (
    organization_id IS NOT NULL 
    AND (
      public.has_org_role(auth.uid(), organization_id, 'owner')
      OR public.has_org_role(auth.uid(), organization_id, 'admin')
    )
  );

-- 12. Create a default organization for each existing user and migrate projects
-- First create a function to handle the migration
CREATE OR REPLACE FUNCTION public.migrate_to_organizations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user RECORD;
  _org_id UUID;
BEGIN
  -- For each user with projects, create an org
  FOR _user IN 
    SELECT DISTINCT owner_id FROM public.projects WHERE owner_id IS NOT NULL
  LOOP
    -- Create org
    INSERT INTO public.organizations (name, created_by)
    SELECT COALESCE(p.name, 'Minha Organização'), _user.owner_id
    FROM public.profiles p WHERE p.id = _user.owner_id
    RETURNING id INTO _org_id;
    
    -- Add user as owner
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (_org_id, _user.owner_id, 'owner');
    
    -- Update profile
    UPDATE public.profiles SET current_organization_id = _org_id WHERE id = _user.owner_id;
    
    -- Assign projects
    UPDATE public.projects SET organization_id = _org_id WHERE owner_id = _user.owner_id;
  END LOOP;
END;
$$;

-- Run migration
SELECT public.migrate_to_organizations();

-- Clean up migration function
DROP FUNCTION public.migrate_to_organizations();

-- 13. Update handle_new_user to auto-create an organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  
  -- Create default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Create default organization
  INSERT INTO public.organizations (name, created_by)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'name', 'Minha Organização'), NEW.id)
  RETURNING id INTO _org_id;
  
  -- Add user as org owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, NEW.id, 'owner');
  
  -- Set as current org
  UPDATE public.profiles SET current_organization_id = _org_id WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- 14. Update the projects_public view to include organization_id
CREATE OR REPLACE VIEW public.projects_public
WITH (security_invoker=on) AS
  SELECT 
    id, name, description, strategy, start_date, end_date, cart_open_date,
    budget, manual_investment, is_active, created_at, updated_at,
    view_token, meta_leads_enabled, google_leads_enabled, owner_id, slug,
    organization_id
  FROM public.projects;

-- 15. Create index for org lookups
CREATE INDEX idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);
