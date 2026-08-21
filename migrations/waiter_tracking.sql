-- Add user_id to link an order to the POS Waiter who created it
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- Add served_at to track when the Waiter delivered the food
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ;
