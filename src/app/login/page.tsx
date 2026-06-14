'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { data, error: dbErr } = await supabase
            .from('usuarios')
            .select('id, username, nombre, apellido, role, active')
            .eq('username', username.trim().toLowerCase())
            .eq('password', password)
            .single();

        if (dbErr || !data) {
            setError('Invalid username or password.');
            setLoading(false);
            return;
        }
        if (!data.active) {
            setError('Your account is inactive. Contact your manager.');
            setLoading(false);
            return;
        }

        // Store session in localStorage (simple MVP approach)
        localStorage.setItem('pos_user', JSON.stringify({
            id: data.id,
            username: data.username,
            full_name: `${data.nombre} ${data.apellido}`,
            role: data.role,
        }));

        router.replace('/');
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            <div style={{ textAlign: 'center', marginBottom: 48, position: 'absolute', top: '10%' }}>
                <div style={{ fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>
                    🍽 Restaurant OS
                </div>
                <div style={{ color: '#94a3b8', marginTop: 8, fontSize: 16 }}>Management Dashboard</div>
            </div>

            <form onSubmit={handleLogin} style={{
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 24,
                padding: 48,
                width: '100%',
                maxWidth: 400,
                boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
            }}>
                <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 8, marginTop: 0 }}>
                    Sign In
                </h1>
                <p style={{ color: '#64748b', marginBottom: 32, marginTop: 0, fontSize: 14 }}>
                    Enter your username and password
                </p>

                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#fca5a5', padding: '12px 16px', borderRadius: 12, marginBottom: 24, fontSize: 14
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                        Username
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="superadmin"
                        required
                        autoComplete="username"
                        style={{
                            width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 15,
                            outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                </div>

                <div style={{ marginBottom: 32 }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        style={{
                            width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 15,
                            outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                        background: loading ? '#334155' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: '#fff', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                        boxShadow: loading ? 'none' : '0 4px 20px rgba(37,99,235,0.4)',
                        transition: 'all 0.2s',
                    }}
                >
                    {loading ? 'Signing in…' : 'Sign In →'}
                </button>
            </form>
        </div>
    );
}
