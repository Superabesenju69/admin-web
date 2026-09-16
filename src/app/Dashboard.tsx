'use client';

import { useEffect, useState, Fragment, useRef } from 'react';
import { createClient } from '../utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { t, formatRole } from '../utils/i18n';
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
import TenantsTab from '../components/tabs/TenantsTab';
import CommandBar from '../components/CommandBar';
import TenantSelector from '../components/TenantSelector';
import CajaTab from '../components/tabs/CajaTab';
import ExpensesTab from '../components/tabs/ExpensesTab';
import AIAssistantTab from '../components/tabs/AIAssistantTab';
import { generateExcelReport } from '../utils/excelGenerator';
import { 
    analyzeRecipeCost, 
    draftPurchaseOrders, 
    predictStaffingRequirements, 
    analyzeSlowInventory, 
    toggleItemAvailability 
} from '../utils/aiAnalyticsEngine';

const supabase = createClient();

type Tab = 'ai' | 'menu' | 'inventory' | 'tables' | 'kitchen' | 'reports' | 'promotions' | 'settings' | 'users' | 'attendance' | 'payroll' | 'tenants' | 'caja' | 'expenses';
type Role = 'system_admin' | 'super_admin' | 'owner' | 'admin' | 'cajero' | 'mesero' | 'cocinero' | 'estacion';
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
    const [commandPrompt, setCommandPrompt] = useState('');
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [selectedTenantName, setSelectedTenantName] = useState<string | null>(null);
    const [isSuspended, setIsSuspended] = useState(false);

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

    async function handleExecuteCommand(action: string, data: any): Promise<boolean | any> {
        try {
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
                    track_inventory: true
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
                    display_order: display_order || 1
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
                    port: 9100
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
                    capacity: 4
                }]);
                if (error) throw error;
                // Reload tables
                const { data: trData } = await supabase.from('tables').select('*').order('name');
                if (trData) setTables(trData);
                return true;
            }
            
            if (action === 'MODIFY_STOCK') {
                const { item_name, quantity, change_type, purchase_cost, batch_number, note } = data;
                if (!item_name) return false;
                
                let targetItem = items.find((i: any) => i.name.toLowerCase() === item_name.toLowerCase());
                if (!targetItem) {
                    targetItem = items.find((i: any) => i.name.toLowerCase().includes(item_name.toLowerCase()));
                }
                
                if (!targetItem) {
                    throw new Error(lang === 'es' 
                        ? `No se encontró el ingrediente "${item_name}" en el inventario.` 
                        : `Ingredient "${item_name}" not found in inventory.`);
                }
                
                const qty = parseFloat(quantity);
                if (isNaN(qty) || qty <= 0) {
                    throw new Error(lang === 'es' ? 'La cantidad debe ser un número positivo.' : 'Quantity must be a positive number.');
                }
                
                const currentLevel = targetItem.stock_level || 0;
                let newLevel: number;
                let logEntry: any = { item_id: targetItem.id, note: note || null };
                let newCostPerUnit: number | null = null;
                
                if (change_type === 'restock') {
                    newLevel = currentLevel + qty;
                    logEntry.quantity_added = qty;
                    logEntry.quantity_removed = 0;
                    logEntry.change_type = 'restock';
                    
                    const purchCost = parseFloat(purchase_cost);
                    if (!isNaN(purchCost) && purchCost > 0) {
                        const oldCost = targetItem.cost_per_unit || 0;
                        const oldTotal = currentLevel * oldCost;
                        const newTotal = qty * purchCost;
                        newCostPerUnit = newLevel > 0 ? parseFloat(((oldTotal + newTotal) / newLevel).toFixed(4)) : purchCost;
                        logEntry.purchase_cost = purchCost;
                        logEntry.note = (note ? note + ' | ' : '') + `Cost: $${purchCost}/unit → Avg: $${newCostPerUnit}/unit`;
                    }
                    if (batch_number) {
                        logEntry.batch_number = String(batch_number).trim();
                    }
                } else if (change_type === 'waste') {
                    newLevel = Math.max(0, currentLevel - qty);
                    logEntry.quantity_added = 0;
                    logEntry.quantity_removed = qty;
                    logEntry.change_type = 'waste';
                } else {
                    newLevel = qty;
                    const diff = qty - currentLevel;
                    logEntry.quantity_added = diff > 0 ? diff : 0;
                    logEntry.quantity_removed = diff < 0 ? Math.abs(diff) : 0;
                    logEntry.change_type = 'adjustment';
                }
                
                const updatePayload: any = { stock_level: newLevel };
                if (newCostPerUnit !== null) updatePayload.cost_per_unit = newCostPerUnit;
                
                const { error: updateError } = await supabase.from('items').update(updatePayload).eq('id', targetItem.id);
                if (updateError) throw updateError;
                
                const { error: logError } = await supabase.from('inventory_logs').insert([logEntry]);
                if (logError) throw logError;
                
                await refreshInventory();
                await refreshLogs();
                return true;
            }

            if (action === 'GENERATE_EXCEL') {
                const reportType = data.report_type || 'pnl';
                const dateRange = data.date_range || 'month';
                const res = await generateExcelReport(supabase, reportType, dateRange);
                if (!res.success) {
                    throw new Error(res.message);
                }
                return true;
            }

            if (action === 'ANALYZE_RECIPE_COST') {
                return await analyzeRecipeCost(supabase, data.target_dish);
            }

            if (action === 'DRAFT_PURCHASE_ORDER') {
                return await draftPurchaseOrders(supabase, data.supplier_name);
            }

            if (action === 'PREDICT_STAFFING') {
                return await predictStaffingRequirements(supabase, data.target_day);
            }

            if (action === 'ANALYZE_SLOW_STOCK') {
                return await analyzeSlowInventory(supabase);
            }

            if (action === 'TOGGLE_ITEM_AVAILABILITY') {
                const isAvail = data.is_available !== undefined ? data.is_available : false;
                const res = await toggleItemAvailability(supabase, data.target_dish, isAvail);
                await refreshInventory();
                return res;
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
        const storedTenantId = localStorage.getItem('pos_tenant_id');
        const storedTenantName = localStorage.getItem('pos_tenant_name');
        setSelectedTenantId(storedTenantId);
        setSelectedTenantName(storedTenantName);

        const stored = localStorage.getItem('pos_user');
        if (!stored) { router.replace('/login'); return; }
        try {
            const u = JSON.parse(stored);
            const userRole = u.role as Role;
            setCurrentUser({ 
                id: u.id, 
                full_name: u.full_name || `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.username, 
                role: userRole 
            });

            // Only run loadAll if we are NOT a system_admin needing to select a tenant, 
            // OR if a tenant is already selected.
            if (userRole !== 'system_admin' || storedTenantId) {
                loadAll();
            } else {
                setLoading(false); // Skip loadAll and show selector
            }
        } catch {
            router.replace('/login');
        }
    }, []);

    function signOut() {
        localStorage.removeItem('pos_user');
        localStorage.removeItem('pos_tenant_id');
        localStorage.removeItem('pos_tenant_name');
        localStorage.removeItem('pos_tenant_subdomain');
        localStorage.removeItem('pos_login_tenant_id');
        localStorage.removeItem('pos_login_tenant_name');
        localStorage.removeItem('pos_login_tenant_subdomain');
        document.cookie = 'pos_tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
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
        if (!confirm(lang === 'es' ? '¿Está seguro de que desea eliminar esta impresora? Asegúrese de que ninguna estación la esté usando.' : 'Are you sure you want to delete this printer? Assure no stations are actively using it.')) return;
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
        if (!confirm(lang === 'es' ? '¿Eliminar este usuario permanentemente?' : 'Delete this user permanently?')) return;
        await supabase.from('usuarios').delete().eq('id', id);
        setStaffList(prev => prev.filter(u => u.id !== id));
    }

    // ─── load ────────────────────────────────────────────────────────────────
    useEffect(() => { if (tab === 'users' && (currentUser?.role !== 'system_admin' || selectedTenantId)) loadStaff(); }, [tab]);

    async function loadAll() {
        setLoading(true);
        const tenantId = typeof window !== 'undefined' ? localStorage.getItem('pos_tenant_id') : null;
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('pos_user') : null;
        let userRole = '';
        if (storedUser) {
            try {
                userRole = JSON.parse(storedUser).role;
            } catch (e) {}
        }

        const promises: any[] = [
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
        ];

        if (tenantId) {
            promises.push(
                (supabase.from('tenants')
                    .select('active')
                    .eq('id', tenantId)
                    .maybeSingle() as any)
                    .then((res: any) => {
                        if (res.error) return { data: { active: true } };
                        return res;
                    })
                    .catch(() => ({ data: { active: true } }))
            );
        }

        const results = await Promise.all(promises);
        const ir = results[0];
        const cr = results[1];
        const tr = results[2];
        const sr = results[3];
        const pr = results[4];
        const tickR = results[5];
        const logR = results[6];
        const setR = results[7];
        const supR = results[8];
        const zoneR = results[9];
        const tenantRes = tenantId ? results[10] : null;

        if (tenantRes && tenantRes.data) {
            if (tenantRes.data.active === false) {
                setIsSuspended(true);
            } else {
                setIsSuspended(false);
            }
        }

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
        if (!tenantId) return; // Skip if no tenant is active
        const filterStr = tenantId ? `tenant_id=eq.${tenantId}` : undefined;

        const channel = supabase.channel('dashboard-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_tickets', filter: filterStr }, () => refreshTickets())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_ticket_items', filter: filterStr }, () => refreshTickets())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: filterStr }, () => refreshInventory())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_logs', filter: filterStr }, () => refreshLogs())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [selectedTenantId]);

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
        { id: 'ai', label: '🤖 ' + (lang === 'es' ? 'Asistente IA' : 'AI Assistant'), roles: ['system_admin', 'super_admin', 'owner', 'admin'] },
        { id: 'menu', label: '🍽 ' + t('sidebar.menu', lang), roles: ['system_admin', 'super_admin', 'owner', 'admin'] },
        { id: 'inventory', label: '📦 ' + t('sidebar.inventory', lang), roles: ['system_admin', 'super_admin', 'owner', 'admin'] },
        { id: 'tables', label: '🪑 ' + t('sidebar.tables', lang), roles: ['system_admin', 'super_admin', 'owner', 'admin'] },
        { id: 'kitchen', label: '👨‍🍳 ' + t('sidebar.orders', lang), roles: ['system_admin', 'super_admin', 'owner', 'admin', 'estacion'] },
        { id: 'reports', label: '📈 ' + (lang === 'es' ? 'Reportes' : 'Reports'), roles: ['system_admin', 'super_admin', 'owner', 'admin'] },
        { id: 'caja', label: '💵 ' + (lang === 'es' ? 'Caja' : 'Cash Drawer'), roles: ['system_admin', 'super_admin', 'owner', 'admin'] },
        { id: 'promotions', label: '🏷️ ' + t('sidebar.promotions', lang), roles: ['system_admin', 'super_admin', 'owner', 'admin'] },
        { id: 'attendance', label: '⏰ ' + (lang === 'es' ? 'Asistencia' : 'Attendance'), roles: ['system_admin', 'super_admin', 'owner', 'admin'] },
        { id: 'payroll', label: '💰 ' + (lang === 'es' ? 'Nómina' : 'Payroll'), roles: ['system_admin', 'super_admin', 'owner'] },
        { id: 'expenses', label: '💸 ' + t('sidebar.expenses', lang), roles: ['system_admin', 'super_admin', 'owner'] },
        { id: 'users', label: '👥 ' + t('sidebar.staff', lang), roles: ['system_admin', 'super_admin', 'owner'] },
        { id: 'settings', label: '⚙️ ' + t('sidebar.settings', lang), roles: ['system_admin', 'super_admin'] },
        { id: 'tenants', label: '🏢 ' + t('sidebar.tenants', lang), roles: ['system_admin'] },
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
    if (isSuspended && currentUser?.role !== 'system_admin') {
        return (
            <div className="min-h-screen w-screen flex flex-col items-center justify-center p-6 bg-[#f5f5f7] text-[#1d1d1f] font-sans relative">
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-md w-full bg-white border border-[#d2d2d7]/50 rounded-2xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center space-y-6"
                >
                    <div className="text-4xl mx-auto">
                        ⚠️
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
                            {lang === 'es' ? 'Cuenta Suspendida' : 'Account Suspended'}
                        </h2>
                        <p className="text-sm text-[#86868b] font-medium leading-relaxed">
                            {lang === 'es' 
                                ? 'Esta cuenta de restaurante ha sido suspendida debido a falta de pago de la suscripción mensual. Por favor contacte al administrador del sistema o soporte técnico.'
                                : 'This restaurant account is suspended due to unpaid subscription. Please contact support or the system administrator.'}
                        </p>
                    </div>

                    <div className="pt-6 border-t border-[#f5f5f7] flex flex-col gap-2">
                        <button
                            onClick={signOut}
                            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#1d1d1f] hover:bg-[#333336] text-white font-semibold text-sm transition cursor-pointer active:scale-98"
                        >
                            {lang === 'es' ? 'Cerrar Sesión' : 'Sign Out'}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (currentUser?.role === 'system_admin' && !selectedTenantId) {
        return (
            <TenantSelector
                onSelectTenant={(tenant) => {
                    localStorage.setItem('pos_tenant_id', tenant.id);
                    localStorage.setItem('pos_tenant_name', tenant.name);
                    localStorage.setItem('pos_tenant_subdomain', tenant.subdomain);
                    document.cookie = `pos_tenant_id=${tenant.id}; path=/; max-age=31536000; SameSite=Lax`;
                    window.location.reload();
                }}
                onSignOut={signOut}
                lang={lang}
            />
        );
    }

    return (
        <div className="h-screen flex bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
            {/* Left Sidebar */}
            <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col shrink-0 relative z-20 shadow-sm">
                {/* Logo Area */}
                <div className="h-20 flex items-center px-6 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center shadow-sm">
                            <span className="text-white font-black text-sm">OS</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="font-extrabold text-gray-900 dark:text-gray-100 text-base leading-tight truncate">
                                {selectedTenantName || 'Restaurant'}
                            </h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {currentUser?.role === 'system_admin' ? (lang === 'es' ? 'Admin del Sistema' : 'System Admin') : (lang === 'es' ? 'Panel de Control' : 'Admin Panel')}
                            </p>
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

                    <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        {lang === 'es' ? 'Menú Principal' : 'Main Menu'}
                    </p>
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
                    <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-3">
                        {currentUser.role === 'system_admin' && selectedTenantName && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    {lang === 'es' ? 'Sucursal Activa' : 'Active Branch'}
                                </p>
                                <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                                    🏢 {selectedTenantName}
                                </p>
                                <button 
                                    onClick={() => {
                                        localStorage.removeItem('pos_tenant_id');
                                        localStorage.removeItem('pos_tenant_name');
                                        localStorage.removeItem('pos_tenant_subdomain');
                                        document.cookie = `pos_tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
                                        window.location.reload();
                                    }}
                                    className="w-full mt-2 inline-flex items-center justify-center gap-1.5 text-[10px] font-black text-primary-600 dark:text-primary-400 hover:text-primary-700 bg-primary-500/5 hover:bg-primary-500/10 py-1.5 rounded-xl transition cursor-pointer"
                                >
                                    🔄 {lang === 'es' ? 'Cambiar Sucursal' : 'Switch Branch'}
                                </button>
                            </div>
                        )}
                        <div className="flex justify-between items-center px-2 py-1">
                            <div className="truncate pr-2">
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{currentUser.full_name}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{formatRole(currentUser.role, lang)}</p>
                            </div>
                            <button onClick={signOut} className="text-xs px-3 py-1.5 rounded-xl font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-850 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer">
                                {t('sidebar.logout', lang)}
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                {isSuspended && currentUser?.role === 'system_admin' && (
                    <div className="bg-red-50 border-b border-red-100 text-red-800 px-6 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                        <span>⚠️ {lang === 'es' ? 'Esta sucursal está suspendida por falta de pago' : 'This branch is currently suspended for unpaid subscription'}</span>
                        <span className="bg-red-200/50 text-red-900 px-2 py-0.5 rounded text-[10px]">{lang === 'es' ? 'VISTA ADMIN' : 'ADMIN VIEW'}</span>
                    </div>
                )}
                <div className="max-w-7xl mx-auto px-10 py-10">
                    {loading ? (
                        <div className="flex items-center justify-center py-32">
                            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* ══════════ AI ASSISTANT TAB ══════════ */}
                            {tab === 'ai' && (
                                <AIAssistantTab
                                    lang={settings?.language || 'es'}
                                    onRunPrompt={(pText: string) => {
                                        setCommandPrompt(pText);
                                        setIsCommandBarOpen(true);
                                    }}
                                />
                            )}

                            {/* ══════════ MENU TAB ══════════ */}
                            {tab === 'menu' && (
                                <CategoriesTab
                                    lang={settings?.language || 'es'}
                                    items={items}
                                    categories={categories}
                                    stations={stations}
                                    fmtCurrency={fmtCurrency}
                                    typeColor={typeColor}
                                    settings={settings}
                                    CURRENCIES={CURRENCIES}
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
                                    setSettings={setSettings}
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
                                <UsersTab supabase={supabase} lang={settings?.language || 'es'} currentUser={currentUser} />
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

                            {/* ══════════ TENANTS TAB ══════════ */}
                            {tab === 'tenants' && (
                                <TenantsTab
                                    currentUser={currentUser}
                                    lang={settings?.language || 'es'}
                                />
                            )}
                        </>
                    )}
                </div>

                {tab === 'reports' && (
                                <ReportsTab supabase={supabase} lang={settings?.language || 'es'} fmtCurrency={fmtCurrency} />
                            )}

                {tab === 'caja' && (
                                <CajaTab supabase={supabase} currentUser={currentUser} lang={settings?.language || 'es'} fmtCurrency={fmtCurrency} />
                            )}

                {tab === 'expenses' && (
                                <ExpensesTab supabase={supabase} lang={settings?.language || 'es'} fmtCurrency={fmtCurrency} />
                            )}

            </main >

            {/* Command Bar Modal */}
            <CommandBar
                isOpen={isCommandBarOpen}
                onClose={() => {
                    setIsCommandBarOpen(false);
                    setCommandPrompt('');
                }}
                onExecute={handleExecuteCommand}
                lang={lang}
                initialPrompt={commandPrompt}
            />
        </div >
    );
}
