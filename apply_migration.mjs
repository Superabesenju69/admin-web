import pkg from 'pg';
const { Client } = pkg;

async function run() {
    const client = new Client({
        connectionString: `postgres://postgres.jyxvmtcvgodbclnwbyiw:${encodeURIComponent('Aj4748mm898869.')}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log('Adding updated_at column to kitchen_tickets...');
        await client.query(`ALTER TABLE public.kitchen_tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

        console.log('Creating trigger function...');
        await client.query(`
            CREATE OR REPLACE FUNCTION update_kitchen_ticket_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        console.log('Adding trigger...');
        await client.query(`DROP TRIGGER IF EXISTS trigger_update_kitchen_ticket_updated_at ON kitchen_tickets`);
        await client.query(`
            CREATE TRIGGER trigger_update_kitchen_ticket_updated_at
            BEFORE UPDATE ON kitchen_tickets
            FOR EACH ROW
            EXECUTE FUNCTION update_kitchen_ticket_updated_at();
        `);

        console.log('Migration applied successfully!');
    } catch (e) {
        console.error('Error applying migration:', e.message);
    } finally {
        await client.end();
    }
}

run();
