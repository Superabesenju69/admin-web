-- 5. Categories Table
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0
);

-- 6. ItemCategories (Many-to-Many Link)
CREATE TABLE public.item_categories (
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    PRIMARY KEY(item_id, category_id)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_categories ENABLE ROW LEVEL SECURITY;

-- Policies for Categories
CREATE POLICY "Allow anon read access on categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access on categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access on categories" ON public.categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete access on categories" ON public.categories FOR DELETE USING (true);

-- Policies for Item Categories
CREATE POLICY "Allow anon read access on item_categories" ON public.item_categories FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access on item_categories" ON public.item_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access on item_categories" ON public.item_categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete access on item_categories" ON public.item_categories FOR DELETE USING (true);

-- Insert Default Categories
INSERT INTO public.categories (name, display_order) VALUES
('Pizzas', 1),
('Beverages', 2),
('Combos', 3),
('Desserts', 4),
('Ingredients Base', 99);

-- Link existing items to categories
DO $$
DECLARE
    pizza_id UUID;
    water_id UUID;
    tomato_id UUID;
    cat_pizza_id UUID;
    cat_bev_id UUID;
    cat_ingred_id UUID;
BEGIN
    SELECT id INTO pizza_id FROM public.items WHERE name = 'Margarita Pizza';
    SELECT id INTO water_id FROM public.items WHERE name = 'Water Bottle';
    SELECT id INTO tomato_id FROM public.items WHERE name = 'Tomato';

    SELECT id INTO cat_pizza_id FROM public.categories WHERE name = 'Pizzas';
    SELECT id INTO cat_bev_id FROM public.categories WHERE name = 'Beverages';
    SELECT id INTO cat_ingred_id FROM public.categories WHERE name = 'Ingredients Base';

    IF pizza_id IS NOT NULL AND cat_pizza_id IS NOT NULL THEN
        INSERT INTO public.item_categories (item_id, category_id) VALUES (pizza_id, cat_pizza_id);
    END IF;

    IF water_id IS NOT NULL AND cat_bev_id IS NOT NULL THEN
        INSERT INTO public.item_categories (item_id, category_id) VALUES (water_id, cat_bev_id);
    END IF;

    IF tomato_id IS NOT NULL AND cat_ingred_id IS NOT NULL THEN
        INSERT INTO public.item_categories (item_id, category_id) VALUES (tomato_id, cat_ingred_id);
    END IF;
END $$;
