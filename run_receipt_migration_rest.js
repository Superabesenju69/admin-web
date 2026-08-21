import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

async function run() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials in .env.local!');
        process.exit(1);
    }

    const sqlPath = '../supabase/migrations/20260527_receipt_template.sql';
    const migrationSql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration via Supabase REST PG Query Proxy...');
    try {
        const response = await fetch(`${supabaseUrl}/pg/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ query: migrationSql })
        });

        const text = await response.text();
        console.log('Response Status:', response.status);
        console.log('Response Body:', text);

        if (response.ok) {
            console.log('Database migration applied successfully!');
            
            // Verify columns
            const verifyRes = await fetch(`${supabaseUrl}/pg/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({ query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'restaurant_settings' AND column_name = 'receipt_template';" })
            });
            console.log('Verification status:', verifyRes.status);
            console.log('Verification details:', await verifyRes.text());
        } else {
            console.error('Database migration failed via REST!');
        }
    } catch (e) {
        console.error('Error executing REST migration:', e.message || e.toString());
    }
}

run();
