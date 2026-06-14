begin;
  alter table public.orders add column order_number SERIAL;
commit;
