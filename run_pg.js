const fs = require('fs');
const { Client } = require('pg');

// Supabase forces all IPv4 connections through the pooler now.
// The password MUST be URI encoded when passed in the connection string if it contains special characters
// although "Aj4748mm898869." doesn't strictly need encoding except for safety.
const pass = encodeURIComponent('Aj4748mm898869.');
// Pooler requires the user format to be: [db-user].[project-ref] e.g. postgres.jyxvmtcvgodbclnwbyiw
const user = `postgres.jyxvmtcvgodbclnwbyiw`;
const host = 'aws-0-us-west-1.pooler.supabase.com';

const connectionString = `postgres://${user}:${pass}@${host}:6543/postgres`;

async function run() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected natively to Postgres via IPv4 Pooler.');
        const sql = fs.readFileSync('/tmp/centralized_printers_migration.sql', 'utf8');

        console.log('Running centralized printers migration...');
        await client.query(sql);

        console.log('Success! SQL executed.');
    } catch (e) {
        console.error('Migration failed:', e.stack);
        if (e.position) {
            const pos = parseInt(e.position);
            const sqlText = fs.readFileSync('/tmp/centralized_printers_migration.sql', 'utf8');
            console.error('Near:', sqlText.substring(Math.max(0, pos - 50), pos + 50));
        }
    } finally {
        await client.end();
    }
}

run();
