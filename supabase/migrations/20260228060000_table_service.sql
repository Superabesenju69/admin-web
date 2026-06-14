-- Table Service Module Migration

begin;

-- Restaurant-wide settings
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enable_table_service BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row if not exists
INSERT INTO public.restaurant_settings (enable_table_service)
SELECT false WHERE NOT EXISTS (SELECT 1 FROM public.restaurant_settings);

-- Tables
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modify orders table
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'take_out' CHECK (type IN ('dine_in', 'take_out')),
    ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL;

-- Change default status to 'open' and allow 'paid'
-- (existing 'completed' rows stay as-is, new ones start as 'open')
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'open';

-- Disable RLS on new tables
ALTER TABLE public.restaurant_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables DISABLE ROW LEVEL SECURITY;

commit;
