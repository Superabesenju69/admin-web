import { NextResponse } from 'next/server';

export async function GET() {
    const { Client } = await import('pg');

    const client = new Client({
        connectionString: `postgres://postgres.jyxvmtcvgodbclnwbyiw:${encodeURIComponent('Aj4748mm898869.')}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        await client.query(`ALTER TABLE public.kitchen_tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

        await client.query(`
            CREATE OR REPLACE FUNCTION update_kitchen_ticket_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await client.query(`DROP TRIGGER IF EXISTS trigger_update_kitchen_ticket_updated_at ON kitchen_tickets`);
        await client.query(`
            CREATE TRIGGER trigger_update_kitchen_ticket_updated_at
            BEFORE UPDATE ON kitchen_tickets
            FOR EACH ROW
            EXECUTE FUNCTION update_kitchen_ticket_updated_at();
        `);

        await client.end();
        return NextResponse.json({ success: true });
    } catch (e: any) {
        try { await client.end(); } catch (_) { }
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
