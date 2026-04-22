
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _org_id UUID;
  _target_org_id UUID;
  _target_org_role TEXT;
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

  -- Check if admin assigned an organization
  _target_org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
  _target_org_role := COALESCE(NEW.raw_user_meta_data->>'org_role', 'member');

  IF _target_org_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.organizations WHERE id = _target_org_id) THEN
    -- Add to existing organization
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (_target_org_id, NEW.id, _target_org_role::org_role);
    
    -- Set as current org
    UPDATE public.profiles SET current_organization_id = _target_org_id WHERE id = NEW.id;
  ELSE
    -- Create default organization (self-signup)
    INSERT INTO public.organizations (name, created_by)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'name', 'Minha Organização'), NEW.id)
    RETURNING id INTO _org_id;
    
    -- Add user as org owner
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (_org_id, NEW.id, 'owner');
    
    -- Set as current org
    UPDATE public.profiles SET current_organization_id = _org_id WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;
