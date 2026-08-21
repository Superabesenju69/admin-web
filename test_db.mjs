import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data, error } = await supabase.from('orders').select('created_at, served_at').not('served_at', 'is', null);
console.log('Orders with served_at:', data ? data.length : error);
if (data && data.length > 0) {
    console.log('Sample dates:', data.map(d => d.created_at).slice(0, 5));
}
