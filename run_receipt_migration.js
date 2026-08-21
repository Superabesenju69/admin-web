import pkg from 'pg';
import fs from 'fs';

const { Client } = pkg;

async function run() {
    const connectionString = `postgres://postgres:${encodeURIComponent('Aj4748mm898869.')}@db.jyxvmtcvgodbclnwbyiw.supabase.co:5432/postgres`;
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected natively to Supabase Postgres via Pooler on Port 5432!');

        const sqlPath = '../supabase/migrations/20260527_receipt_template.sql';
        const migrationSql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Applying receipt_template column migration...');
        await client.query(migrationSql);

        console.log('Database migration applied successfully!');

        // Check if column exists
        console.log('Verifying table columns in public.restaurant_settings...');
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'restaurant_settings' AND column_name = 'receipt_template'
        `);
        console.log('Verification Result:', res.rows);
    } catch (e) {
        console.error('Error applying migration:', e.message || e.toString());
    } finally {
        await client.end();
    }
}

run();
