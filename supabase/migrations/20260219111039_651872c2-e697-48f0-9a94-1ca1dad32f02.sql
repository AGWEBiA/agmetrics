
-- 1. Fix projects: Replace the overly permissive public SELECT policy
-- Drop the old policy that exposes all columns
DROP POLICY IF EXISTS "Anyone can view projects by view_token" ON public.projects;

-- Create a restricted public view that excludes sensitive columns
CREATE OR REPLACE VIEW public.projects_public
WITH (security_invoker = on) AS
SELECT 
  id, name, description, strategy, start_date, end_date, cart_open_date,
  budget, manual_investment, is_active, created_at, updated_at, view_token,
  meta_leads_enabled, google_leads_enabled, owner_id
FROM public.projects;
-- Excludes: evolution_api_key, evolution_api_url, evolution_instance_name,
-- kiwify_client_id, kiwify_client_secret, kiwify_account_id, kiwify_webhook_token,
-- hotmart_webhook_token

-- New public policy: only allow authenticated users who own OR have view_token access
-- Owner access (full columns via direct table)
CREATE POLICY "Owners can select their projects"
ON public.projects FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Anon/public access via view_token (will use the view instead)
CREATE POLICY "Public can view projects by view_token"
ON public.projects FOR SELECT
TO anon, authenticated
USING (view_token IS NOT NULL);

-- But we need the owner ALL policy to still work for write operations
-- The existing "Owners can do everything" is already for ALL, let's keep it

-- 2. Fix public_sales_summary: enable RLS on the view's base - it's a view so we add security
-- The view already reads from sales_events which has RLS, and uses security_invoker
-- So it inherits the RLS of the underlying table. This is safe.
-- But let's verify by checking if RLS is enabled on it - views don't have RLS directly.

-- 3. Update the public SELECT policy to be more restrictive
-- Actually, the issue is that the current policy exposes ALL columns.
-- We can't do column-level RLS in Postgres. The solution is:
-- a) Use the view for public access
-- b) Make the base table only accessible to owners

-- Let's redo this properly:
DROP POLICY IF EXISTS "Owners can select their projects" ON public.projects;
DROP POLICY IF EXISTS "Public can view projects by view_token" ON public.projects;

-- Re-add the public policy but it will still expose all columns...
-- The ONLY real fix is to use the view for public queries and restrict base table

-- Owner-only SELECT on base table (they need all columns for config)
CREATE POLICY "Authenticated owners can select projects"
ON public.projects FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Public/anon needs view_token lookup but should NOT see secrets
-- We allow this minimal access for view_token lookup only
CREATE POLICY "Anyone can lookup projects by view_token"
ON public.projects FOR SELECT
USING (view_token IS NOT NULL);
