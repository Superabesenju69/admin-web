import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const getAdminSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only PNG, JPG, and SVG are allowed.' }, { status: 400 });
        }

        // Validate size (5MB)
        if (file.size > 5242880) {
            return NextResponse.json({ error: 'File size exceeds 5MB limit.' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const extensionMap: Record<string, string> = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/svg+xml': 'svg'
        };
        const tenantId = req.cookies.get('pos_tenant_id')?.value;
        const folder = tenantId ? `logos/${tenantId}` : 'logos';
        const fileExt = extensionMap[file.type] || 'png';
        const fileName = `${folder}/${uuidv4()}.${fileExt}`;

        // Upload to bucket
        const { error } = await getAdminSupabase().storage
            .from('restaurant-assets')
            .upload(fileName, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Upload error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get public URL
        const { data: { publicUrl } } = getAdminSupabase().storage
            .from('restaurant-assets')
            .getPublicUrl(fileName);

        return NextResponse.json({ url: publicUrl });
    } catch (e: any) {
        console.error('API Error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
