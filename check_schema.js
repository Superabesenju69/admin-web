require('dotenv').config({ path: '/Users/abrahammartinez/.gemini/antigravity/scratch/restaurant-os/admin-web/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
    // Try to select a single order including the new columns
    const { data, error } = await supabase.from('orders').select('id, user_id, served_at').limit(1);
    if (error) {
        console.error("Schema Check Error:", error.message);
    } else {
        console.log("Schema Check Success. The columns exist.");
    }
}

checkSchema();
