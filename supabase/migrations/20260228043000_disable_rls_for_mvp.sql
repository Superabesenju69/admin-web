-- Disable RLS across the board for MVP local environment to avoid blockages

begin;

ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_modifiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_categories DISABLE ROW LEVEL SECURITY;

commit;
