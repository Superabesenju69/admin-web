-- Add type column to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'menu';
ALTER TABLE public.categories ADD CONSTRAINT categories_type_check CHECK (type IN ('menu', 'inventory'));

-- Update existing "Ingredients Base" to inventory
UPDATE public.categories SET type = 'inventory' WHERE name = 'Ingredients Base';
