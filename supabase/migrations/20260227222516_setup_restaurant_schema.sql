-- Create Enum for Item Types
CREATE TYPE item_type AS ENUM ('ingredient', 'product', 'combo');

-- 1. Unified Items Table
CREATE TABLE public.items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    type item_type NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    track_inventory BOOLEAN NOT NULL DEFAULT true,
    stock_level DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);

-- 2. Recipes Table
CREATE TABLE public.recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    parent_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    child_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 2) NOT NULL,
    unit TEXT NOT NULL,
    UNIQUE(parent_item_id, child_item_id)
);

-- 3. POS Modifiers Setup

-- Modifier Groups (e.g., "Toppings", "Removals")
CREATE TABLE public.modifier_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    min_selections INTEGER NOT NULL DEFAULT 0,
    max_selections INTEGER
);

-- Item Modifiers (Linking items to modifiers)
CREATE TABLE public.item_modifiers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    modifier_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    price_adjustment DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    inventory_impact_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    UNIQUE(item_id, modifier_item_id)
);

-- 4. Order System (Placeholder for future development)
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE public.order_line_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    modifications JSONB DEFAULT '[]'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_line_items ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow anon read for now, to be strictified later)
CREATE POLICY "Allow anon read access on items" ON public.items FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access on items" ON public.items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access on items" ON public.items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete access on items" ON public.items FOR DELETE USING (true);

CREATE POLICY "Allow anon read access on recipes" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access on recipes" ON public.recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access on recipes" ON public.recipes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete access on recipes" ON public.recipes FOR DELETE USING (true);

CREATE POLICY "Allow anon read access on modifier_groups" ON public.modifier_groups FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access on modifier_groups" ON public.modifier_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access on modifier_groups" ON public.modifier_groups FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete access on modifier_groups" ON public.modifier_groups FOR DELETE USING (true);

CREATE POLICY "Allow anon read access on item_modifiers" ON public.item_modifiers FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access on item_modifiers" ON public.item_modifiers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access on item_modifiers" ON public.item_modifiers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete access on item_modifiers" ON public.item_modifiers FOR DELETE USING (true);

-- Insert Initial Test Data
INSERT INTO public.items (name, type, base_price, track_inventory, stock_level) VALUES
('Tomato', 'ingredient', 0.50, true, 100),
('Dough', 'ingredient', 1.00, true, 50),
('Cheese', 'ingredient', 1.50, true, 200),
('Margarita Pizza', 'product', 12.00, false, 0),
('Water Bottle', 'product', 2.00, true, 100);

-- Get IDs for Recipes
DO $$
DECLARE
    tomato_id UUID;
    dough_id UUID;
    cheese_id UUID;
    pizza_id UUID;
BEGIN
    SELECT id INTO tomato_id FROM public.items WHERE name = 'Tomato';
    SELECT id INTO dough_id FROM public.items WHERE name = 'Dough';
    SELECT id INTO cheese_id FROM public.items WHERE name = 'Cheese';
    SELECT id INTO pizza_id FROM public.items WHERE name = 'Margarita Pizza';

    INSERT INTO public.recipes (parent_item_id, child_item_id, quantity, unit) VALUES
    (pizza_id, dough_id, 1, 'piece'),
    (pizza_id, tomato_id, 0.5, 'cup'),
    (pizza_id, cheese_id, 100, 'grams');
END $$;
