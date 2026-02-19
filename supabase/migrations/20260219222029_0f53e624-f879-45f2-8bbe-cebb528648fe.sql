
-- Step 1: Drop the view that depends on projects table
DROP VIEW IF EXISTS public.projects_public;

-- Step 2: Add slug column
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Step 3: Create index
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects (slug);

-- Step 4: Recreate view with slug
CREATE VIEW public.projects_public AS
SELECT 
  id, name, description, strategy,
  start_date, end_date, cart_open_date,
  budget, manual_investment, is_active,
  created_at, updated_at, view_token,
  meta_leads_enabled, google_leads_enabled,
  owner_id, slug
FROM public.projects;
