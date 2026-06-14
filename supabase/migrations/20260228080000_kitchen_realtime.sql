-- Add kitchen tables to the realtime publication so KDS updates live
alter publication supabase_realtime add table public.kitchen_tickets;
alter publication supabase_realtime add table public.kitchen_ticket_items;
