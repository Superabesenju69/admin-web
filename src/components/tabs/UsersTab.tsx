import React, { useState, useEffect } from 'react';
import { t, formatRole } from '../../utils/i18n';

type Role = 'system_admin' | 'super_admin' | 'owner' | 'admin' | 'cajero' | 'mesero' | 'cocinero' | 'estacion';

interface UsersTabProps {
    supabase: any;
    lang: string;
    currentUser: { id: string; role: string } | null;
}

export default function UsersTab({ supabase, lang, currentUser }: UsersTabProps) {
    const [staffList, setStaffList] = useState<any[]>([]);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [newUserUsername, setNewUserUsername] = useState('');
        const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserNombre, setNewUserNombre] = useState('');
    const [newUserApellido, setNewUserApellido] = useState('');
    const [newUserTelefono, setNewUserTelefono] = useState('');
    const [newUserRole, setNewUserRole] = useState<Role>('admin');
    const [newUserPin, setNewUserPin] = useState('');
    const [newUserContractType, setNewUserContractType] = useState<'laboral' | 'profesional'>('laboral');
    const [newUserHourlyRate, setNewUserHourlyRate] = useState<number>(0);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [userFormError, setUserFormError] = useState('');
    const [userSaving, setUserSaving] = useState(false);

    // Editing state variables
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editNombre, setEditNombre] = useState('');
    const [editApellido, setEditApellido] = useState('');
    const [editRole, setEditRole] = useState<Role>('admin');
    const [editPin, setEditPin] = useState('');
    const [editTelefono, setEditTelefono] = useState('');
    const [editContractType, setEditContractType] = useState<'laboral' | 'profesional'>('laboral');
    const [editHourlyRate, setEditHourlyRate] = useState<number>(0);
    const [editEmail, setEditEmail] = useState('');

    useEffect(() => {
        loadStaff();
    }, []);

    async function loadStaff() {
        const { data } = await supabase.from('usuarios').select('*').order('created_at');
        setStaffList(data || []);
    }

    async function createUser() {
        setUserSaving(true); setUserFormError('');
        if (!newUserUsername || !newUserPassword || !newUserNombre || !newUserApellido) {
            setUserFormError(lang === 'es' ? 'El nombre de usuario, contraseña, nombre y apellido son obligatorios.' : 'Username, password, first name and last name are required.');
            setUserSaving(false); return;
        }
        const { error } = await supabase.from('usuarios').insert([{
            username: newUserUsername.trim().toLowerCase(),
            password: newUserPassword,
            nombre: newUserNombre,
            apellido: newUserApellido,
            telefono: newUserTelefono || null,
            pin: newUserPin || null,
            role: newUserRole,
            contract_type: newUserContractType,
            hourly_rate: newUserHourlyRate || 0,
            email: newUserEmail.trim().toLowerCase() || null,
            active: true,
        }]);
        if (error) { setUserFormError(error.message); setUserSaving(false); return; }
        await loadStaff();
        setShowCreateUser(false);
        setNewUserUsername(''); setNewUserPassword(''); setNewUserNombre(''); setNewUserApellido('');
        setNewUserTelefono(''); setNewUserPin(''); setNewUserRole('admin');
        setNewUserContractType('laboral');
        setNewUserHourlyRate(0);
        setNewUserEmail('');
        setUserSaving(false);
    }

    function startEdit(u: any) {
        setEditingUserId(u.id);
        setEditNombre(u.nombre);
        setEditApellido(u.apellido);
        setEditRole(u.role);
        setEditPin(u.pin || '');
        setEditTelefono(u.telefono || '');
        setEditContractType(u.contract_type || 'laboral');
        setEditHourlyRate(u.hourly_rate || 0);
        setEditEmail(u.email || '');
    }

    async function saveEdit() {
        setUserSaving(true);
        try {
            const { error } = await supabase.from('usuarios').update({
                nombre: editNombre,
                apellido: editApellido,
                role: editRole,
                pin: editPin || null,
                telefono: editTelefono || null,
                contract_type: editContractType,
                hourly_rate: editHourlyRate,
                email: editEmail.trim().toLowerCase() || null,
            }).eq('id', editingUserId);

            if (error) throw error;
            setEditingUserId(null);
            await loadStaff();
        } catch (e: any) {
            alert(e.message || (lang === 'es' ? 'Error al actualizar detalles del empleado.' : 'Failed to update employee details.'));
        } finally {
            setUserSaving(false);
        }
    }

    async function toggleUserActive(id: string, active: boolean) {
        await supabase.from('usuarios').update({ active }).eq('id', id);
        setStaffList(prev => prev.map(u => u.id === id ? { ...u, active } : u));
    }

    async function deleteUser(id: string) {
        if (!confirm(lang === 'es' ? '¿Eliminar este usuario permanentemente?' : 'Delete this user permanently?')) return;
        await supabase.from('usuarios').delete().eq('id', id);
        setStaffList(prev => prev.filter(u => u.id !== id));
    }

    const visibleStaffList = staffList.filter(
        u => currentUser?.role === 'system_admin' || u.role !== 'system_admin'
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('staff.title', lang)}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{lang === 'es' ? 'Administra el acceso al panel y la aplicación POS.' : 'Manage who can access the dashboard and POS app.'}</p>
                </div>
                <button onClick={() => setShowCreateUser(true)} className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-700 transition shadow-sm">
                    {t('staff.add_user', lang)}
                </button>
            </div>

            {showCreateUser && (
                <div className="bg-white dark:bg-slate-900 border border-primary-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <h3 className="font-black text-gray-900 dark:text-gray-100 text-lg mb-4">{t('staff.new_account', lang)}</h3>
                    {userFormError && <p className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{userFormError}</p>}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{t('staff.username', lang)}</label>
                            <input value={newUserUsername} onChange={e => setNewUserUsername(e.target.value)} placeholder="jsmith" className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{t('staff.password', lang)}</label>
                            <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder={t('staff.password_placeholder', lang)} className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{t('staff.first_name', lang)}</label>
                            <input value={newUserNombre} onChange={e => setNewUserNombre(e.target.value)} placeholder="Jane" className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{t('staff.last_name', lang)}</label>
                            <input value={newUserApellido} onChange={e => setNewUserApellido(e.target.value)} placeholder="Smith" className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{t('staff.phone', lang)}</label>
                            <input value={newUserTelefono} onChange={e => setNewUserTelefono(e.target.value)} placeholder="+1 555 000 0000" className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{t('staff.role', lang)}</label>
                            <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as Role)} className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-900">
                                <option value="super_admin">Super Admin</option>
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                                <option value="cajero">{lang === 'es' ? 'Cajero' : 'Cashier'}</option>
                                <option value="mesero">{lang === 'es' ? 'Mesero' : 'Waiter / Server'}</option>
                                <option value="cocinero">{lang === 'es' ? 'Cocinero' : 'Cook'}</option>
                                <option value="estacion">{lang === 'es' ? 'Estación KDS' : 'KDS Station'}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                {lang === 'es' ? 'Tipo de Contrato' : 'Contract Type'}
                            </label>
                            <select
                                value={newUserContractType}
                                onChange={e => setNewUserContractType(e.target.value as 'laboral' | 'profesional')}
                                className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-900 dark:text-white"
                            >
                                <option value="laboral">{lang === 'es' ? 'Laboral (Con INSS)' : 'Laboral (INSS)'}</option>
                                <option value="profesional">{lang === 'es' ? 'Servicios Profesionales (Sin INSS)' : 'Professional Services (No INSS)'}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{t('staff.pin', lang)}</label>
                            <input value={newUserPin} onChange={e => setNewUserPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="e.g. 1234" maxLength={4} className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 tracking-widest font-mono" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                {lang === 'es' ? 'Pago por Hora (C$)' : 'Hourly Rate (C$)'}
                            </label>
                            <input
                                type="number"
                                value={newUserHourlyRate}
                                onChange={e => setNewUserHourlyRate(Number(e.target.value))}
                                placeholder="e.g. 60"
                                className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-slate-950 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                {lang === 'es' ? 'Correo Electrónico' : 'Email Address'}
                            </label>
                            <input
                                type="email"
                                value={newUserEmail}
                                onChange={e => setNewUserEmail(e.target.value)}
                                placeholder="e.g. empleado@restaurante.com"
                                className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-slate-950 dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-5">
                        <button onClick={createUser} disabled={userSaving} className="bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-700 transition disabled:opacity-50">
                            {userSaving ? t('staff.creating', lang) : t('staff.create', lang)}
                        </button>
                        <button onClick={() => { setShowCreateUser(false); setUserFormError(''); }} className="border border-gray-200 dark:border-slate-800 text-gray-700 px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">{t('btn.cancel', lang)}</button>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-800">
                        <tr>
                            <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('staff.table.name', lang)}</th>
                            <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('staff.table.role', lang)}</th>
                            <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('staff.table.pin', lang)}</th>
                            <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                {lang === 'es' ? 'Pago por Hora (C$)' : 'Hourly Rate (C$)'}
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('staff.table.status', lang)}</th>
                            <th className="px-6 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {visibleStaffList.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">{t('staff.table.empty', lang)}</td></tr>
                        ) : visibleStaffList.map(u => (
                            u.id === editingUserId ? (
                                <tr key={u.id} className="bg-primary-50/30 dark:bg-primary-950/20">
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2 mb-1.5">
                                            <input
                                                value={editNombre}
                                                onChange={e => setEditNombre(e.target.value)}
                                                className="w-1/2 border border-gray-200 dark:border-slate-800 rounded-lg px-2 py-1 text-sm dark:bg-slate-950 dark:text-white font-medium"
                                                placeholder="Nombre"
                                            />
                                            <input
                                                value={editApellido}
                                                onChange={e => setEditApellido(e.target.value)}
                                                className="w-1/2 border border-gray-200 dark:border-slate-800 rounded-lg px-2 py-1 text-sm dark:bg-slate-950 dark:text-white font-medium"
                                                placeholder="Apellido"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-xs text-gray-450 font-mono">@{u.username}</span>
                                            <input
                                                type="email"
                                                value={editEmail}
                                                onChange={e => setEditEmail(e.target.value)}
                                                className="w-full border border-gray-200 dark:border-slate-800 rounded-lg px-2 py-0.5 text-xs dark:bg-slate-950 dark:text-white"
                                                placeholder="Email"
                                            />
                                            <input
                                                value={editTelefono}
                                                onChange={e => setEditTelefono(e.target.value)}
                                                className="w-full border border-gray-200 dark:border-slate-800 rounded-lg px-2 py-0.5 text-xs dark:bg-slate-950 dark:text-white"
                                                placeholder={lang === 'es' ? 'Teléfono' : 'Phone'}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={editRole}
                                            onChange={e => setEditRole(e.target.value as Role)}
                                            className="w-full border border-gray-200 dark:border-slate-800 rounded-lg px-2 py-1 text-sm bg-white dark:bg-slate-950 dark:text-white font-medium mb-1.5"
                                        >
                                            <option value="super_admin">Super Admin</option>
                                            <option value="owner">Owner</option>
                                            <option value="admin">Admin</option>
                                            <option value="cajero">{lang === 'es' ? 'Cajero' : 'Cashier'}</option>
                                            <option value="mesero">{lang === 'es' ? 'Mesero' : 'Waiter / Server'}</option>
                                            <option value="cocinero">{lang === 'es' ? 'Cocinero' : 'Cook'}</option>
                                            <option value="estacion">{lang === 'es' ? 'Estación KDS' : 'KDS Station'}</option>
                                        </select>
                                        <select
                                            value={editContractType}
                                            onChange={e => setEditContractType(e.target.value as 'laboral' | 'profesional')}
                                            className="w-full border border-gray-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-955 dark:text-white"
                                        >
                                            <option value="laboral">{lang === 'es' ? 'Laboral (INSS)' : 'Labor Contract'}</option>
                                            <option value="profesional">{lang === 'es' ? 'Serv. Profesionales' : 'Prof. Services'}</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            value={editPin}
                                            onChange={e => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            placeholder="PIN"
                                            maxLength={4}
                                            className="w-16 border border-gray-200 dark:border-slate-800 rounded-lg px-2 py-1 text-sm text-center font-mono dark:bg-slate-950 dark:text-white font-bold"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-gray-500 font-bold">C$</span>
                                            <input
                                                type="number"
                                                value={editHourlyRate}
                                                onChange={e => setEditHourlyRate(Number(e.target.value))}
                                                className="w-20 border border-gray-200 dark:border-slate-800 rounded-lg px-2 py-1 text-sm text-right dark:bg-slate-950 dark:text-white font-medium"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleUserActive(u.id, !u.active)} className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors duration-200 ${u.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${u.active ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right space-y-1">
                                        <button onClick={saveEdit} disabled={userSaving} className="w-full text-white bg-primary-600 hover:bg-primary-700 font-bold text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50 block text-center">
                                            {userSaving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : t('btn.save', lang)}
                                        </button>
                                        <button onClick={() => setEditingUserId(null)} className="w-full text-gray-700 dark:text-gray-350 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 font-bold text-xs px-3 py-1.5 rounded-lg transition block text-center">
                                            {t('btn.cancel', lang)}
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{u.nombre} {u.apellido}</p>
                                        <p className="text-xs text-gray-500">@{u.username}</p>
                                        {u.email && <p className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold mt-0.5">{u.email}</p>}
                                        {u.telefono && <p className="text-[10px] text-gray-400 mt-0.5">{u.telefono}</p>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                            u.role === 'system_admin' ? 'bg-red-500/10 text-red-600' :
                                            u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                                            u.role === 'owner' ? 'bg-amber-100 text-amber-800' :
                                            u.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                            u.role === 'cajero' ? 'bg-teal-100 text-teal-800' :
                                            u.role === 'mesero' ? 'bg-rose-100 text-rose-800' :
                                            u.role === 'cocinero' ? 'bg-indigo-100 text-indigo-800' :
                                            'bg-slate-100 text-slate-800'
                                        }`}>
                                            {formatRole(u.role, lang)}
                                        </span>
                                        <span className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">
                                            {u.contract_type === 'profesional' ? (lang === 'es' ? 'Serv. Profesionales' : 'Prof. Services') : (lang === 'es' ? 'Contrato Laboral' : 'Labor Contract')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400 font-bold">{u.pin || '----'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">C$ {u.hourly_rate || 0}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleUserActive(u.id, !u.active)} className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors duration-200 ${u.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${u.active ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                        <button onClick={() => startEdit(u)} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-bold text-xs bg-primary-50 dark:bg-primary-950/40 px-3 py-1.5 rounded-lg transition">
                                            {t('btn.edit', lang)}
                                        </button>
                                        <button onClick={() => deleteUser(u.id)} className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg transition">{t('btn.delete', lang)}</button>
                                    </td>
                                </tr>
                            )
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
