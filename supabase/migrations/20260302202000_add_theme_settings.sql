-- Migration to add dynamic theme color and dark mode settings
ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS theme_color VARCHAR(50) DEFAULT 'teal';
ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(50) DEFAULT 'light';
