
-- Fix all views to use SECURITY INVOKER (inherit caller's RLS)
ALTER VIEW public.projects_public SET (security_invoker = on);
ALTER VIEW public.public_sales_view SET (security_invoker = on);
ALTER VIEW public.public_lead_events_view SET (security_invoker = on);
ALTER VIEW public.public_sales_summary SET (security_invoker = on);
