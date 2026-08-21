import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    console.log("Starting REST DDL proxy...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Using Supabase REST API trick to run DDL instructions: 
    // Usually one cannot run CREATE TABLE over PostgREST. 
    // We will attempt to use the Management API pgmeta endpoint via fetch.

    try {
        const sql = `
         CREATE TABLE IF NOT EXISTS public.printers (
             id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
             name TEXT NOT NULL,
             ip_address TEXT NOT NULL,
             port INTEGER NOT NULL DEFAULT 9100,
             created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
         );
         
         ALTER TABLE public.kitchen_stations ADD COLUMN IF NOT EXISTS printer_id UUID;
         ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS expediter_printer_id UUID;

         CREATE OR REPLACE VIEW public.vw_inventory_availability AS
         SELECT 
             i.id, i.type, i.name, i.track_inventory, i.stock AS real_stock,
             (i.stock - COALESCE((
                 SELECT SUM(oli.quantity) FROM public.order_line_items oli
                 JOIN public.orders o ON o.id = oli.order_id
                 WHERE oli.item_id = i.id AND o.status = 'open'
             ), 0)) AS available_stock
         FROM public.items i;
         `;

        // In Supabase, you can execute SQL via the query endpoint if your role has permissions.
        // Let's call the `query` method if it exists on the client (it usually doesn't on JS client),
        // The only guaranteed way to run SQL on Supabase cloud without pg client or psql CLI is the SQL Editor in the browser.

        const response = await fetch(`${supabaseUrl}/pg/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ query: sql })
        });

        if (!response.ok) {
            const html = await response.text();
            return NextResponse.json({ error: 'PG meta not accessible', details: html }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || e.toString() }, { status: 500 });
    }
}
