-- Add tags array for mapping ingredients to products as extras
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[];

-- Add options JSONB array for required choices like sizes, meat terms, flavors
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::JSONB;
