
-- Create enum for permissions
CREATE TYPE public.app_permission AS ENUM (
  'projects.view',
  'projects.edit',
  'sales.view',
  'integrations.manage',
  'data.export'
);

-- Create user_permissions table
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission app_permission NOT NULL,
  UNIQUE (user_id, permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view own permissions
CREATE POLICY "Users can view own permissions"
  ON public.user_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Security definer function to check permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission app_permission)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id AND permission = _permission
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Auto-grant all permissions to new users via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_permissions (user_id, permission)
  VALUES
    (NEW.id, 'projects.view'),
    (NEW.id, 'projects.edit'),
    (NEW.id, 'sales.view'),
    (NEW.id, 'integrations.manage'),
    (NEW.id, 'data.export');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_user_grant_permissions
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_permissions();
