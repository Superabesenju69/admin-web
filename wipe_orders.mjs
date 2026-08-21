import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function deleteAll() {
    console.log('Deleting kitchen_tickets...');
    await supabase.from('kitchen_tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting order_line_items...');
    await supabase.from('order_line_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting orders...');
    const { data, error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) {
        console.error('Error deleting orders:', error);
    } else {
        console.log('Successfully deleted all orders.');
    }
}

deleteAll();
