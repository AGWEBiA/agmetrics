
-- Fix security definer view by setting security_invoker
ALTER VIEW public.projects_public SET (security_invoker = on);
