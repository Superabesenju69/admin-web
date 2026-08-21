import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

let start = new Date();
start.setHours(0, 0, 0, 0);
start.setMonth(start.getMonth() - 1);

const { data, error } = await supabase
    .from('orders')
    .select('created_at, served_at')
    .not('served_at', 'is', null)
    .gte('created_at', start.toISOString());

console.log('start string:', start.toISOString());
console.log('filtered data length:', data ? data.length : error);
