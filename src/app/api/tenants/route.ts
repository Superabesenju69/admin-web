import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const getAdminSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkSystemAdmin(req: NextRequest) {
    const userId = req.headers.get('x-user-id');
    const tenantId = req.headers.get('x-tenant-id');

    if (!userId || !tenantId) {
        return false;
    }

    const supabase = getAdminSupabase();
    const { data: user, error } = await supabase
        .from('usuarios')
        .select('role, active')
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

    if (error || !user) {
        return false;
    }

    return user.active && user.role === 'system_admin';
}

export async function GET(req: NextRequest) {
    try {
        if (!await checkSystemAdmin(req)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getAdminSupabase();
        const { data: tenants, error } = await supabase
            .from('tenants')
            .select('*')
            .order('name');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ tenants });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!await checkSystemAdmin(req)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, subdomain, adminUsername, adminPassword, adminPin, adminNombre, adminApellido, adminEmail } = body;

        if (!name || !subdomain || !adminUsername || !adminPassword || !adminPin || !adminNombre || !adminApellido) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const cleanSubdomain = subdomain.trim().toLowerCase();
        if (!/^[a-z0-9-]+$/.test(cleanSubdomain)) {
            return NextResponse.json({ error: 'Subdomain must be lowercase alphanumeric and may contain hyphens' }, { status: 400 });
        }

        const supabase = getAdminSupabase();

        // Check if subdomain is already taken
        const { data: existingTenant } = await supabase
            .from('tenants')
            .select('id')
            .eq('subdomain', cleanSubdomain)
            .maybeSingle();

        if (existingTenant) {
            return NextResponse.json({ error: 'Subdomain already exists' }, { status: 400 });
        }

        // Create the tenant
        const { data: newTenant, error: tenantErr } = await supabase
            .from('tenants')
            .insert([{ name: name.trim(), subdomain: cleanSubdomain }])
            .select()
            .single();

        if (tenantErr || !newTenant) {
            return NextResponse.json({ error: tenantErr?.message || 'Failed to create tenant' }, { status: 500 });
        }

        const tenantId = newTenant.id;

        // Seed default owner user for new tenant
        const { error: userErr } = await supabase
            .from('usuarios')
            .insert([{
                tenant_id: tenantId,
                username: adminUsername.trim().toLowerCase(),
                password: adminPassword,
                pin: adminPin,
                nombre: adminNombre.trim(),
                apellido: adminApellido.trim(),
                email: adminEmail ? adminEmail.trim().toLowerCase() : null,
                role: 'owner',
                active: true,
                contract_type: 'laboral',
                hourly_rate: 0
            }]);

        if (userErr) {
            // Rollback tenant creation on user seed failure
            await supabase.from('tenants').delete().eq('id', tenantId);
            return NextResponse.json({ error: `Failed to create owner user: ${userErr.message}` }, { status: 500 });
        }

        // Seed default restaurant settings for the new tenant
        const { error: settingsErr } = await supabase
            .from('restaurant_settings')
            .insert([{
                tenant_id: tenantId,
                enable_table_service: false,
                theme_color: 'teal',
                theme_mode: 'light',
                currency: 'USD',
                attendance_settings: {},
                payroll_settings: {}
            }]);

        if (settingsErr) {
            // Rollback user and tenant on settings seed failure
            await supabase.from('usuarios').delete().eq('tenant_id', tenantId);
            await supabase.from('tenants').delete().eq('id', tenantId);
            return NextResponse.json({ error: `Failed to seed restaurant settings: ${settingsErr.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, tenant: newTenant });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        if (!await checkSystemAdmin(req)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, active } = body;

        if (!id || active === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = getAdminSupabase();
        const { error } = await supabase
            .from('tenants')
            .update({ active: !!active })
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server Error' }, { status: 500 });
    }
}
