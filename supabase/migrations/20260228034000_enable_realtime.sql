-- Enable realtime for the tables that the POS App relies on
begin;
  -- remove the supabase_realtime publication if it already exists, to ensure we recreate it
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.item_categories;
alter publication supabase_realtime add table public.recipes;
