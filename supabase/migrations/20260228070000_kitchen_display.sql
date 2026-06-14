-- Kitchen Display System + Inventory Logs

begin;

-- Kitchen stations
CREATE TABLE IF NOT EXISTS public.kitchen_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assign station to items
ALTER TABLE public.items
    ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES public.kitchen_stations(id) ON DELETE SET NULL;

-- Kitchen tickets (one per station per order)
CREATE TABLE IF NOT EXISTS public.kitchen_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_number INT,
    station_id UUID REFERENCES public.kitchen_stations(id) ON DELETE SET NULL,
    station_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
    type TEXT DEFAULT 'take_out',
    table_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items on each kitchen ticket
CREATE TABLE IF NOT EXISTS public.kitchen_ticket_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.kitchen_tickets(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    modifications JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory stock addition logs
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    quantity_added NUMERIC NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on all new tables for MVP
ALTER TABLE public.kitchen_stations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_ticket_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs DISABLE ROW LEVEL SECURITY;

-- Enable realtime on kitchen_tickets so KDS updates live
ALTER TABLE public.kitchen_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.kitchen_ticket_items REPLICA IDENTITY FULL;

commit;
