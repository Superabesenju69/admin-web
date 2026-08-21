import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const client = new Client({
        connectionString: `postgres://postgres.jyxvmtcvgodbclnwbyiw:${encodeURIComponent('Aj4748mm898869.')}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected natively to Postgres via IPv4 Pooler.');

        const sqlPath = path.join(__dirname, '../supabase/migrations/20260609_add_payroll_module.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running payroll migration...');
        await client.query(sql);

        console.log('✅ Payroll migration completed successfully!');
    } catch (e) {
        console.error('❌ Migration failed:', e.stack);
    } finally {
        await client.end();
    }
}

run();
