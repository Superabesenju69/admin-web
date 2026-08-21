import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data, error } = await supabase
    .from('orders')
    .select('id, user_id, created_at, status, served_at, kitchen_tickets(id, status, created_at, updated_at), usuarios(id, nombre, apellido, role)')
    .order('created_at', { ascending: false })
    .limit(5);

console.log(JSON.stringify(data, null, 2));
if (error) console.error('Error:', error);
