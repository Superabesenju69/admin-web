require('dotenv').config({ path: '/Users/abrahammartinez/.gemini/antigravity/scratch/restaurant-os/admin-web/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkLatestOrder() {
    const { data: order, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(1).single();
    if (error) {
        console.error("Error fetching order:", error.message);
        return;
    }
    console.log("Latest Order ID:", order.id, "| Created:", order.created_at, "| User ID:", order.user_id);

    const { data: tickets, error: ticketError } = await supabase.from('kitchen_tickets').select('*').eq('order_id', order.id);
    if (ticketError) {
        console.error("Error fetching tickets:", ticketError.message);
    } else {
        console.log(`Found ${tickets.length} tickets for this order.`);
        if (tickets.length > 0) {
            console.log("Ticket 1 Status:", tickets[0].status, "ID:", tickets[0].id);
        }
    }
}

checkLatestOrder();
