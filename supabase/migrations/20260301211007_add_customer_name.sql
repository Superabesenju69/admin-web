-- Add customer_name field to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
