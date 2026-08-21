-- Add map_background_url to settings table
begin;

ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS map_background_url TEXT;

commit;
