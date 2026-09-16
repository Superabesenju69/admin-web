-- Add type_name column to recipes table for 2D recipe matrix (Tipo × Tamaño)
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS type_name TEXT DEFAULT NULL;

-- Add combination_prices JSONB column to items table for storing price matrix
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS combination_prices JSONB DEFAULT '{}'::JSONB;

-- Create an index for quick lookup of parent item recipes by size and type
CREATE INDEX IF NOT EXISTS idx_recipes_parent_type_size ON public.recipes(parent_item_id, type_name, size_name);
