import { NextResponse } from 'next/server';

// This route runs DDL SQL directly via the pg client (server-side only)
export async function GET() {
    // Dynamic import to avoid bundling pg on client
    const { Client } = await import('pg');

    const client = new Client({
        connectionString: `postgres://postgres.jyxvmtcvgodbclnwbyiw:${encodeURIComponent('Aj4748mm898869.')}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log('Dropping old role check constraint...');
        await client.query('ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;');

        console.log('Adding new role check constraint including system_admin...');
        await client.query(`
            ALTER TABLE public.usuarios 
            ADD CONSTRAINT usuarios_role_check 
            CHECK (role IN ('system_admin', 'super_admin', 'owner', 'admin', 'cajero', 'mesero', 'cocinero', 'estacion'));
        `);

        console.log('Updating superadmin role to system_admin...');
        const res = await client.query(`
            UPDATE public.usuarios 
            SET role = 'system_admin' 
            WHERE username = 'superadmin';
        `);

        await client.end();
        return NextResponse.json({ success: true, message: `Role check constraint updated and ${res.rowCount} user(s) updated to system_admin` });
    } catch (e: any) {
        try { await client.end(); } catch (_) { }
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
