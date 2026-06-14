-- Add INSERT policies for orders and order_line_items
begin;
  create policy "Allow anon insert access on orders" on public.orders for insert with check (true);
  create policy "Allow anon insert access on order_line_items" on public.order_line_items for insert with check (true);
commit;
