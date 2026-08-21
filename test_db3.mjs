import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data } = await supabase
    .from('orders')
    .select('id, kitchen_tickets(id, status)')
    .not('served_at', 'is', null);

console.log('Orders:', data.length);
console.log('Orders with tickets:', data.filter(d => d.kitchen_tickets && d.kitchen_tickets.length > 0).length);
console.log('Sample tickets array:', data[0].kitchen_tickets);
