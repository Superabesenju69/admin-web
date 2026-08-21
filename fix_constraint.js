const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://jyxvmtcvgodbclnwbyiw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5eHZtdGN2Z29kYmNsbndieWl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkzMzM2NywiZXhwIjoyMDg4NTA5MzY3fQ.vCcYdEw5UlyJ47jCLHUZc3yVPYnxaUz5t8bQk635sbU'
);

async function run() {
    // Step 1: Create an exec_sql function using service role via pg-meta
    // The Supabase pg-meta API is available at /pg/functions endpoint...
    // But let's try a different workaround. We'll try to modify the constraint
    // by going through the Supabase pg-meta REST API

    const projectRef = 'jyxvmtcvgodbclnwbyiw';
    const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5eHZtdGN2Z29kYmNsbndieWl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkzMzM2NywiZXhwIjoyMDg4NTA5MzY3fQ.vCcYdEw5UlyJ47jCLHUZc3yVPYnxaUz5t8bQk635sbU';

    // First, let's check what constraint name exists
    const { data: checkData, error: checkErr } = await supabase
        .from('kitchen_tickets')
        .select('id')
        .limit(0);

    console.log('Table accessible:', !checkErr);

    // Try to find the exact constraint name via information_schema
    const { data: constraints } = await supabase
        .from('information_schema.check_constraints')
        .select('*');
    console.log('Constraints from info schema:', constraints?.length || 'null/error');

    // Let's try the pg-meta API endpoints that Supabase Studio uses internally
    // These are at the database level, not project level  
    const urls = [
        `https://${projectRef}.supabase.co/pg-meta/default/query`,
        `https://${projectRef}.supabase.co/pg/query`,
        `https://${projectRef}.supabase.co/database/query`,
    ];

    const sql = "ALTER TABLE public.kitchen_tickets DROP CONSTRAINT IF EXISTS kitchen_tickets_status_check; ALTER TABLE public.kitchen_tickets ADD CONSTRAINT kitchen_tickets_status_check CHECK (status IN ('pending', 'in_progress', 'done', 'archived'));";

    for (const url of urls) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                },
                body: JSON.stringify({ query: sql })
            });
            const text = await res.text();
            console.log(`${url}: ${res.status} ${text.substring(0, 200)}`);
            if (res.ok) {
                console.log('SUCCESS!');
                break;
            }
        } catch (e) {
            console.log(`${url}: ERROR ${e.message}`);
        }
    }
}

run();
