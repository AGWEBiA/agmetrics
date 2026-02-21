
-- Allow public/anonymous access to projects for public dashboard
CREATE POLICY "Public can view projects by slug or token"
ON public.projects
FOR SELECT
USING (slug IS NOT NULL OR view_token IS NOT NULL);

-- Add hook_rate and hold_rate columns to meta_ads for video ad metrics
ALTER TABLE public.meta_ads
ADD COLUMN IF NOT EXISTS hook_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS hold_rate numeric DEFAULT 0;
