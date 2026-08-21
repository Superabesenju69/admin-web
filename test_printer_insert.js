const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testInsert() {
    console.log('Inserting printer...');
    const { data, error } = await supabase.from('printers')
        .insert([{ name: 'Test Printer 123', ip_address: '192.168.1.99', port: 9100 }])
        .select().single();
    
    console.log('Result:', { data, error });
}

testInsert();
