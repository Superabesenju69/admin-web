'use client';

import { useEffect, useState, Fragment, useRef } from 'react';
import { createClient } from '../utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { t } from '../utils/i18n';
import SettingsTab from '../components/tabs/SettingsTab';
import UsersTab from '../components/tabs/UsersTab';
import ReportsTab from '../components/tabs/ReportsTab';
import PromotionsTab from '../components/tabs/PromotionsTab';
import KitchenTab from '../components/tabs/KitchenTab';
import TablesTab from '../components/tabs/TablesTab';
import InventoryTab from '../components/tabs/InventoryTab';
import CategoriesTab from '../components/tabs/CategoriesTab';
import AttendanceTab from '../components/tabs/AttendanceTab';
import PayrollTab from '../components/tabs/PayrollTab';
import CommandBar from '../components/CommandBar';

const supabase = createClient();

type Tab = 'menu' | 'inventory' | 'tables' | 'kitchen' | 'reports' | 'promotions' | 'settings' | 'users' | 'attendance' | 'payroll';
type Role = 'super_admin' | 'owner' | 'admin' | 'cajero' | 'mesero' | 'cocinero' | 'estacion';
type TableShape = 'rectangle' | 'circle' | 'wall';

// ─── Map bounds and sizing ───────────────────────────────────────────────────
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20;

// ─── helpers ─────────────────────────────────────────────────────────────────
function typeColor(type: string) {
    switch (type) {
        case 'ingredient': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'product': return 'bg-primary-50 text-primary-700 border-primary-200';
        case 'combo': return 'bg-purple-50 text-purple-700 border-purple-200';
        default: return 'bg-gray-50 text-gray-700 border-gray-200 dark:border-slate-800';
    }
}

function statusStyle(s: string) {
    switch (s) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'in_progress': return 'bg-primary-100 text-primary-800';
        case 'done': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-700';
    }
}

// ─── main component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const router = useRouter();
    const [tab, setTabState] = useState<Tab>('menu');
    const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

    // Listen for Cmd+K or Ctrl+K globally
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsCommandBarOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    async function handleExecuteCommand(action: string, data: any): Promise<boolean> {
        try {
            const tenantId = typeof window !== 'undefined' ? localStorage.getItem('pos_tenant_id') : null;
            
            if (action === 'ADD_INGREDIENT') {
                const { name, cost_per_unit, stock_level, unit_of_measure } = data;
                if (!name) return false;
                const { error } = await supabase.from('items').insert([{
                    name,
                    type: 'ingredient',
                    base_price: 0,
                    cost_per_unit: cost_per_unit || 0,
                    stock_level: stock_level || 0,
                    unit_of_measure: unit_of_measure || 'each',
                    track_inventory: true,
                    tenant_id: tenantId
                }]);
                if (error) throw error;
                await refreshInventory();
                return true;
            }
            
            if (action === 'ADD_STATION') {
                const { name, display_order } = data;
                if (!name) return false;
                const { error } = await supabase.from('kitchen_stations').insert([{
                    name,
                    display_order: display_order || 1,
                    tenant_id: tenantId
                }]);
                if (error) throw error;
                // Reload stations
                const { data: stData } = await supabase.from('kitchen_stations').select('*').order('display_order');
                if (stData) setStations(stData);
                return true;
            }
            
            if (action === 'ADD_PRINTER') {
                const { name, ip_address } = data;
                if (!name) return false;
                const { error } = await supabase.from('printers').insert([{
                    name,
                    ip_address: ip_address || '',
                    port: 9100,
                    tenant_id: tenantId
                }]);
                if (error) throw error;
                // Reload printers
                const { data: prData } = await supabase.from('printers').select('*').order('name');
                if (prData) setPrinters(prData);
                return true;
            }
            
            if (action === 'ADD_TABLE') {
                const { name, display_order } = data;
                if (!name) return false;
                
                const defaultZone = zones[0]?.name || 'Main Floor';
                const { error } = await supabase.from('tables').insert([{
                    name,
                    shape: 'rectangle',
                    x: 100,
                    y: 100,
                    width: 100,
                    height: 80,
                    zone: defaultZone,
                    capacity: 4,
                    tenant_id: tenantId
                }]);
                if (error) throw error;
                // Reload tables
                const { data: trData } = await supabase.from('tables').select('*').order('name');
                if (trData) setTables(trData);
                return true;
            }
            
            return false;
        } catch (err) {
            console.error('Error executing AI command:', err);
            return false;
        }
    }

    useEffect(() => {
        const savedTab = typeof window !== 'undefined' ? sessionStorage.getItem('adminDashboardTab') : null;
        if (savedTab) setTabState(savedTab as Tab);
    }, []);

    const setTab = (newTab: Tab) => {
        setTabState(newTab);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('adminDashboardTab', newTab);
        }
    };

    // ─── current user (localStorage session) ─────────────────────────────────
    const [currentUser, setCurrentUser] = useState<{ id: string; full_name: string; role: Role } | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('pos_user');
        if (!stored) { router.replace('/login'); return; }
        try {
            const u = JSON.parse(stored);
            setCurrentUser({ 
                id: u.id, 
                full_name: u.full_name || `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.username, 
                role: u.role as Role 
            });
        } catch {
            router.replace('/login');
        }
    }, []);

    function signOut() {
        localStorage.removeItem('pos_user');
        localStorage.removeItem('pos_tenant_id');
        localStorage.removeItem('pos_tenant_name');
        localStorage.removeItem('pos_tenant_subdomain');
        document.cookie = 'pos_tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        router.replace('/login');
    }

    // data
    const [items, setItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [stations, setStations] = useState<any[]>([]);
    const [printers, setPrinters] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>({ enable_table_service: false, currency: 'USD', language: 'es' });
    const [loading, setLoading] = useState(true);

    // menu tab

    const [zones, setZones] = useState<any[]>([]);
    // printers
    const [newPrinterName, setNewPrinterName] = useState('');
    const [newPrinterIp, setNewPrinterIp] = useState('');

    async function addPrinter() {
        if (!newPrinterName.trim() || !newPrinterIp.trim()) return;
        const { data, error } = await supabase.from('printers')
            .insert([{ name: newPrinterName.trim(), ip_address: newPrinterIp.trim(), port: 9100 }])
            .select().single();
        if (error) {
            console.error('Failed to add printer:', error);
            alert(`Error adding printer: ${error.message}`);
            return;
        }
        if (data) setPrinters(prev => [...prev, data]);
        setNewPrinterName(''); setNewPrinterIp('');
    }

    async function deletePrinter(id: string) {
        if (!confirm('Are you sure you want to delete this printer? Assure no stations are actively using it.')) return;
        await supabase.from('printers').delete().eq('id', id);
        setPrinters(prev => prev.filter(p => p.id !== id));
    }

    // settings
    const [saving, setSaving] = useState(false);

    // ─── users tab ────────────────────────────────────────────────────────────
    const [staffList, setStaffList] = useState<any[]>([]);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [newUserUsername, setNewUserUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserNombre, setNewUserNombre] = useState('');
    const [newUserApellido, setNewUserApellido] = useState('');
    const [newUserTelefono, setNewUserTelefono] = useState('');
    const [newUserRole, setNewUserRole] = useState<Role>('admin');
    const [newUserPin, setNewUserPin] = useState('');
    const [userFormError, setUserFormError] = useState('');
    const [userSaving, setUserSaving] = useState(false);

    async function loadStaff() {
        const { data } = await supabase.from('usuarios').select('*').order('created_at');
        setStaffList(data || []);
    }

    async function createUser() {
        setUserSaving(true); setUserFormError('');
        if (!newUserUsername || !newUserPassword || !newUserNombre || !newUserApellido) {
            setUserFormError('Username, password, first name and last name are required.');
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
            active: true,
        }]);
        if (error) { setUserFormError(error.message); setUserSaving(false); return; }
        await loadStaff();
        setShowCreateUser(false);
        setNewUserUsername(''); setNewUserPassword(''); setNewUserNombre(''); setNewUserApellido('');
        setNewUserTelefono(''); setNewUserPin(''); setNewUserRole('admin');
        setUserSaving(false);
    }

    async function toggleUserActive(id: string, active: boolean) {
        await supabase.from('usuarios').update({ active }).eq('id', id);
        setStaffList(prev => prev.map(u => u.id === id ? { ...u, active } : u));
    }

    async function deleteUser(id: string) {
        if (!confirm('Delete this user permanently?')) return;
        await supabase.from('usuarios').delete().eq('id', id);
        setStaffList(prev => prev.filter(u => u.id !== id));
    }

    // ─── load ────────────────────────────────────────────────────────────────
    useEffect(() => { loadAll(); }, []);
    useEffect(() => { if (tab === 'users') loadStaff(); }, [tab]);

    async function loadAll() {
        setLoading(true);
        const [ir, cr, tr, sr, pr, tickR, logR, setR, supR, zoneR] = await Promise.all([
            supabase.from('items').select('*, item_categories(category_id)').order('name'),
            supabase.from('categories').select('*').order('display_order'),
            supabase.from('tables').select('*').order('name'),
            supabase.from('kitchen_stations').select('*').order('display_order'),
            supabase.from('printers').select('*').order('name'),
            supabase.from('kitchen_tickets').select('*, kitchen_ticket_items(*)').in('status', ['pending', 'in_progress']).gte('created_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: false }),
            supabase.from('inventory_logs').select('*').order('created_at', { ascending: false }).limit(200),
            supabase.from('restaurant_settings').select('*').limit(1),
            supabase.from('suppliers').select('*').order('name'),
            supabase.from('table_zones').select('*').order('display_order'),
        ]);
        setItems(ir.data || []);
        setCategories(cr.data || []);
        setTables(tr.data || []);
        setStations(sr.data || []);
        setPrinters(pr.data || []);
        setTickets(tickR.data || []);
        setInventoryLogs(logR.data || []);
        setSuppliers(supR.data || []);
        setZones(zoneR.data || []);

        const currentSettings = setR.data && setR.data.length > 0 ? setR.data[0] : null;

        if (currentSettings) {
            setSettings(currentSettings);
            if (currentSettings.theme_color) document.documentElement.setAttribute('data-color', currentSettings.theme_color);
            if (currentSettings.theme_mode === 'dark') document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        } else {
            const defaultSettings = { enable_table_service: false, theme_color: 'teal', theme_mode: 'light', currency: 'USD', language: 'es' };
            await supabase.from('restaurant_settings').insert([defaultSettings]);
            setSettings(defaultSettings);
            document.documentElement.setAttribute('data-color', 'teal');
            document.documentElement.classList.remove('dark');
        }
        setLoading(false);
    }


    // ─── realtime for KDS & INVENTORY ─────────────────────────────────────────
    useEffect(() => {
        const tenantId = typeof window !== 'undefined' ? localStorage.getItem('pos_tenant_id') : null;
        const filterStr = tenantId ? `tenant_id=eq.${tenantId}` : undefined;

        const channel = supabase.channel('dashboard-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_tickets', filter: filterStr }, () => refreshTickets())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_ticket_items', filter: filterStr }, () => refreshTickets())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: filterStr }, () => refreshInventory())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_logs', filter: filterStr }, () => refreshLogs())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    async function refreshInventory() {
        const { data } = await supabase.from('items').select('*, item_categories(category_id)').order('name');
        if (data) setItems(data);
    }

    async function refreshLogs() {
        const { data } = await supabase.from('inventory_logs').select('*').order('created_at', { ascending: false }).limit(200);
        if (data) setInventoryLogs(data);
    }

    async function refreshTickets() {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
            .from('kitchen_tickets')
            .select('*, kitchen_ticket_items(*)')
            .in('status', ['pending', 'in_progress'])
            .gte('created_at', twelveHoursAgo)
            .order('created_at', { ascending: false });
        setTickets(data || []);
    }

    // ─── CURRENCY helpers ──────────────────────────────────────────────────────
    const CURRENCIES: Record<string, { symbol: string; name: string; locale: string }> = {
        C: { symbol: 'C$', name: 'Cordoba Oro', locale: 'es-NI' },
        NIO: { symbol: 'C$', name: 'Nicaraguan Cordoba', locale: 'es-NI' },
        USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
        EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
        GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
        MXN: { symbol: '$', name: 'Mexican Peso', locale: 'es-MX' },
        CAD: { symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA' },
        BRL: { symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
        ARS: { symbol: 'ARS$', name: 'Argentine Peso', locale: 'es-AR' },
        COP: { symbol: 'COL$', name: 'Colombian Peso', locale: 'es-CO' },
        JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
        CNY: { symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
        INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
        AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
        CHF: { symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
        KRW: { symbol: '₩', name: 'South Korean Won', locale: 'ko-KR' },
        SEK: { symbol: 'kr', name: 'Swedish Krona', locale: 'sv-SE' },
        NOK: { symbol: 'kr', name: 'Norwegian Krone', locale: 'nb-NO' },
        DKK: { symbol: 'kr', name: 'Danish Krone', locale: 'da-DK' },
        PLN: { symbol: 'zł', name: 'Polish Zloty', locale: 'pl-PL' },
        TRY: { symbol: '₺', name: 'Turkish Lira', locale: 'tr-TR' },
        ZAR: { symbol: 'R', name: 'South African Rand', locale: 'en-ZA' },
        NZD: { symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ' },
        HKD: { symbol: 'HK$', name: 'Hong Kong Dollar', locale: 'zh-HK' },
        SGD: { symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
        THB: { symbol: '฿', name: 'Thai Baht', locale: 'th-TH' },
        PHP: { symbol: '₱', name: 'Philippine Peso', locale: 'en-PH' },
        IDR: { symbol: 'Rp', name: 'Indonesian Rupiah', locale: 'id-ID' },
        MYR: { symbol: 'RM', name: 'Malaysian Ringgit', locale: 'ms-MY' },
        VND: { symbol: '₫', name: 'Vietnamese Dong', locale: 'vi-VN' },
        EGP: { symbol: 'E£', name: 'Egyptian Pound', locale: 'ar-EG' },
        NGN: { symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG' },
        PEN: { symbol: 'S/', name: 'Peruvian Sol', locale: 'es-PE' },
        CLP: { symbol: 'CLP$', name: 'Chilean Peso', locale: 'es-CL' },
        UAH: { symbol: '₴', name: 'Ukrainian Hryvnia', locale: 'uk-UA' },
        CZK: { symbol: 'Kč', name: 'Czech Koruna', locale: 'cs-CZ' },
        HUF: { symbol: 'Ft', name: 'Hungarian Forint', locale: 'hu-HU' },
        RON: { symbol: 'lei', name: 'Romanian Leu', locale: 'ro-RO' },
        ILS: { symbol: '₪', name: 'Israeli Shekel', locale: 'he-IL' },
        AED: { symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
        SAR: { symbol: '﷼', name: 'Saudi Riyal', locale: 'ar-SA' },
        TWD: { symbol: 'NT$', name: 'Taiwan Dollar', locale: 'zh-TW' },
        PKR: { symbol: '₨', name: 'Pakistani Rupee', locale: 'en-PK' },
        BDT: { symbol: '৳', name: 'Bangladeshi Taka', locale: 'bn-BD' },
    };

    const UOM_OPTIONS = [
        { group: 'Weight', units: ['lb', 'kg', 'oz', 'g', 'mg', 'ton'] },
        { group: 'Volume', units: ['gallon', 'liter', 'ml', 'fl oz', 'quart', 'pint', 'cup'] },
        { group: 'Count', units: ['each', 'dozen', 'case', 'box', 'bag', 'pack', 'bundle', 'pallet', 'roll', 'sheet'] },
        { group: 'Length', units: ['ft', 'm', 'in', 'cm', 'yd'] },
    ];

    function fmtCurrency(amount: number) {
        let cur = settings?.currency || 'USD';
        if (cur === 'C') cur = 'NIO'; // Backwards compatibility
        const info = CURRENCIES[cur] || CURRENCIES.USD;
        try {
            return new Intl.NumberFormat(info.locale, { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(amount);
        } catch(e) {
            return `${info.symbol}${amount.toFixed(2)}`;
        }
    }

    // ─── SETTINGS actions ─────────────────────────────────────────────────────
    async function toggleTableService() {
        setSaving(true);
        const newVal = !settings.enable_table_service;
        const { error } = await supabase.from('restaurant_settings').update({ enable_table_service: newVal }).not('id', 'is', null);
        if (error) {
            console.error('Failed to toggle table service:', error);
            alert(`Error: ${error.message}`);
        } else {
            setSettings((s: any) => ({ ...s, enable_table_service: newVal }));
        }
        setSaving(false);
    }

    async function updateMapBackground(url: string) {
        setSaving(true);
        const { error } = await supabase.from('restaurant_settings').update({ map_background_url: url }).not('id', 'is', null);
        if (error) {
            console.error('Failed to update map background:', error);
            alert(`Error updating map background: ${error.message}`);
        } else {
            setSettings((s: any) => ({ ...s, map_background_url: url }));
        }
        setSaving(false);
    }

    async function updateThemeColor(color: string) {
        setSaving(true);
        const { error } = await supabase.from('restaurant_settings').update({ theme_color: color }).not('id', 'is', null);
        if (error) {
            console.error('Failed to update theme color:', error);
            alert(`Error updating theme color: ${error.message}`);
        } else {
            setSettings((s: any) => ({ ...s, theme_color: color }));
            document.documentElement.setAttribute('data-color', color);
        }
        setSaving(false);
    }

    async function updateExpediterSettings(updates: any) {
        setSaving(true);
        await supabase.from('restaurant_settings').update(updates).not('id', 'is', null);
        setSettings((s: any) => ({ ...s, ...updates }));
        setSaving(false);
    }

    async function updateThemeMode(mode: string) {
        setSaving(true);
        const { error } = await supabase.from('restaurant_settings').update({ theme_mode: mode }).not('id', 'is', null);
        if (error) {
            console.error('Failed to update theme mode:', error);
            alert(`Error updating theme mode: ${error.message}`);
        } else {
            setSettings((s: any) => ({ ...s, theme_mode: mode }));
            if (mode === 'dark') document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        }
        setSaving(false);
    }

    // ─── derived ─────────────────────────────────────────────────────────────

    const lang = settings?.language || 'es';
    const ALL_TABS: { id: Tab; label: string; roles: Role[] }[] = [
        { id: 'menu', label: '🍽 ' + t('sidebar.menu', lang), roles: ['super_admin', 'owner', 'admin'] },
        { id: 'inventory', label: '📦 ' + t('sidebar.inventory', lang), roles: ['super_admin', 'owner', 'admin'] },
        { id: 'tables', label: '🪑 ' + t('sidebar.tables', lang), roles: ['super_admin', 'owner', 'admin'] },
        { id: 'kitchen', label: '👨‍🍳 ' + t('sidebar.orders', lang), roles: ['super_admin', 'owner', 'admin', 'estacion'] },
        { id: 'reports', label: '📈 ' + (lang === 'es' ? 'Reportes' : 'Reports'), roles: ['super_admin', 'owner', 'admin'] },
        { id: 'promotions', label: '🏷️ ' + t('sidebar.promotions', lang), roles: ['super_admin', 'owner', 'admin'] },
        { id: 'attendance', label: '⏰ ' + (lang === 'es' ? 'Asistencia' : 'Attendance'), roles: ['super_admin', 'owner', 'admin'] },
        { id: 'payroll', label: '💰 ' + (lang === 'es' ? 'Nómina' : 'Payroll'), roles: ['super_admin', 'owner'] },
        { id: 'users', label: '👥 ' + t('sidebar.staff', lang), roles: ['super_admin', 'owner'] },
        { id: 'settings', label: '⚙️ ' + t('sidebar.settings', lang), roles: ['super_admin'] },
    ];
    const TABS = currentUser ? ALL_TABS.filter(t => t.roles.includes(currentUser.role)) : [];

    // Redirect active tab if current tab is not allowed for user role
    useEffect(() => {
        if (currentUser) {
            const allowedTabIds = ALL_TABS.filter(t => t.roles.includes(currentUser.role)).map(t => t.id);
            if (allowedTabIds.length > 0 && !allowedTabIds.includes(tab)) {
                setTabState(allowedTabIds[0]);
            }
        }
    }, [currentUser, tab]);


    const menuCategories = categories.filter((c: any) => c.type === 'menu');
    // ─── render ───────────────────────────────────────────────────────────────
    return (
        <div className="h-screen flex bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
            {/* Left Sidebar */}
            <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col shrink-0 relative z-20 shadow-sm">
                {/* Logo Area */}
                <div className="h-20 flex items-center px-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center shadow-sm">
                            <span className="text-white font-black text-sm">OS</span>
                        </div>
                        <div>
                            <h1 className="font-extrabold text-gray-900 dark:text-gray-100 text-lg leading-tight">Restaurant</h1>
                            <p className="text-xs font-semibold text-gray-400">Admin Panel</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Menu */}
                <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
                    {/* AI Command Button */}
                    <button 
                        onClick={() => setIsCommandBarOpen(true)}
                        className="w-full mb-4 flex items-center justify-start gap-2.5 px-4 py-2.5 text-sm font-extrabold rounded-2xl bg-gradient-to-r from-teal-500/10 to-emerald-600/10 hover:from-teal-500/15 hover:to-emerald-600/15 text-teal-600 dark:text-teal-400 border border-teal-500/10 transition-all active:scale-[0.98] outline-none"
                    >
                        <span className="text-base">🤖</span>
                        <span className="truncate">{lang === 'es' ? 'Asistente IA (Cmd+K)' : 'AI Assistant (Cmd+K)'}</span>
                    </button>

                    <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Main Menu</p>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold rounded-2xl transition-all ${tab === t.id ? 'bg-primary-50 text-primary-700 shadow-[inset_0_0_0_1px_rgba(20,184,166,0.1)]' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900 dark:hover:text-gray-100'}`}>
                            <span>{t.label}</span>
                            {t.id === 'kitchen' && tickets.length > 0 && (
                                <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${tab === t.id ? 'bg-primary-200 text-primary-800' : 'bg-orange-500 text-white shadow-sm'}`}>{tickets.filter(tk => tk.status !== 'done').length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* User Profile Footer */}
                {currentUser && (
                    <div className="p-4 border-t border-gray-100">
                        <div className="flex justify-between items-center px-2 py-1 mb-2">
                            <div className="truncate pr-2">
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{currentUser.full_name}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{currentUser.role.replace('_', ' ')}</p>
                            </div>
                            <button onClick={signOut} className="text-xs px-3 py-1.5 rounded-xl font-bold text-gray-500 dark:text-gray-400 bg-gray-50 hover:bg-red-50 hover:text-red-600 transition-colors">
                                {t('sidebar.logout', lang)}
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-10 py-10">
                    {loading ? (
                        <div className="flex items-center justify-center py-32">
                            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* ══════════ MENU TAB ══════════ */}
                            {tab === 'menu' && (
                                <CategoriesTab
                                    lang={settings?.language || 'es'}
                                    items={items}
                                    categories={categories}
                                    stations={stations}
                                    fmtCurrency={fmtCurrency}
                                    typeColor={typeColor}
                                />
                            )}

                            {/* ══════════ INVENTORY TAB ══════════ */}
                            {tab === 'inventory' && (
                                <InventoryTab
                                    supabase={supabase}
                                    lang={settings?.language || 'es'}
                                    items={items}
                                    setItems={setItems}
                                    suppliers={suppliers}
                                    setSuppliers={setSuppliers}
                                    categories={categories}
                                    fmtCurrency={fmtCurrency}
                                    settings={settings}
                                    setSettings={setSettings}
                                    inventoryLogs={inventoryLogs}
                                    setInventoryLogs={setInventoryLogs}
                                />
                            )}

                            {/* ══════════ TABLES TAB ══════════ */}
                            {tab === 'tables' && (
                                <TablesTab
                                    supabase={supabase}
                                    lang={settings?.language || 'es'}
                                    tables={tables}
                                    setTables={setTables}
                                    settings={settings}
                                    setTab={setTab}
                                    zones={zones}
                                    setZones={setZones}
                                />
                            )}

                            {/* ══════════ KITCHEN TAB ══════════ */}
                            {tab === 'kitchen' && (
                                <KitchenTab
                                    supabase={supabase}
                                    lang={settings?.language || 'es'}
                                    stations={stations}
                                    setStations={setStations}
                                    printers={printers}
                                    tickets={tickets}
                                    setTickets={setTickets}
                                    settings={settings}
                                    updateExpediterSettings={updateExpediterSettings}
                                />
                            )}

                            {/* ══════════ PROMOTIONS TAB ══════════ */}
                            {tab === 'promotions' && (
                                <PromotionsTab 
                                    supabase={supabase} 
                                    lang={settings?.language || 'es'} 
                                    fmtCurrency={fmtCurrency} 
                                    menuCategories={menuCategories} 
                                    items={items} 
                                />
                            )}

                            {/* ══════════ SETTINGS TAB ══════════ */}
                            {tab === 'settings' && (
                                <SettingsTab 
                                    supabase={supabase}
                                    settings={settings}
                                    setSettings={setSettings}
                                    lang={settings?.language || 'es'}
                                    setTab={setTab}
                                    printers={printers}
                                    setPrinters={setPrinters}
                                    CURRENCIES={CURRENCIES}
                                />
                            )}

                            {/* ══════════ USERS TAB ══════════ */}
                            {tab === 'users' && (
                                <UsersTab supabase={supabase} lang={settings?.language || 'es'} />
                            )}

                            {/* ══════════ ATTENDANCE TAB ══════════ */}
                            {tab === 'attendance' && (
                                <AttendanceTab
                                    supabase={supabase}
                                    lang={settings?.language || 'es'}
                                />
                            )}

                            {/* ══════════ PAYROLL TAB ══════════ */}
                            {tab === 'payroll' && (
                                <PayrollTab
                                    supabase={supabase}
                                    lang={settings?.language || 'es'}
                                />
                            )}
                        </>
                    )}
                </div>

                {tab === 'reports' && (
                                <ReportsTab supabase={supabase} lang={settings?.language || 'es'} fmtCurrency={fmtCurrency} />
                            )}

            </main >

            <CommandBar 
                isOpen={isCommandBarOpen}
                onClose={() => setIsCommandBarOpen(false)}
                onExecute={handleExecuteCommand}
                lang={settings?.language || 'es'}
            />
        </div >
    );
}
