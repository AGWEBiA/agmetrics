
ALTER TABLE public.meta_ads
ADD CONSTRAINT meta_ads_ad_id_project_id_unique UNIQUE (ad_id, project_id);
