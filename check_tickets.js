require('dotenv').config({ path: '/Users/abrahammartinez/.gemini/antigravity/scratch/restaurant-os/admin-web/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkTicketCount() {
    const { data: tickets, error } = await supabase.from('kitchen_tickets').select('id, status, created_at').neq('status', 'archived').order('created_at', { ascending: true });
    if (error) {
        console.error("Error fetching tickets:", error.message);
        return;
    }
    console.log(`There are ${tickets.length} ACTIVE (non-archived) tickets.`);
    if (tickets.length > 0) {
        console.log("Oldest ticket:", tickets[0].created_at, "Status:", tickets[0].status);
        console.log("Newest ticket:", tickets[tickets.length - 1].created_at, "Status:", tickets[tickets.length - 1].status);
    }
}

checkTicketCount();
