import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Helper to get the admin client (avoids build errors if env var is missing at build time)
const getAdminSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // fallback to prevent build crash
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { full_name, email, password, role, pin } = body;

    if (!full_name || !email || !password || !role) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create the auth user
    const { data: authUser, error: authError } = await getAdminSupabase().auth.admin.createUser({
        email,
        password,
        email_confirm: true,   // skip email verification for staff accounts
    });

    if (authError || !authUser.user) {
        return NextResponse.json({ error: authError?.message ?? 'Failed to create user' }, { status: 500 });
    }

    // 2. Insert the staff profile
    const { error: profileError } = await getAdminSupabase().from('staff_profiles').insert({
        id: authUser.user.id,
        full_name,
        role,
        pin: pin || null,
        active: true,
    });

    if (profileError) {
        // Roll back — delete the auth user if profile creation fails
        await getAdminSupabase().auth.admin.deleteUser(authUser.user.id);
        return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ id: authUser.user.id, full_name, role }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
    const body = await req.json();
    const { id, full_name, role, pin, active } = body;

    if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

    const updates: Record<string, any> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (role !== undefined) updates.role = role;
    if (pin !== undefined) updates.pin = pin;
    if (active !== undefined) updates.active = active;

    const { error } = await getAdminSupabase().from('staff_profiles').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

    const { error } = await getAdminSupabase().auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
