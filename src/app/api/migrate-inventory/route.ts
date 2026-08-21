import { NextResponse } from 'next/server';

export async function GET() {
    const { Client } = await import('pg');

    const client = new Client({
        connectionString: `postgres://postgres.jyxvmtcvgodbclnwbyiw:${encodeURIComponent('Aj4748mm898869.')}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
        ssl: { rejectUnauthorized: false }
    });

    const migrations = [
        `CREATE TABLE IF NOT EXISTS suppliers (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            contact_name TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
        )`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC DEFAULT 0`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'each'`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS par_level NUMERIC DEFAULT 0`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS sku TEXT`,
        `ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS change_type TEXT DEFAULT 'restock'`,
        `ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS quantity_removed NUMERIC DEFAULT 0`,
        `ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD'`,
        `ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY`,
        `DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'Allow all access to suppliers') THEN
                CREATE POLICY "Allow all access to suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);
            END IF;
        END $$`,
        `CREATE INDEX IF NOT EXISTS idx_items_supplier_id ON items(supplier_id)`,
    ];

    const results: string[] = [];

    try {
        await client.connect();
        for (const sql of migrations) {
            try {
                await client.query(sql);
                results.push(`✓ ${sql.replace(/\n/g, ' ').substring(0, 80)}...`);
            } catch (err: any) {
                results.push(`⚠ ${sql.replace(/\n/g, ' ').substring(0, 80)}... — ${err.message}`);
            }
        }
        await client.end();
    } catch (err: any) {
        try { await client.end(); } catch (_) {}
        return NextResponse.json({ error: `Connection error: ${err.message}`, results }, { status: 500 });
    }

    return NextResponse.json({ success: true, results });
}
