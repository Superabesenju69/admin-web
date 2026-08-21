import React, { useState, useEffect } from 'react';

interface TenantsTabProps {
    currentUser: { id: string; role: string } | null;
    lang: string;
}

export default function TenantsTab({ currentUser, lang }: TenantsTabProps) {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // Form fields
    const [name, setName] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [adminNombre, setAdminNombre] = useState('');
    const [adminApellido, setAdminApellido] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminPin, setAdminPin] = useState('');

    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    
    // Success State
    const [createdInfo, setCreatedInfo] = useState<any | null>(null);

    useEffect(() => {
        loadTenants();
    }, []);

    async function loadTenants() {
        setLoading(true);
        try {
            // Get user credentials from localStorage to pass in request headers
            const storedUser = localStorage.getItem('pos_user');
            const storedTenantId = localStorage.getItem('pos_login_tenant_id') || localStorage.getItem('pos_tenant_id');
            if (!storedUser || !storedTenantId) throw new Error("Authentication missing");
            const u = JSON.parse(storedUser);

            const res = await fetch('/api/tenants', {
                headers: {
                    'x-user-id': u.id,
                    'x-tenant-id': storedTenantId
                }
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setTenants(data.tenants || []);
        } catch (e: any) {
            console.error("Failed to load tenants:", e);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setFormError('');

        if (!name.trim() || !subdomain.trim() || !adminNombre.trim() || !adminApellido.trim() || !adminUsername.trim() || !adminPassword.trim() || !adminPin.trim()) {
            setFormError(lang === 'es' ? 'Por favor complete todos los campos obligatorios.' : 'Please fill all required fields.');
            setSaving(false);
            return;
        }

        if (adminPin.length !== 4 || !/^\d{4}$/.test(adminPin)) {
            setFormError(lang === 'es' ? 'El PIN de acceso debe tener exactamente 4 dígitos.' : 'POS PIN must be exactly 4 digits.');
            setSaving(false);
            return;
        }

        try {
            const storedUser = localStorage.getItem('pos_user');
            const storedTenantId = localStorage.getItem('pos_login_tenant_id') || localStorage.getItem('pos_tenant_id');
            if (!storedUser || !storedTenantId) throw new Error("Authentication credentials missing");
            const u = JSON.parse(storedUser);

            const res = await fetch('/api/tenants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': u.id,
                    'x-tenant-id': storedTenantId
                },
                body: JSON.stringify({
                    name,
                    subdomain,
                    adminNombre,
                    adminApellido,
                    adminUsername,
                    adminEmail: adminEmail || null,
                    adminPassword,
                    adminPin
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Set created info for success card display
            setCreatedInfo({
                name,
                subdomain,
                username: adminUsername.toLowerCase(),
                password: adminPassword,
                pin: adminPin
            });

            // Reload list and reset fields
            await loadTenants();
            setShowCreateModal(false);
            setName('');
            setSubdomain('');
            setAdminNombre('');
            setAdminApellido('');
            setAdminUsername('');
            setAdminEmail('');
            setAdminPassword('');
            setAdminPin('');
        } catch (err: any) {
            setFormError(err.message || (lang === 'es' ? 'Error al registrar sucursal' : 'Error registering tenant'));
        } finally {
            setSaving(false);
        }
    }

    const t = (key: string) => {
        const dict: Record<string, Record<string, string>> = {
            title: { es: 'Gestión de Sucursales (Tenants)', en: 'Tenant & Restaurant Management' },
            desc: { es: 'Administra los restaurantes independientes en el sistema, visualiza sus códigos de acceso y crea nuevas sucursales.', en: 'Manage independent restaurants in the system, view their access codes, and register new tenant databases.' },
            registerBtn: { es: '+ Registrar Sucursal', en: '+ Register Tenant' },
            tableName: { es: 'Nombre del Restaurante', en: 'Restaurant Name' },
            tableSubdomain: { es: 'Código / Subdominio', en: 'Subdomain / Code' },
            tableCreated: { es: 'Fecha de Creación', en: 'Date Registered' },
            empty: { es: 'No se encontraron sucursales registradas.', en: 'No registered tenants found.' },
            newAccountTitle: { es: 'Registrar Nueva Sucursal', en: 'Register New Tenant' },
            newAccountDesc: { es: 'El sistema creará la base de datos de la sucursal y la cuenta principal de Propietario.', en: 'The system will create the tenant workspace and their master Owner account.' },
            restName: { es: 'Nombre del Restaurante', en: 'Restaurant Name' },
            restSubdomain: { es: 'Código / Subdominio (minúsculas, sin espacios)', en: 'Subdomain / Code (lowercase, no spaces)' },
            ownerSection: { es: 'Datos del Propietario (Owner)', en: 'Owner Account Details' },
            ownerNombre: { es: 'Primer Nombre', en: 'First Name' },
            ownerApellido: { es: 'Apellido', en: 'Last Name' },
            ownerUsername: { es: 'Nombre de Usuario', en: 'Username' },
            ownerEmail: { es: 'Correo Electrónico (Opcional)', en: 'Email Address (Optional)' },
            ownerPassword: { es: 'Contraseña de Acceso', en: 'Password' },
            ownerPin: { es: 'PIN de POS (4 dígitos)', en: 'POS PIN (4 digits)' },
            cancel: { es: 'Cancelar', en: 'Cancel' },
            save: { es: 'Registrar e Inicializar', en: 'Register & Initialize' },
            saving: { es: 'Inicializando sucursal...', en: 'Initializing tenant...' },
            successTitle: { es: '¡Sucursal Registrada Exitosamente!', en: 'Tenant Registered Successfully!' },
            successDesc: { es: 'La base de datos y la cuenta de administrador han sido inicializadas.', en: 'The restaurant data environment and owner credentials have been fully initialized.' },
            accessInfo: { es: 'Detalles de Acceso', en: 'Access Information' },
            subdomainLabel: { es: 'Código de Restaurante (Subdominio):', en: 'Restaurant Code (Subdomain):' },
            usernameLabel: { es: 'Usuario Administrador:', en: 'Admin Username:' },
            passwordLabel: { es: 'Contraseña:', en: 'Password:' },
            pinLabel: { es: 'PIN de Acceso POS:', en: 'POS Access PIN:' },
            howToLogin: { es: 'Instrucciones para iniciar sesión', en: 'How to Log In' },
            step1: { es: '1. Dirígete a la pantalla de Login del panel de control.', en: '1. Navigate to the Admin Dashboard Login page.' },
            step2: { es: '2. En el campo "Código de Restaurante (Subdomain)" ingresa:', en: '2. In the "Restaurant Code (Subdomain)" field, enter:' },
            step3: { es: '3. Introduce el usuario y contraseña creados arriba.', en: '3. Enter the admin username and password created above.' },
            step4: { es: '4. Para la aplicación del Punto de Venta (POS), usa el PIN:', en: '4. For the Point of Sale (POS) application, use the PIN:' },
            gotIt: { es: 'Entendido', en: 'Got it' }
        };
        return dict[key]?.[lang] || dict[key]?.['es'] || key;
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header section with styling - Minimalist style */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">{t('title')}</h2>
                    <p className="mt-1.5 text-slate-500 dark:text-slate-400 max-w-2xl text-sm leading-relaxed">{t('desc')}</p>
                </div>
                <div>
                    <button
                        onClick={() => {
                            setCreatedInfo(null);
                            setShowCreateModal(true);
                        }}
                        className="inline-flex items-center justify-center rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white px-5 py-2.5 text-sm font-bold shadow-sm hover:shadow active:scale-98 transition-all outline-none cursor-pointer"
                    >
                        {t('registerBtn')}
                    </button>
                </div>
            </div>

            {/* Success Card */}
            {createdInfo && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-8 shadow-xl max-w-2xl mx-auto space-y-6 animate-slideUp">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-2xl">
                            ✅
                        </div>
                        <div>
                            <h3 className="font-extrabold text-emerald-800 dark:text-emerald-300 text-xl">{t('successTitle')}</h3>
                            <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mt-1">{t('successDesc')}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-950/40 shadow-sm space-y-3 font-medium">
                        <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-2">{t('accessInfo')}</h4>
                        <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500 text-sm">{t('subdomainLabel')}</span>
                            <span className="font-mono text-primary-600 dark:text-primary-400 font-bold">{createdInfo.subdomain}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500 text-sm">{t('usernameLabel')}</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{createdInfo.username}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500 text-sm">{t('passwordLabel')}</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{createdInfo.password}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                            <span className="text-slate-500 text-sm">{t('pinLabel')}</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{createdInfo.pin}</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900/60 rounded-2xl p-6 space-y-3">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">💡 {t('howToLogin')}</h4>
                        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                            <li>{t('step1')}</li>
                            <li>
                                {t('step2')} <strong className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-primary-600 dark:text-primary-400">{createdInfo.subdomain}</strong>
                            </li>
                            <li>{t('step3')}</li>
                            <li>
                                {t('step4')} <strong className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-350">{createdInfo.pin}</strong>
                            </li>
                        </ul>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={() => setCreatedInfo(null)}
                            className="bg-emerald-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-emerald-700 transition"
                        >
                            {t('gotIt')}
                        </button>
                    </div>
                </div>
            )}

            {/* List Table of Tenants */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="text-left px-8 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">{t('tableName')}</th>
                                <th className="text-left px-8 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">{t('tableSubdomain')}</th>
                                <th className="text-left px-8 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">{t('tableCreated')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-16">
                                        <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                                    </td>
                                </tr>
                            ) : tenants.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-16 text-slate-400 text-sm font-semibold">
                                        {t('empty')}
                                    </td>
                                </tr>
                            ) : (
                                tenants.map((tenant) => (
                                    <tr key={tenant.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <p className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{tenant.name}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">ID: {tenant.id}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="font-mono text-sm px-2.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-bold border border-primary-100/30">
                                                {tenant.subdomain}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400 font-semibold">
                                            {new Date(tenant.created_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Dialog for creation */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 max-h-[90vh] overflow-y-auto animate-scaleUp">
                        
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{t('newAccountTitle')}</h3>
                                <p className="text-xs text-slate-500 mt-1">{t('newAccountDesc')}</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-slate-400 hover:text-slate-650 bg-slate-100 dark:bg-slate-800 p-2 rounded-full transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {formError && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-2xl p-4 mb-6 text-sm font-semibold">
                                ⚠️ {formError}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-6">
                            {/* Restaurant info */}
                            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900/60 rounded-2xl p-6 space-y-4">
                                <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-2">🏢 {lang === 'es' ? 'Datos de la Sucursal' : 'Restaurant Details'}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('restName')}</label>
                                        <input
                                            required
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="e.g. Bella Pasta"
                                            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-slate-950 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('restSubdomain')}</label>
                                        <input
                                            required
                                            value={subdomain}
                                            onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                            placeholder="e.g. bellapasta"
                                            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-slate-950 dark:text-white font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Owner user info */}
                            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900/60 rounded-2xl p-6 space-y-4">
                                <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-2">👤 {t('ownerSection')}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('ownerNombre')}</label>
                                        <input
                                            required
                                            value={adminNombre}
                                            onChange={e => setAdminNombre(e.target.value)}
                                            placeholder="e.g. John"
                                            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-slate-950 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('ownerApellido')}</label>
                                        <input
                                            required
                                            value={adminApellido}
                                            onChange={e => setAdminApellido(e.target.value)}
                                            placeholder="e.g. Doe"
                                            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-slate-950 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('ownerUsername')}</label>
                                        <input
                                            required
                                            value={adminUsername}
                                            onChange={e => setAdminUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                                            placeholder="e.g. jdoe_admin"
                                            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-slate-950 dark:text-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('ownerEmail')}</label>
                                        <input
                                            type="email"
                                            value={adminEmail}
                                            onChange={e => setAdminEmail(e.target.value)}
                                            placeholder="e.g. owner@bellapasta.com"
                                            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-slate-950 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('ownerPassword')}</label>
                                        <input
                                            required
                                            type="password"
                                            value={adminPassword}
                                            onChange={e => setAdminPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-slate-950 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{t('ownerPin')}</label>
                                        <input
                                            required
                                            value={adminPin}
                                            onChange={e => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            placeholder="e.g. 1234"
                                            maxLength={4}
                                            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-slate-950 dark:text-white font-mono font-bold tracking-widest"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
                                >
                                    {saving ? t('saving') : t('save')}
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}
        </div>
    );
}
