'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Building2, ArrowRight, LogOut, Loader2, Calendar, ShieldCheck, ShieldAlert, Plus, Check, Copy, User, Lock, Key, CheckCircle2 } from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    created_at: string;
    active?: boolean;
}

interface TenantSelectorProps {
    onSelectTenant: (tenant: Tenant) => void;
    onSignOut: () => void;
    lang: string;
}

export default function TenantSelector({ onSelectTenant, onSignOut, lang }: TenantSelectorProps) {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Registration Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
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
    const [createdInfo, setCreatedInfo] = useState<any | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    useEffect(() => {
        loadTenants();
    }, []);

    async function loadTenants() {
        setLoading(true);
        setError('');
        try {
            const storedUser = localStorage.getItem('pos_user');
            const storedTenantId = localStorage.getItem('pos_login_tenant_id') || localStorage.getItem('pos_tenant_id');
            if (!storedUser || !storedTenantId) {
                throw new Error(lang === 'es' ? 'Falta autenticación. Inicie sesión de nuevo.' : 'Authentication missing. Please sign in again.');
            }
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
            setError(e.message || (lang === 'es' ? 'Error al cargar las sucursales' : 'Failed to load restaurants'));
        } finally {
            setLoading(false);
        }
    }

    async function toggleSubscription(tenant: Tenant) {
        setTogglingId(tenant.id);
        const newActiveState = !(tenant.active !== false);
        try {
            const storedUser = localStorage.getItem('pos_user');
            const storedTenantId = localStorage.getItem('pos_login_tenant_id') || localStorage.getItem('pos_tenant_id');
            if (!storedUser || !storedTenantId) throw new Error("Authentication missing");
            const u = JSON.parse(storedUser);

            const res = await fetch('/api/tenants', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': u.id,
                    'x-tenant-id': storedTenantId
                },
                body: JSON.stringify({
                    id: tenant.id,
                    active: newActiveState
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, active: newActiveState } : t));
        } catch (e: any) {
            console.error("Failed to toggle subscription:", e);
            alert(lang === 'es' ? `Error al cambiar estado: ${e.message}` : `Failed to update status: ${e.message}`);
        } finally {
            setTogglingId(null);
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

            setCreatedInfo({
                name,
                subdomain,
                username: adminUsername.toLowerCase(),
                password: adminPassword,
                pin: adminPin
            });

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

    function copyToClipboard(text: string, field: string) {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    }

    const filteredTenants = tenants.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = {
        total: tenants.length,
        active: tenants.filter(t => t.active !== false).length,
        suspended: tenants.filter(t => t.active === false).length
    };

    const t = (key: string) => {
        const dict: Record<string, Record<string, string>> = {
            title: { es: 'Selector de Sucursales', en: 'Branch Directory' },
            subtitle: { es: 'Administra y accede a los entornos de tus sucursales.', en: 'Manage and access your branch restaurant environments.' },
            searchPlaceholder: { es: 'Buscar sucursal...', en: 'Search branch...' },
            empty: { es: 'No se encontraron sucursales.', en: 'No branches found.' },
            signOut: { es: 'Cerrar Sesión', en: 'Sign Out' },
            loadingText: { es: 'Cargando...', en: 'Loading...' },
            retry: { es: 'Reintentar', en: 'Retry' },
            registerBtn: { es: 'Registrar Sucursal', en: 'Register Branch' },
            totalBranches: { es: 'Total sucursales', en: 'Total branches' },
            activeBranches: { es: 'Activas', en: 'Active' },
            suspendedBranches: { es: 'Suspendidas', en: 'Suspended' },
            active: { es: 'Activa', en: 'Active' },
            suspended: { es: 'Suspendida', en: 'Suspended' },
            subscription: { es: 'Suscripción', en: 'Subscription' },
            newBranchTitle: { es: 'Registrar Nueva Sucursal', en: 'Register New Branch' },
            newBranchDesc: { es: 'El sistema inicializará una base de datos única y generará el usuario Propietario.', en: 'The system will initialize a unique database and generate the Owner user.' },
            restName: { es: 'Nombre del Restaurante', en: 'Restaurant Name' },
            restSubdomain: { es: 'Subdominio / Código de Acceso', en: 'Subdomain / Access Code' },
            ownerSection: { es: 'Credenciales del Administrador Propietario', en: 'Owner Admin Credentials' },
            ownerNombre: { es: 'Primer Nombre', en: 'First Name' },
            ownerApellido: { es: 'Apellido', en: 'Last Name' },
            ownerUsername: { es: 'Nombre de Usuario', en: 'Username' },
            ownerEmail: { es: 'Correo Electrónico (Opcional)', en: 'Email (Optional)' },
            ownerPassword: { es: 'Contraseña de Acceso', en: 'Password' },
            ownerPin: { es: 'PIN del POS (4 dígitos)', en: 'POS PIN (4 digits)' },
            cancel: { es: 'Cancelar', en: 'Cancel' },
            save: { es: 'Crear Sucursal', en: 'Create Branch' },
            saving: { es: 'Creando...', en: 'Creating...' },
            successTitle: { es: 'Sucursal Registrada', en: 'Branch Registered' },
            successDesc: { es: 'Copie las credenciales del propietario para el primer ingreso.', en: 'Copy the owner credentials for initial login config.' },
            accessInfo: { es: 'Detalles de Acceso', en: 'Access Details' },
            subdomainLabel: { es: 'Código de Restaurante:', en: 'Restaurant Code:' },
            usernameLabel: { es: 'Usuario Administrador:', en: 'Admin Username:' },
            passwordLabel: { es: 'Contraseña:', en: 'Password:' },
            pinLabel: { es: 'PIN POS:', en: 'POS PIN:' },
            howToLogin: { es: 'Instrucciones para iniciar sesión:', en: 'How to Log In:' },
            step1: { es: '1. Ingrese a la web con el código de sucursal y credenciales creadas.', en: '1. Log into the web admin portal using the branch code and admin username.' },
            step2: { es: '2. Para registrar sucursales en tablets POS, use el PIN de acceso.', en: '2. For tablet POS app activation, use the 4-digit PIN code.' },
            gotIt: { es: 'Entendido', en: 'Got it' }
        };
        return dict[key]?.[lang] || dict[key]?.['es'] || key;
    };

    return (
        <div className="min-h-screen w-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased flex flex-col justify-start relative overflow-x-hidden">
            
            {/* Apple Minimal Top Header */}
            <header className="w-full bg-[#f5f5f7]/80 backdrop-blur-md border-b border-[#d2d2d7]/50 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm tracking-tight text-[#1d1d1f]">Restaurant OS</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] px-1.5 py-0.5 bg-[#e8e8ed] rounded-md">Admin</span>
                    </div>
                    <div>
                        <button
                            onClick={onSignOut}
                            className="text-xs font-semibold text-[#86868b] hover:text-[#1d1d1f] flex items-center gap-1 transition cursor-pointer"
                        >
                            <span>{t('signOut')}</span>
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-4xl w-full mx-auto px-6 py-12 md:py-16 flex-1 flex flex-col">
                
                {/* Clean Hero Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-12 text-left"
                >
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#1d1d1f] mb-3">
                        {t('title')}
                    </h1>
                    <p className="text-[#86868b] text-base md:text-lg font-normal max-w-xl leading-relaxed">
                        {t('subtitle')}
                    </p>
                </motion.div>

                {/* Minimal Stats Row */}
                {!loading && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="grid grid-cols-3 gap-6 py-6 border-y border-[#d2d2d7]/50 mb-10 text-left"
                    >
                        <div>
                            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">{t('totalBranches')}</span>
                            <span className="block text-3xl font-bold text-[#1d1d1f] mt-1">{stats.total}</span>
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">{t('activeBranches')}</span>
                            <span className="block text-3xl font-bold text-[#1d1d1f] mt-1">{stats.active}</span>
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">{t('suspendedBranches')}</span>
                            <span className="block text-3xl font-bold text-[#1d1d1f] mt-1">{stats.suspended}</span>
                        </div>
                    </motion.div>
                )}

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-80">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#86868b]">
                            <Search className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            className="w-full bg-[#e8e8ed]/60 border-0 rounded-full pl-10 pr-4 py-2.5 text-sm font-normal text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/45 transition-all"
                        />
                    </div>

                    {/* Register Button */}
                    <button 
                        onClick={() => {
                            setCreatedInfo(null);
                            setShowCreateModal(true);
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#1d1d1f] hover:bg-[#333336] active:bg-black text-white font-semibold text-sm transition cursor-pointer active:scale-98"
                    >
                        <Plus className="w-4 h-4" />
                        {t('registerBtn')}
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 text-sm flex items-center justify-between font-semibold">
                        <span>⚠️ {error}</span>
                        <button onClick={loadTenants} className="bg-red-650 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-bold transition">
                            {t('retry')}
                        </button>
                    </div>
                )}

                {/* Success Registration Info Box */}
                {createdInfo && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white border border-[#d2d2d7]/50 rounded-2xl p-6 mb-8 shadow-sm flex flex-col gap-6 text-left"
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-[#34c759]" />
                            <div>
                                <h3 className="font-bold text-[#1d1d1f] text-lg leading-tight">{t('successTitle')}</h3>
                                <p className="text-xs text-[#86868b] mt-0.5">{t('successDesc')}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { label: t('subdomainLabel'), value: createdInfo.subdomain, field: 'subdomain' },
                                { label: t('usernameLabel'), value: createdInfo.username, field: 'username' },
                                { label: t('passwordLabel'), value: createdInfo.password, field: 'password' },
                                { label: t('pinLabel'), value: createdInfo.pin, field: 'pin' },
                            ].map((item) => (
                                <div key={item.field} className="bg-[#f5f5f7] p-4 rounded-xl flex items-center justify-between border border-[#e8e8ed]">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider">{item.label}</p>
                                        <p className="font-mono text-[#1d1d1f] font-bold text-sm mt-1">{item.value}</p>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(item.value, item.field)}
                                        className="p-2 rounded-lg bg-white border border-[#d2d2d7]/60 hover:bg-[#f5f5f7] text-[#86868b] hover:text-[#1d1d1f] transition cursor-pointer"
                                    >
                                        {copiedField === item.field ? <Check className="w-3.5 h-3.5 text-[#34c759]" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-[#e8e8ed] pt-4">
                            <p className="text-xs font-bold text-[#1d1d1f] mb-1.5">💡 {t('howToLogin')}</p>
                            <ul className="text-xs text-[#86868b] space-y-1 font-medium leading-relaxed list-disc list-inside">
                                <li>{t('step1')}</li>
                                <li>{t('step2')}</li>
                            </ul>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => setCreatedInfo(null)}
                                className="px-5 py-2 rounded-full bg-[#1d1d1f] hover:bg-[#333336] text-white font-semibold text-xs transition cursor-pointer"
                            >
                                {t('gotIt')}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Directory Content Area */}
                <div className="flex-1 flex flex-col justify-center">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#86868b]">
                            <Loader2 className="w-6 h-6 animate-spin text-[#1d1d1f]" />
                            <span className="text-xs font-semibold">{t('loadingText')}</span>
                        </div>
                    ) : filteredTenants.length === 0 ? (
                        <div className="text-center py-20 text-[#86868b] font-medium">
                            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30 text-[#1d1d1f]" />
                            <p>{t('empty')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                            <AnimatePresence mode="popLayout">
                                {filteredTenants.map((tenant, idx) => {
                                    const isActive = tenant.active !== false;
                                    const isToggling = togglingId === tenant.id;

                                    return (
                                        <motion.div
                                            key={tenant.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            transition={{ duration: 0.4, delay: idx * 0.02 }}
                                            className="bg-white border border-[#d2d2d7]/50 hover:border-[#86868b]/50 rounded-2xl p-6 flex flex-col justify-between transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
                                        >
                                            {/* Top info */}
                                            <div>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h3 className="font-bold text-[#1d1d1f] text-lg tracking-tight">
                                                            {tenant.name}
                                                        </h3>
                                                        <span className="font-mono text-[10px] font-bold text-[#86868b] bg-[#e8e8ed]/60 px-2 py-0.5 rounded mt-1.5 inline-block">
                                                            {tenant.subdomain}
                                                        </span>
                                                    </div>

                                                    {/* Status Pill */}
                                                    <div>
                                                        {isActive ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#34c759]">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
                                                                {t('active')}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff3b30]">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30]" />
                                                                {t('suspended')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bottom toggles & action */}
                                            <div className="flex items-center justify-between pt-4 border-t border-[#f5f5f7] mt-4">
                                                {/* Subscription Toggle */}
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#86868b]">
                                                        {t('subscription')}
                                                    </span>
                                                    <button
                                                        onClick={() => toggleSubscription(tenant)}
                                                        disabled={isToggling}
                                                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                                                            isActive ? 'bg-[#34c759]' : 'bg-[#d2d2d7]'
                                                        } ${isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                                                    >
                                                        {isToggling ? (
                                                            <Loader2 className={`w-3 h-3 animate-spin text-white absolute ${isActive ? 'right-1' : 'left-1'}`} />
                                                        ) : (
                                                            <span
                                                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                                    isActive ? 'translate-x-4.5' : 'translate-x-1'
                                                                }`}
                                                            />
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Enter Dashboard Link */}
                                                {isActive && (
                                                    <button 
                                                        onClick={() => onSelectTenant(tenant)}
                                                        className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#0071e3] hover:underline"
                                                    >
                                                        <span>{lang === 'es' ? 'Gestionar' : 'Manage'}</span>
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal Dialog */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1d1f]/30 backdrop-blur-sm animate-fadeIn">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full max-w-lg bg-white border border-[#d2d2d7]/50 rounded-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto shadow-2xl text-left"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-[#1d1d1f] tracking-tight">{t('newBranchTitle')}</h3>
                                <p className="text-xs text-[#86868b] mt-0.5">{t('newBranchDesc')}</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-[#86868b] hover:text-[#1d1d1f] bg-[#e8e8ed] w-6 h-6 rounded-full flex items-center justify-center transition-colors text-xs"
                            >
                                ✕
                            </button>
                        </div>

                        {formError && (
                            <div className="bg-red-50 border border-red-155 text-red-750 rounded-xl p-4 mb-6 text-xs font-semibold">
                                ⚠️ {formError}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-6">
                            {/* Branch details */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] border-b border-[#f5f5f7] pb-1.5">
                                    🏢 {lang === 'es' ? 'Datos de la Sucursal' : 'Restaurant Details'}
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-bold text-[#86868b] mb-1 uppercase tracking-wider">{t('restName')}</label>
                                        <input
                                            required
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="e.g. Bella Pasta"
                                            className="w-full bg-[#f5f5f7] border-0 rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3]/45"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-[#86868b] mb-1 uppercase tracking-wider">{t('restSubdomain')}</label>
                                        <input
                                            required
                                            value={subdomain}
                                            onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                            placeholder="e.g. bellapasta"
                                            className="w-full bg-[#f5f5f7] border-0 rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3]/45 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Owner credentials */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] border-b border-[#f5f5f7] pb-1.5">
                                    👤 {t('ownerSection')}
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-bold text-[#86868b] mb-1 uppercase tracking-wider">{t('ownerNombre')}</label>
                                        <input
                                            required
                                            value={adminNombre}
                                            onChange={e => setAdminNombre(e.target.value)}
                                            placeholder="John"
                                            className="w-full bg-[#f5f5f7] border-0 rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3]/45"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-[#86868b] mb-1 uppercase tracking-wider">{t('ownerApellido')}</label>
                                        <input
                                            required
                                            value={adminApellido}
                                            onChange={e => setAdminApellido(e.target.value)}
                                            placeholder="Doe"
                                            className="w-full bg-[#f5f5f7] border-0 rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3]/45"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-[#86868b] mb-1 uppercase tracking-wider">{t('ownerUsername')}</label>
                                        <input
                                            required
                                            value={adminUsername}
                                            onChange={e => setAdminUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                                            placeholder="jdoe_admin"
                                            className="w-full bg-[#f5f5f7] border-0 rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3]/45 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-[#86868b] mb-1 uppercase tracking-wider">{t('ownerEmail')}</label>
                                        <input
                                            type="email"
                                            value={adminEmail}
                                            onChange={e => setAdminEmail(e.target.value)}
                                            placeholder="owner@bellapasta.com"
                                            className="w-full bg-[#f5f5f7] border-0 rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3]/45"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-[#86868b] mb-1 uppercase tracking-wider">{t('ownerPassword')}</label>
                                        <input
                                            required
                                            type="password"
                                            value={adminPassword}
                                            onChange={e => setAdminPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-[#f5f5f7] border-0 rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3]/45"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-[#86868b] mb-1 uppercase tracking-wider">{t('ownerPin')}</label>
                                        <input
                                            required
                                            value={adminPin}
                                            onChange={e => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            placeholder="1234"
                                            maxLength={4}
                                            className="w-full bg-[#f5f5f7] border-0 rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3]/45 font-mono tracking-widest text-center"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-[#f5f5f7]">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="border border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] px-5 py-2 rounded-full font-semibold text-xs transition cursor-pointer"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-[#1d1d1f] hover:bg-[#333336] text-white px-5 py-2 rounded-full font-semibold text-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>{t('saving')}</span>
                                        </>
                                    ) : (
                                        <span>{t('save')}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
