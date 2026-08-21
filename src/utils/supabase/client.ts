import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    let tenantId = ''
    if (typeof window !== 'undefined') {
        tenantId = localStorage.getItem('pos_tenant_id') || ''
    }

    const headers: Record<string, string> = {}
    if (tenantId) {
        headers['x-tenant-id'] = tenantId
    }

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                headers
            }
        }
    )
}
