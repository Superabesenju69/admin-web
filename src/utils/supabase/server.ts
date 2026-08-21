import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
    let cookieStore: any;
    try {
        cookieStore = await cookies();
    } catch {
        cookieStore = {
            get: () => undefined,
            getAll: () => [],
            set: () => {}
        };
    }
    const tenantId = cookieStore?.get?.('pos_tenant_id')?.value

    const headers: Record<string, string> = {}
    if (tenantId) {
        headers['x-tenant-id'] = tenantId
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        {
            global: {
                headers
            },
            cookies: {
                getAll() {
                    try {
                        return cookieStore.getAll?.() || []
                    } catch {
                        return []
                    }
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
