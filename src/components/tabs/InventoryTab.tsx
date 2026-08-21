import React, { useState, Fragment } from 'react';
import Link from 'next/link';
import { t } from '../../utils/i18n';
import { Search, Plus, Archive, RefreshCw, BarChart2, Edit2, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface InventoryTabProps {
    supabase: any;
    lang: string;
    items: any[];
    setItems: any;
    suppliers: any[];
    setSuppliers: any;
    categories: any[];
    fmtCurrency: (amount: number, currency?: string) => string;
    settings: any;
    setSettings: any;
    inventoryLogs: any[];
    setInventoryLogs: any;
}

export default function InventoryTab({ supabase, lang, items, setItems, suppliers, setSuppliers, categories, fmtCurrency, settings, setSettings, inventoryLogs, setInventoryLogs }: InventoryTabProps) {
    const [saving, setSaving] = useState(false);
    // inventory tab
    const [inventorySubTab, setInventorySubTab] = useState<'stock' | 'suppliers' | 'logs'>('stock');
    const [activeInventoryCategory, setActiveInventoryCategory] = useState<string>('all');
    const [addStockTarget, setAddStockTarget] = useState<any | null>(null);
    const [stockModalMode, setStockModalMode] = useState<'restock' | 'waste' | 'adjustment'>('restock');
    const [stockAmount, setStockAmount] = useState('');
    const [stockCost, setStockCost] = useState('');
    const [stockBatch, setStockBatch] = useState('');
    const [stockNote, setStockNote] = useState('');
    const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
    const [inventorySearch, setInventorySearch] = useState('');
    const [priceHistoryItem, setPriceHistoryItem] = useState<any | null>(null);
    const [priceHistoryData, setPriceHistoryData] = useState<any[]>([]);
    const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
    // supplier form
    const [showSupplierForm, setShowSupplierForm] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
    const [supplierForm, setSupplierForm] = useState({ name: '', contact_name: '', phone: '', email: '', address: '', notes: '' });
    const [supplierSaving, setSupplierSaving] = useState(false);
    // stock log viewer
    const [logPage, setLogPage] = useState(0);
    const [logPageSize] = useState(50);
    const [logFilterItem, setLogFilterItem] = useState<string>('all');
    const [logFilterType, setLogFilterType] = useState<string>('all');
    const [logFilterBatch, setLogFilterBatch] = useState('');
    const [logFilterDateFrom, setLogFilterDateFrom] = useState('');
    const [logFilterDateTo, setLogFilterDateTo] = useState('');
    const [paginatedLogs, setPaginatedLogs] = useState<any[]>([]);
    const [logTotalCount, setLogTotalCount] = useState(0);
    const [logsLoading, setLogsLoading] = useState(false);

    const inventoryCategories = categories.filter(c => c.type === 'inventory');
    const trackedItems = items.filter(i => i.track_inventory && i.type === 'ingredient' && (activeInventoryCategory === 'all' || i.item_categories?.some((ic: any) => ic.category_id === activeInventoryCategory)) && (!inventorySearch || i.name.toLowerCase().includes(inventorySearch.toLowerCase()) || i.sku?.toLowerCase().includes(inventorySearch.toLowerCase())));
    const lowStockItems = items.filter(i => i.track_inventory && i.type === 'ingredient' && i.par_level > 0 && (i.stock_level || 0) <= i.par_level);
    const totalInventoryValue = items.filter(i => i.track_inventory && i.type === 'ingredient').reduce((sum, i) => sum + ((i.stock_level || 0) * (i.cost_per_unit || 0)), 0);

    async function adjustStock() {
        if (!addStockTarget || !stockAmount) return;
        const qty = parseFloat(stockAmount);
        if (isNaN(qty) || qty <= 0) return;
        const currentLevel = addStockTarget.stock_level || 0;
        let newLevel: number;
        let logEntry: any = { item_id: addStockTarget.id, note: stockNote || null };

        let newCostPerUnit: number | null = null;

        if (stockModalMode === 'restock') {
            newLevel = currentLevel + qty;
            logEntry.quantity_added = qty;
            logEntry.quantity_removed = 0;
            logEntry.change_type = 'restock';

            // Weighted average cost calculation
            const purchaseCost = parseFloat(stockCost);
            if (!isNaN(purchaseCost) && purchaseCost > 0) {
                const oldCost = addStockTarget.cost_per_unit || 0;
                const oldTotal = currentLevel * oldCost;
                const newTotal = qty * purchaseCost;
                newCostPerUnit = newLevel > 0 ? parseFloat(((oldTotal + newTotal) / newLevel).toFixed(4)) : purchaseCost;
                logEntry.purchase_cost = purchaseCost;
                logEntry.note = (stockNote ? stockNote + ' | ' : '') + `Cost: ${fmtCurrency(purchaseCost)}/unit → Avg: ${fmtCurrency(newCostPerUnit)}/unit`;
            }
            // Batch / lot number
            if (stockBatch.trim()) {
                logEntry.batch_number = stockBatch.trim();
            }
        } else if (stockModalMode === 'waste') {
            newLevel = Math.max(0, currentLevel - qty);
            logEntry.quantity_added = 0;
            logEntry.quantity_removed = qty;
            logEntry.change_type = 'waste';
        } else {
            newLevel = qty; // direct set
            const diff = qty - currentLevel;
            logEntry.quantity_added = diff > 0 ? diff : 0;
            logEntry.quantity_removed = diff < 0 ? Math.abs(diff) : 0;
            logEntry.change_type = 'adjustment';
        }

        const updatePayload: any = { stock_level: newLevel };
        if (newCostPerUnit !== null) updatePayload.cost_per_unit = newCostPerUnit;

        await supabase.from('items').update(updatePayload).eq('id', addStockTarget.id);
        await supabase.from('inventory_logs').insert([logEntry]);
        setItems((prev: any[]) => prev.map((i: any) => i.id === addStockTarget.id ? { ...i, stock_level: newLevel, ...(newCostPerUnit !== null ? { cost_per_unit: newCostPerUnit } : {}) } : i));
        const { data: newLog } = await supabase.from('inventory_logs').select('*').eq('item_id', addStockTarget.id).order('created_at', { ascending: false }).limit(10);
        setInventoryLogs((prev: any[]) => {
            const rest = prev.filter((l: any) => l.item_id !== addStockTarget.id);
            return [...(newLog || []), ...rest];
        });
        setAddStockTarget(null); setStockAmount(''); setStockCost(''); setStockBatch(''); setStockNote(''); setStockModalMode('restock');
    }

    // ─── SUPPLIER actions ─────────────────────────────────────────────────────
    async function saveSupplier() {
        setSupplierSaving(true);
        if (!supplierForm.name.trim()) { setSupplierSaving(false); return; }
        if (editingSupplier) {
            const { error } = await supabase.from('suppliers').update(supplierForm).eq('id', editingSupplier.id);
            if (!error) setSuppliers((prev: any[]) => prev.map((s: any) => s.id === editingSupplier.id ? { ...s, ...supplierForm } : s));
        } else {
            const { data, error } = await supabase.from('suppliers').insert([supplierForm]).select().single();
            if (!error && data) setSuppliers((prev: any[]) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        }
        setShowSupplierForm(false); setEditingSupplier(null);
        setSupplierForm({ name: '', contact_name: '', phone: '', email: '', address: '', notes: '' });
        setSupplierSaving(false);
    }

    async function deleteSupplier(id: string) {
        if (!confirm(lang === 'es' ? '¿Eliminar este proveedor? Los artículos vinculados tendrán su proveedor desvinculado.' : 'Delete this supplier? Items linked to it will have their supplier cleared.')) return;
        await supabase.from('suppliers').delete().eq('id', id);
        setSuppliers((prev: any[]) => prev.filter((s: any) => s.id !== id));
    }

    function openEditSupplier(s: any) {
        setEditingSupplier(s);
        setSupplierForm({ name: s.name, contact_name: s.contact_name || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' });
        setShowSupplierForm(true);
    }

    async function updateCurrency(currency: string) {
        setSaving(true);
        await supabase.from('restaurant_settings').update({ currency }).not('id', 'is', null);
        setSettings((s: any) => ({ ...s, currency }));
        setSaving(false);
    }

    async function updateLanguage(language: string) {
        setSaving(true);
        await supabase.from('restaurant_settings').update({ language }).not('id', 'is', null);
        setSettings((s: any) => ({ ...s, language }));
        setSaving(false);
    }

    // ─── STOCK LOG (paginated) ───────────────────────────────────────────────
    async function loadStockLogs(page: number) {
        setLogsLoading(true);
        setLogPage(page);
        const from = page * logPageSize;
        const to = from + logPageSize - 1;

        let query = supabase.from('inventory_logs').select('*', { count: 'exact' });
        if (logFilterItem !== 'all') query = query.eq('item_id', logFilterItem);
        if (logFilterType !== 'all') query = query.eq('change_type', logFilterType);
        if (logFilterBatch) query = query.ilike('batch_number', `%${logFilterBatch}%`);
        if (logFilterDateFrom) query = query.gte('created_at', new Date(logFilterDateFrom).toISOString());
        if (logFilterDateTo) {
            const endDate = new Date(logFilterDateTo);
            endDate.setDate(endDate.getDate() + 1);
            query = query.lt('created_at', endDate.toISOString());
        }
        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data, count } = await query;
        setPaginatedLogs(data || []);
        setLogTotalCount(count || 0);
        setLogsLoading(false);
    }

    // ─── PRICE HISTORY ───────────────────────────────────────────────────────
    async function loadPriceHistory(item: any) {
        setPriceHistoryItem(item);
        setPriceHistoryLoading(true);
        const { data } = await supabase.from('inventory_logs')
            .select('*')
            .eq('item_id', item.id)
            .eq('change_type', 'restock')
            .gt('purchase_cost', 0)
            .order('created_at', { ascending: false })
            .limit(100);
        setPriceHistoryData(data || []);
        setPriceHistoryLoading(false);
    }

    function getPriceTrend(itemId: string): { trend: 'up' | 'down' | 'stable' | 'none'; icon: string; color: string } {
        const logs = inventoryLogs.filter((l: any) => l.item_id === itemId && l.change_type === 'restock' && l.purchase_cost > 0);
        if (logs.length < 2) return { trend: 'none', icon: '', color: '' };
        const recent = logs.slice(0, 3);
        const newest = recent[0].purchase_cost;
        const oldest = recent[recent.length - 1].purchase_cost;
        if (newest > oldest * 1.02) return { trend: 'up', icon: '↑', color: 'text-red-500' };
        if (newest < oldest * 0.98) return { trend: 'down', icon: '↓', color: 'text-green-500' };
        return { trend: 'stable', icon: '→', color: 'text-gray-400' };
    }

    function buildReorderMailto(lowItems: any[]) {
        // Group by supplier
        const bySupplier = new Map<string, { supplier: any; items: any[] }>();
        for (const item of lowItems) {
            const sup = suppliers.find(s => s.id === item.supplier_id);
            if (!sup?.email) continue;
            if (!bySupplier.has(sup.id)) bySupplier.set(sup.id, { supplier: sup, items: [] });
            bySupplier.get(sup.id)!.items.push(item);
        }
        return Array.from(bySupplier.values());
    }

    return (
        <>
            {/* ══════════ INVENTORY TAB ══════════ */}
                            
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('inventory.title', lang)}</h2>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{items.filter(i => i.track_inventory && i.type === 'ingredient').length} {t('inventory.tracked_items', lang)} · {suppliers.length} {t('inventory.suppliers_count', lang)}</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <Link href="/categories?type=inventory" className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow transition">
                                                {t('menu.manage_categories', lang)}
                                            </Link>
                                            <Link href="/items/new?preset=ingredient" className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition">
                                                {t('inventory.add_item', lang)}
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-4 gap-4 mb-6">
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('inventory.total_items', lang)}</p>
                                            <p className="text-3xl font-black text-gray-900 dark:text-gray-100">{items.filter(i => i.track_inventory && i.type === 'ingredient').length}</p>
                                        </div>
                                        <div className={`rounded-2xl border p-5 shadow-sm ${lowStockItems.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'}`}>
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${lowStockItems.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>{t('inventory.low_stock', lang)}</p>
                                            <p className={`text-3xl font-black ${lowStockItems.length > 0 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>{lowStockItems.length}</p>
                                            {lowStockItems.length > 0 && <p className="text-xs text-red-500 mt-1 font-medium">{lowStockItems.map(i => i.name).slice(0, 3).join(', ')}{lowStockItems.length > 3 ? '...' : ''}</p>}
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('inventory.value', lang)}</p>
                                            <p className="text-3xl font-black text-gray-900 dark:text-gray-100">{fmtCurrency(totalInventoryValue)}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('inventory.active_suppliers', lang)}</p>
                                            <p className="text-3xl font-black text-gray-900 dark:text-gray-100">{suppliers.length}</p>
                                        </div>
                                    </div>

                                    {/* Sub-navigation */}
                                    <div className="flex items-center gap-1 mb-6 bg-gray-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
                                        <button onClick={() => setInventorySubTab('stock')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${inventorySubTab === 'stock' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>{t('inventory.tab_stock', lang)}</button>
                                        <button onClick={() => setInventorySubTab('suppliers')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${inventorySubTab === 'suppliers' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>{t('inventory.tab_suppliers', lang)} ({suppliers.length})</button>
                                        <button onClick={() => { setInventorySubTab('logs'); loadStockLogs(0); }} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${inventorySubTab === 'logs' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>{t('inventory.tab_logs', lang)}</button>
                                    </div>

                                    {/* ─── Stock Overview Sub-tab ─── */}
                                    {inventorySubTab === 'stock' && (
                                        <>
                                            {/* Search + Category filter */}
                                            <div className="flex items-center gap-4 mb-6">
                                                <input type="text" placeholder={t('inventory.search', lang)} value={inventorySearch} onChange={e => setInventorySearch(e.target.value)}
                                                    className="w-64 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900" />
                                                <div className="flex gap-2 overflow-x-auto">
                                                    <button onClick={() => setActiveInventoryCategory('all')}
                                                        className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeInventoryCategory === 'all' ? 'bg-primary-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}>
                                                        {t('inventory.filter_all', lang)}
                                                    </button>
                                                    {inventoryCategories.map(c => (
                                                        <button key={c.id} onClick={() => setActiveInventoryCategory(c.id)}
                                                            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all ${activeInventoryCategory === c.id ? 'bg-primary-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}>
                                                            {c.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* ─── Low Stock Reorder Alerts ─── */}
                                            {lowStockItems.length > 0 && (
                                                <div className="mb-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-5">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h3 className="text-sm font-black text-red-700 dark:text-red-400">{t('inventory.reorder_alerts', lang)} — {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below par level</h3>
                                                        {buildReorderMailto(lowStockItems).length > 0 && (
                                                            <div className="flex gap-2">
                                                                {buildReorderMailto(lowStockItems).map(({ supplier, items: sItems }) => {
                                                                    const itemList = sItems.map(i => `• ${i.name}: ${i.stock_level} ${i.unit_of_measure || 'units'} (par: ${i.par_level})`).join('\n');
                                                                    const suggestedQty = sItems.map(i => `• ${i.name}: ${Math.max(0, (i.par_level || 0) * 2 - (i.stock_level || 0))} ${i.unit_of_measure || 'units'}`).join('\n');
                                                                    const subject = encodeURIComponent(`Reorder Request — ${sItems.length} item${sItems.length > 1 ? 's' : ''}`);
                                                                    const body = encodeURIComponent(`Hi ${supplier.contact_name || supplier.name},\n\nWe need to reorder the following items:\n\nCurrent Stock:\n${itemList}\n\nSuggested Order:\n${suggestedQty}\n\nPlease confirm availability and delivery date.\n\nThank you.`);
                                                                    return (
                                                                        <a key={supplier.id} href={`mailto:${supplier.email}?subject=${subject}&body=${body}`}
                                                                            className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-700 transition inline-flex items-center gap-1">
                                                                            📧 Email {supplier.name}
                                                                        </a>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {lowStockItems.map(item => {
                                                            const sup = suppliers.find((s: any) => s.id === item.supplier_id);
                                                            const pct = item.par_level > 0 ? Math.min(100, Math.round((item.stock_level / item.par_level) * 100)) : 0;
                                                            return (
                                                                <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-800 p-3 flex flex-col gap-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.name}</span>
                                                                        <span className="text-[10px] font-bold text-red-500">{pct}%</span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                                                                        <div className={`h-1.5 rounded-full ${pct < 25 ? 'bg-red-500' : pct < 50 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                    <div className="flex justify-between text-[10px] text-gray-400">
                                                                        <span>Stock: <strong className="text-gray-600">{item.stock_level}</strong> / Par: {item.par_level}</span>
                                                                        <span>Need: <strong className="text-red-500">+{Math.max(0, (item.par_level || 0) - (item.stock_level || 0))}</strong></span>
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                                                        {sup ? <span>🏢 {sup.name}{sup.email ? ` · ${sup.email}` : ''}</span> : <span className="text-amber-500">⚠ {t('inventory.no_supplier', lang)}</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Stock Adjustment Modal */}
                                            {addStockTarget && (
                                                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
                                                        <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-1">{t('inventory.stock_adj', lang)}</h3>
                                                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">{addStockTarget.name} — {lang === 'es' ? 'actual:' : 'current:'} {addStockTarget.stock_level ?? 0} {addStockTarget.unit_of_measure || (lang === 'es' ? 'unidades' : 'units')}</p>
                                                        {/* Supplier badge */}
                                                        {(() => { const sup = suppliers.find((s: any) => s.id === addStockTarget.supplier_id); return sup ? (
                                                            <div className="flex items-center gap-2 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">🏢 {lang === 'es' ? 'Proveedor:' : 'Supplier:'}</span>
                                                                <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">{sup.name}</span>
                                                                {sup.email && <span className="text-[10px] text-blue-400 ml-auto">{sup.email}</span>}
                                                            </div>
                                                        ) : (
                                                            <p className="text-[10px] text-amber-500 mb-3 font-medium">⚠ {lang === 'es' ? 'Sin proveedor asignado a este artículo' : 'No supplier assigned to this item'}</p>
                                                        ); })()}
                                                        {/* Mode tabs */}
                                                        <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                                                            {(['restock', 'waste', 'adjustment'] as const).map(mode => (
                                                                <button key={mode} onClick={() => setStockModalMode(mode)}
                                                                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all capitalize ${stockModalMode === mode ? (mode === 'waste' ? 'bg-red-500 text-white' : mode === 'adjustment' ? 'bg-amber-500 text-white' : 'bg-green-500 text-white') : 'text-gray-500 hover:text-gray-700'}`}>
                                                                    {mode === 'restock' ? (lang === 'es' ? '📥 Ingreso' : '📥 Restock') : mode === 'waste' ? (lang === 'es' ? '🗑 Quitar' : '🗑 Waste') : (lang === 'es' ? '🔧 Ajustar Nivel' : '🔧 Set Level')}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <input type="number" min="0" step="any"
                                                            placeholder={stockModalMode === 'adjustment' ? (lang === 'es' ? 'Nuevo nivel de stock' : 'New stock level') : (lang === 'es' ? `Cantidad a ${stockModalMode === 'restock' ? 'añadir' : 'quitar'}` : `Quantity to ${stockModalMode === 'restock' ? 'add' : 'remove'}`)}
                                                            value={stockAmount} onChange={e => setStockAmount(e.target.value)}
                                                            className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800" />
                                                        {/* Purchase cost — only for restock */}
                                                        {stockModalMode === 'restock' && (
                                                            <div className="mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <input type="number" min="0" step="0.01"
                                                                        placeholder={lang === 'es' ? `Costo de compra por ${addStockTarget.unit_of_measure || 'unidad'}` : `Purchase cost per ${addStockTarget.unit_of_measure || 'unit'}`}
                                                                        value={stockCost} onChange={e => setStockCost(e.target.value)}
                                                                        className="flex-1 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800" />
                                                                    <span className="text-xs text-gray-400 font-medium whitespace-nowrap">/{addStockTarget.unit_of_measure || 'unit'}</span>
                                                                </div>
                                                                {/* Weighted cost preview */}
                                                                {stockAmount && stockCost && parseFloat(stockAmount) > 0 && parseFloat(stockCost) > 0 && (() => {
                                                                    const oldStock = addStockTarget.stock_level || 0;
                                                                    const oldCost = addStockTarget.cost_per_unit || 0;
                                                                    const newQty = parseFloat(stockAmount);
                                                                    const purchCost = parseFloat(stockCost);
                                                                    const newAvg = (oldStock + newQty) > 0 ? ((oldStock * oldCost) + (newQty * purchCost)) / (oldStock + newQty) : purchCost;
                                                                    return (
                                                                        <div className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                                                            <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-1">💰 {lang === 'es' ? 'Vista previa de Costo Ponderado' : 'Weighted Cost Preview'}</p>
                                                                            <div className="flex items-center justify-between text-sm">
                                                                                <div className="text-gray-600 dark:text-gray-400">
                                                                                    <span className="text-gray-400">{lang === 'es' ? 'Actual:' : 'Current:'}</span> {fmtCurrency(oldCost)} × {oldStock}
                                                                                </div>
                                                                                <span className="text-gray-400">+</span>
                                                                                <div className="text-gray-600 dark:text-gray-400">
                                                                                    <span className="text-gray-400">{lang === 'es' ? 'Nuevo:' : 'New:'}</span> {fmtCurrency(purchCost)} × {newQty}
                                                                                </div>
                                                                                <span className="text-gray-400">=</span>
                                                                                <div className="font-bold text-green-700 dark:text-green-300">
                                                                                    {fmtCurrency(newAvg)}<span className="text-xs font-normal text-gray-400">/{addStockTarget.unit_of_measure || 'unit'}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                        {/* Batch / Lot number — restock only */}
                                                        {stockModalMode === 'restock' && (
                                                            <input type="text" placeholder={lang === 'es' ? "Lote / Número de batch (opcional)" : "Batch / Lot number (optional)"}
                                                                value={stockBatch} onChange={e => setStockBatch(e.target.value)}
                                                                className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 font-mono" />
                                                        )}
                                                        <input type="text" placeholder={lang === 'es' ? "Nota / Razón (opcional)" : "Note / reason (optional)"}
                                                            value={stockNote} onChange={e => setStockNote(e.target.value)}
                                                            className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800" />
                                                        <div className="flex gap-2">
                                                            <button onClick={adjustStock}
                                                                className={`flex-1 text-white py-2.5 rounded-xl font-bold text-sm transition shadow-sm ${stockModalMode === 'waste' ? 'bg-red-500 hover:bg-red-600' : stockModalMode === 'adjustment' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}>
                                                                {stockModalMode === 'restock' ? (lang === 'es' ? '📥 Añadir Stock' : '📥 Add Stock') : stockModalMode === 'waste' ? (lang === 'es' ? '🗑 Registrar Quitar' : '🗑 Log Waste') : (lang === 'es' ? '🔧 Ajustar' : '🔧 Set Level')}
                                                            </button>
                                                            <button onClick={() => { setAddStockTarget(null); setStockAmount(''); setStockCost(''); setStockBatch(''); setStockNote(''); setStockModalMode('restock'); }}
                                                                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition">{lang === 'es' ? 'Cancelar' : 'Cancel'}</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Stock Table */}
                                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-gray-50 border-b border-gray-200 dark:border-slate-800">
                                                            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('inventory.th_item', lang)}</th>
                                                            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('inventory.th_supplier', lang)}</th>
                                                            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('inventory.th_stock', lang)}</th>
                                                            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('inventory.th_cost', lang)}</th>
                                                            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('inventory.th_value', lang)}</th>
                                                            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('inventory.th_last_change', lang)}</th>
                                                            <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">{t('inventory.th_actions', lang)}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {trackedItems.map(item => {
                                                            const logs = inventoryLogs.filter((l: any) => l.item_id === item.id);
                                                            const lastLog = logs[0];
                                                            const isExpanded = expandedLogs === item.id;
                                                            const supplier = suppliers.find(s => s.id === item.supplier_id);
                                                            const itemValue = (item.stock_level || 0) * (item.cost_per_unit || 0);
                                                            const isLow = item.par_level > 0 && (item.stock_level || 0) <= item.par_level;
                                                            return (
                                                                <Fragment key={item.id}>
                                                                    <tr className={`hover:bg-gray-50 transition group ${isLow ? 'bg-red-50/50' : ''}`}>
                                                                        <td className="px-5 py-4">
                                                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</p>
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                {item.sku && <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{item.sku}</span>}
                                                                                {logs.length > 0 && (
                                                                                    <button onClick={() => setExpandedLogs(isExpanded ? null : item.id)}
                                                                                        className="text-xs text-primary-600 hover:underline">
                                                                                        {isExpanded ? `▲ ${lang === 'es' ? 'Ocultar' : 'Hide'}` : `▼ ${logs.length} ${t('inventory.logs', lang)}`}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-5 py-4">
                                                                            {supplier ? (
                                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{supplier.name}</span>
                                                                            ) : <span className="text-xs text-gray-400 italic">{lang === 'es' ? 'Sin proveedor' : 'No supplier'}</span>}
                                                                        </td>
                                                                        <td className="px-5 py-4">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLow ? 'bg-red-400 animate-pulse' : (item.stock_level || 0) > 20 ? 'bg-green-400' : 'bg-amber-400'}`} />
                                                                                <span className={`font-bold ${isLow ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>{item.stock_level ?? 0}</span>
                                                                                <span className="text-gray-400 text-xs">{item.unit_of_measure || (lang === 'es' ? 'unidades' : 'units')}</span>
                                                                            </div>
                                                                            {item.par_level > 0 && (
                                                                                <div className="mt-1 w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                                                    <div className={`h-full rounded-full transition-all ${isLow ? 'bg-red-400' : 'bg-green-400'}`}
                                                                                        style={{ width: `${Math.min(100, ((item.stock_level || 0) / (item.par_level * 2)) * 100)}%` }} />
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-5 py-4 text-sm font-mono text-gray-600">
                                                                            {item.cost_per_unit > 0 ? (
                                                                                <span className="inline-flex items-center gap-1">
                                                                                    {fmtCurrency(item.cost_per_unit)}
                                                                                    {(() => { const t = getPriceTrend(item.id); return t.icon ? <span className={`text-xs font-bold ${t.color}`}>{t.icon}</span> : null; })()}
                                                                                </span>
                                                                            ) : <span className="text-gray-300">—</span>}
                                                                        </td>
                                                                        <td className="px-5 py-4 text-sm font-mono font-medium text-gray-700 dark:text-gray-300">{itemValue > 0 ? fmtCurrency(itemValue) : <span className="text-gray-300">—</span>}</td>
                                                                        <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                                            {lastLog ? (
                                                                                <div>
                                                                                    <span className={`font-semibold ${lastLog.change_type === 'waste' ? 'text-red-500' : 'text-green-600'}`}>
                                                                                        {lastLog.quantity_added > 0 ? `+${lastLog.quantity_added}` : ''}{lastLog.quantity_removed > 0 ? `-${lastLog.quantity_removed}` : ''}
                                                                                    </span>
                                                                                    {lastLog.change_type && <span className={`ml-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${lastLog.change_type === 'waste' ? 'bg-red-100 text-red-600' : lastLog.change_type === 'adjustment' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{lastLog.change_type}</span>}
                                                                                    <p className="text-xs text-gray-400 mt-0.5">{new Date(lastLog.created_at).toLocaleDateString()}</p>
                                                                                </div>
                                                                            ) : <span className="text-gray-400 text-xs italic">{t('inventory.no_logs', lang)}</span>}
                                                                        </td>
                                                                        <td className="px-5 py-4 text-right">
                                                                            <div className="flex items-center justify-end gap-2">
                                                                                <button onClick={() => loadPriceHistory(item)}
                                                                                    className="text-blue-500 hover:text-blue-700 text-xs font-bold opacity-0 group-hover:opacity-100 transition" title={lang === 'es' ? 'Historial de Precios' : 'Price History'}>📈</button>
                                                                                <button onClick={() => { setLogFilterItem(item.id); setInventorySubTab('logs'); setTimeout(() => loadStockLogs(0), 0); }}
                                                                                    className="text-gray-400 hover:text-gray-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition" title={lang === 'es' ? 'Rastrear' : 'Trace'}>🔍</button>
                                                                                <Link href={`/items/${item.id}`} className="text-primary-600 hover:text-primary-800 text-xs font-bold opacity-0 group-hover:opacity-100 transition">{lang === 'es' ? 'Editar' : 'Edit'}</Link>
                                                                                <button onClick={() => { setAddStockTarget(item); setStockModalMode('restock'); }}
                                                                                    className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition">{t('inventory.btn_add', lang)}</button>
                                                                                <button onClick={() => { setAddStockTarget(item); setStockModalMode('waste'); }}
                                                                                    className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition">{t('inventory.btn_waste', lang)}</button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    {isExpanded && (
                                                                        <tr key={`${item.id}-log`} className="bg-primary-50/40">
                                                                            <td colSpan={7} className="px-8 py-3">
                                                                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">{lang === 'es' ? 'Historial de Stock' : 'Stock Log'}</p>
                                                                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                                                                    {logs.map((log: any) => (
                                                                                        <div key={log.id} className="flex items-center gap-3 text-sm">
                                                                                            <span className={`font-bold w-12 ${log.change_type === 'waste' ? 'text-red-500' : 'text-green-600'}`}>
                                                                                                {log.quantity_added > 0 ? `+${log.quantity_added}` : `-${log.quantity_removed || 0}`}
                                                                                            </span>
                                                                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${log.change_type === 'waste' ? 'bg-red-100 text-red-600' : log.change_type === 'adjustment' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{log.change_type || 'restock'}</span>
                                                                                            <span className="text-gray-500 dark:text-gray-400 text-xs">{new Date(log.created_at).toLocaleString()}</span>
                                                                                            {log.note && <span className="text-gray-400 italic text-xs">— {log.note}</span>}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </Fragment>
                                                            );
                                                        })}
                                                        {trackedItems.length === 0 && (
                                                            <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">{lang === 'es' ? 'No se encontraron artículos.' : 'No items found.'} {inventorySearch ? (lang === 'es' ? 'Intenta una búsqueda diferente.' : 'Try a different search.') : (lang === 'es' ? 'Agrega artículos con control de inventario activado.' : 'Add items with inventory tracking enabled.')}</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* ─── Price History Modal ─── */}
                                            {priceHistoryItem && (
                                                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div>
                                                                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">{t('inventory.price_history', lang)}</h3>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">{priceHistoryItem.name} — {priceHistoryData.length} {lang === 'es' ? 'registro(s) de compra' : 'purchase record(s)'}</p>
                                                            </div>
                                                            <button onClick={() => setPriceHistoryItem(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
                                                        </div>

                                                        {/* Summary Stats */}
                                                        {priceHistoryData.length > 0 && (() => {
                                                            const costs = priceHistoryData.map(l => l.purchase_cost);
                                                            const avg = costs.reduce((a: number, b: number) => a + b, 0) / costs.length;
                                                            const min = Math.min(...costs);
                                                            const max = Math.max(...costs);
                                                            const newest = costs[0];
                                                            const oldest = costs[costs.length - 1];
                                                            const pctChange = oldest > 0 ? ((newest - oldest) / oldest) * 100 : 0;
                                                            return (
                                                                <div className="grid grid-cols-4 gap-3 mb-4">
                                                                    <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'es' ? 'Promedio' : 'Average'}</p>
                                                                        <p className="text-lg font-black text-gray-800 dark:text-gray-200">{fmtCurrency(avg)}</p>
                                                                    </div>
                                                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                                                                        <p className="text-[10px] font-bold text-green-500 uppercase">{lang === 'es' ? 'Mínimo' : 'Lowest'}</p>
                                                                        <p className="text-lg font-black text-green-700 dark:text-green-300">{fmtCurrency(min)}</p>
                                                                    </div>
                                                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                                                                        <p className="text-[10px] font-bold text-red-500 uppercase">{lang === 'es' ? 'Máximo' : 'Highest'}</p>
                                                                        <p className="text-lg font-black text-red-700 dark:text-red-300">{fmtCurrency(max)}</p>
                                                                    </div>
                                                                    <div className={`rounded-xl p-3 text-center ${pctChange > 2 ? 'bg-red-50 dark:bg-red-900/20' : pctChange < -2 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-slate-800'}`}>
                                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'es' ? 'Tendencia' : 'Trend'}</p>
                                                                        <p className={`text-lg font-black ${pctChange > 2 ? 'text-red-600' : pctChange < -2 ? 'text-green-600' : 'text-gray-600'}`}>
                                                                            {pctChange > 2 ? '🔴 ↑' : pctChange < -2 ? '🟢 ↓' : '⚪ →'} {Math.abs(pctChange).toFixed(1)}%
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Timeline Table */}
                                                        <div className="overflow-y-auto flex-1 rounded-xl border border-gray-200 dark:border-slate-700">
                                                            {priceHistoryLoading ? (
                                                                <div className="py-8 text-center">
                                                                    <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                                                </div>
                                                            ) : priceHistoryData.length === 0 ? (
                                                                <div className="py-12 text-center text-gray-400">
                                                                    <p className="text-base mb-1">{lang === 'es' ? 'Sin registros de compras aún' : 'No purchase records yet'}</p>
                                                                    <p className="text-xs">{lang === 'es' ? 'Agrega un costo al reabastecer para generar historial de precios.' : 'Add a cost when restocking to build price history.'}</p>
                                                                </div>
                                                            ) : (
                                                                <table className="w-full text-left text-sm">
                                                                    <thead>
                                                                        <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0">
                                                                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">{lang === 'es' ? 'Fecha' : 'Date'}</th>
                                                                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">{lang === 'es' ? 'Lote' : 'Batch'}</th>
                                                                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right">{lang === 'es' ? 'Cant.' : 'Qty'}</th>
                                                                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right">{lang === 'es' ? 'Costo/Unidad' : 'Cost/Unit'}</th>
                                                                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right">{lang === 'es' ? 'Total' : 'Total'}</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                                                        {priceHistoryData.map((log: any, idx: number) => {
                                                                            const prevCost = idx < priceHistoryData.length - 1 ? priceHistoryData[idx + 1].purchase_cost : null;
                                                                            const diff = prevCost ? log.purchase_cost - prevCost : 0;
                                                                            return (
                                                                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                                                                    <td className="px-4 py-2.5 text-gray-600 font-mono text-xs whitespace-nowrap">
                                                                                        {new Date(log.created_at).toLocaleDateString()} <span className="text-gray-400">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                    </td>
                                                                                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                                                                                        {log.batch_number || <span className="text-gray-300">—</span>}
                                                                                    </td>
                                                                                    <td className="px-4 py-2.5 text-right font-mono text-green-600 font-bold">+{log.quantity_added}</td>
                                                                                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-800 dark:text-gray-200">
                                                                                        {fmtCurrency(log.purchase_cost)}
                                                                                        {diff !== 0 && (
                                                                                            <span className={`ml-1 text-[10px] font-bold ${diff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                                                                {diff > 0 ? '↑' : '↓'}{fmtCurrency(Math.abs(diff))}
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-4 py-2.5 text-right font-mono text-gray-500">{fmtCurrency(log.purchase_cost * log.quantity_added)}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* ─── Suppliers Sub-tab ─── */}
                                    {inventorySubTab === 'suppliers' && (
                                        <>
                                            {/* Supplier Form Modal */}
                                            {showSupplierForm && (
                                                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-xl">
                                                        <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-4">{editingSupplier ? t('inventory.edit_supplier', lang) : t('inventory.add_supplier', lang)}</h3>
                                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">{lang === 'es' ? 'Nombre de la Empresa *' : 'Company Name *'}</label>
                                                                <input type="text" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} placeholder={lang === 'es' ? "ej. Proveedor Local" : "e.g. Sysco Foods"}
                                                                    className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">{lang === 'es' ? 'Persona de Contacto' : 'Contact Person'}</label>
                                                                <input type="text" value={supplierForm.contact_name} onChange={e => setSupplierForm({ ...supplierForm, contact_name: e.target.value })} placeholder="Juan Pérez"
                                                                    className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">{lang === 'es' ? 'Teléfono' : 'Phone'}</label>
                                                                <input type="text" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} placeholder="+1 555 000 0000"
                                                                    className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">{lang === 'es' ? 'Correo Electrónico' : 'Email'}</label>
                                                                <input type="email" value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })} placeholder="contacto@empresa.com"
                                                                    className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                            </div>
                                                        </div>
                                                        <div className="mb-3">
                                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">{lang === 'es' ? 'Dirección' : 'Address'}</label>
                                                            <input type="text" value={supplierForm.address} onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })} placeholder={lang === 'es' ? "Av. Principal 123" : "123 Supply St, City"}
                                                                className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                        </div>
                                                        <div className="mb-4">
                                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">{lang === 'es' ? 'Notas internas' : 'Notes (delivery schedule, terms...)'}</label>
                                                            <textarea value={supplierForm.notes} onChange={e => setSupplierForm({ ...supplierForm, notes: e.target.value })} rows={2} placeholder={lang === 'es' ? "Entregas Mar/Jue..." : "Delivers Tue/Thu, Net 30..."}
                                                                className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={saveSupplier} disabled={supplierSaving || !supplierForm.name.trim()} className="flex-1 bg-primary-500 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-primary-600 transition shadow-sm disabled:opacity-50">
                                                                {supplierSaving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : editingSupplier ? (lang === 'es' ? 'Actualizar Proveedor' : 'Update Supplier') : (lang === 'es' ? 'Agregar Proveedor' : 'Add Supplier')}
                                                            </button>
                                                            <button onClick={() => { setShowSupplierForm(false); setEditingSupplier(null); setSupplierForm({ name: '', contact_name: '', phone: '', email: '', address: '', notes: '' }); }}
                                                                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition">{lang === 'es' ? 'Cancelar' : 'Cancel'}</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-end mb-4">
                                                <button onClick={() => { setEditingSupplier(null); setSupplierForm({ name: '', contact_name: '', phone: '', email: '', address: '', notes: '' }); setShowSupplierForm(true); }}
                                                    className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition">{lang === 'es' ? '+ Agregar Proveedor' : '+ Add Supplier'}</button>
                                            </div>

                                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-gray-50 border-b border-gray-200 dark:border-slate-800">
                                                            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{lang === 'es' ? 'Empresa' : 'Company'}</th>
                                                            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{lang === 'es' ? 'Contacto' : 'Contact'}</th>
                                                            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{lang === 'es' ? 'Teléfono' : 'Phone'}</th>
                                                            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{lang === 'es' ? 'Correo' : 'Email'}</th>
                                                            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{lang === 'es' ? 'Artículos' : 'Items'}</th>
                                                            <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">{lang === 'es' ? 'Acciones' : 'Actions'}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {suppliers.map(s => {
                                                            const itemCount = items.filter(i => i.supplier_id === s.id).length;
                                                            return (
                                                                <tr key={s.id} className="hover:bg-gray-50 transition group">
                                                                    <td className="px-6 py-4">
                                                                        <p className="font-bold text-gray-900 dark:text-gray-100">{s.name}</p>
                                                                        {s.address && <p className="text-xs text-gray-400 mt-0.5">{s.address}</p>}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-sm text-gray-600">{s.contact_name || <span className="text-gray-300">—</span>}</td>
                                                                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{s.phone || <span className="text-gray-300">—</span>}</td>
                                                                    <td className="px-6 py-4 text-sm text-gray-600">{s.email || <span className="text-gray-300">—</span>}</td>
                                                                    <td className="px-6 py-4"><span className="bg-primary-50 text-primary-700 text-xs font-bold px-2 py-1 rounded-full">{itemCount}</span></td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                                                            <button onClick={() => openEditSupplier(s)} className="text-primary-600 text-xs font-bold hover:text-primary-800">{lang === 'es' ? 'Editar' : 'Edit'}</button>
                                                                            <button onClick={() => deleteSupplier(s.id)} className="text-red-500 text-xs font-bold hover:text-red-700">{t('btn.delete', lang)}</button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {suppliers.length === 0 && (
                                                            <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">{lang === 'es' ? 'No hay proveedores todavía. Añade uno para comenzar.' : 'No suppliers yet. Add one to get started.'}</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {suppliers.length > 0 && suppliers.some(s => s.notes) && (
                                                <div className="mt-4 grid grid-cols-2 gap-3">
                                                    {suppliers.filter(s => s.notes).map(s => (
                                                        <div key={s.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                                            <p className="text-xs font-bold text-amber-700 mb-1">📋 {s.name}</p>
                                                            <p className="text-xs text-amber-600">{s.notes}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* ─── Stock Log Sub-tab ─── */}
                                    {inventorySubTab === 'logs' && (
                                        <>
                                            {/* Filters */}
                                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm mb-5">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('inventory.filters', lang)}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400">{logTotalCount.toLocaleString()} {lang === 'es' ? 'registros' : 'records'}</span>
                                                        <button onClick={() => { setLogFilterItem('all'); setLogFilterType('all'); setLogFilterBatch(''); setLogFilterDateFrom(''); setLogFilterDateTo(''); setTimeout(() => loadStockLogs(0), 0); }}
                                                            className="text-xs text-primary-600 font-bold hover:text-primary-800">{lang === 'es' ? 'Limpiar Todo' : 'Clear All'}</button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-5 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{lang === 'es' ? 'Artículo' : 'Item'}</label>
                                                        <select value={logFilterItem} onChange={e => { setLogFilterItem(e.target.value); setTimeout(() => loadStockLogs(0), 0); }}
                                                            className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                                            <option value="all">{lang === 'es' ? 'Todos los Artículos' : 'All Items'}</option>
                                                            {items.filter(i => i.track_inventory && i.type === 'ingredient').map(i => (
                                                                <option key={i.id} value={i.id}>{i.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{lang === 'es' ? 'Tipo' : 'Type'}</label>
                                                        <select value={logFilterType} onChange={e => { setLogFilterType(e.target.value); setTimeout(() => loadStockLogs(0), 0); }}
                                                            className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                                            <option value="all">{lang === 'es' ? 'Todos los Tipos' : 'All Types'}</option>
                                                            <option value="restock">{lang === 'es' ? '📥 Ingreso' : '📥 Restock'}</option>
                                                            <option value="waste">{lang === 'es' ? '🗑 Merma' : '🗑 Waste'}</option>
                                                            <option value="adjustment">{lang === 'es' ? '🔧 Ajuste' : '🔧 Adjustment'}</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{lang === 'es' ? 'Lote #' : 'Batch #'}</label>
                                                        <input type="text" placeholder={lang === 'es' ? "Buscar lote..." : "Search batch..."} value={logFilterBatch} onChange={e => { setLogFilterBatch(e.target.value); setTimeout(() => loadStockLogs(0), 0); }}
                                                            className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{lang === 'es' ? 'Desde' : 'From'}</label>
                                                        <input type="date" value={logFilterDateFrom} onChange={e => { setLogFilterDateFrom(e.target.value); setTimeout(() => loadStockLogs(0), 0); }}
                                                            className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{lang === 'es' ? 'Hasta' : 'To'}</label>
                                                        <input type="date" value={logFilterDateTo} onChange={e => { setLogFilterDateTo(e.target.value); setTimeout(() => loadStockLogs(0), 0); }}
                                                            className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Log Table */}
                                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                                {logsLoading && (
                                                    <div className="px-6 py-8 text-center">
                                                        <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                                        <p className="text-sm text-gray-400 mt-2">{lang === 'es' ? 'Cargando historial...' : 'Loading logs...'}</p>
                                                    </div>
                                                )}
                                                {!logsLoading && (
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                                                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Fecha y Hora' : 'Date & Time'}</th>
                                                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Artículo' : 'Item'}</th>
                                                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Proveedor' : 'Supplier'}</th>
                                                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Tipo' : 'Type'}</th>
                                                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Lote #' : 'Batch #'}</th>
                                                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">{lang === 'es' ? 'Añadido' : 'Added'}</th>
                                                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">{lang === 'es' ? 'Retirado' : 'Removed'}</th>
                                                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">{lang === 'es' ? 'Costo' : 'Cost'}</th>
                                                                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Nota' : 'Note'}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                            {paginatedLogs.map(log => {
                                                                const item = items.find(i => i.id === log.item_id);
                                                                const sup = item ? suppliers.find((s: any) => s.id === item.supplier_id) : null;
                                                                const typeClass = log.change_type === 'waste' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : log.change_type === 'adjustment' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
                                                                return (
                                                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition text-sm">
                                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap font-mono text-xs">
                                                                            {new Date(log.created_at).toLocaleDateString()} <span className="text-gray-400">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                        </td>
                                                                        <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{item?.name || <span className="text-gray-400 italic">{lang === 'es' ? 'Artículo eliminado' : 'Deleted item'}</span>}</td>
                                                                        <td className="px-4 py-3 text-xs text-gray-500">{sup?.name || <span className="text-gray-300">—</span>}</td>
                                                                        <td className="px-4 py-3">
                                                                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${typeClass}`}>{log.change_type || 'restock'}</span>
                                                                        </td>
                                                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.batch_number || <span className="text-gray-300">—</span>}</td>
                                                                        <td className="px-4 py-3 text-right font-mono">
                                                                            {log.quantity_added > 0 ? <span className="text-green-600 font-bold">+{log.quantity_added}</span> : <span className="text-gray-300">—</span>}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right font-mono">
                                                                            {log.quantity_removed > 0 ? <span className="text-red-500 font-bold">-{log.quantity_removed}</span> : <span className="text-gray-300">—</span>}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right font-mono text-xs">
                                                                            {log.purchase_cost > 0 ? <span className="text-gray-700 dark:text-gray-300 font-semibold">{fmtCurrency(log.purchase_cost)}</span> : <span className="text-gray-300">—</span>}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[200px] truncate">{log.note || <span className="text-gray-300">—</span>}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                            {paginatedLogs.length === 0 && (
                                                                <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-400">{logTotalCount === 0 ? (lang === 'es' ? 'No se encontraron entradas de log.' : 'No log entries found.') : (lang === 'es' ? 'Ninguna entrada coincide con los filtros.' : 'No entries match filters.')}</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>

                                            {/* Pagination */}
                                            {logTotalCount > logPageSize && (
                                                <div className="flex items-center justify-between mt-4">
                                                    <p className="text-xs text-gray-400">
                                                        {lang === 'es' 
                                                            ? `Mostrando ${logPage * logPageSize + 1}–${Math.min((logPage + 1) * logPageSize, logTotalCount)} de ${logTotalCount.toLocaleString()}`
                                                            : `Showing ${logPage * logPageSize + 1}–${Math.min((logPage + 1) * logPageSize, logTotalCount)} of ${logTotalCount.toLocaleString()}`}
                                                    </p>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => loadStockLogs(0)} disabled={logPage === 0}
                                                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 disabled:opacity-30 transition">{lang === 'es' ? '⟨⟨ Primero' : '⟨⟨ First'}</button>
                                                        <button onClick={() => loadStockLogs(logPage - 1)} disabled={logPage === 0}
                                                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 disabled:opacity-30 transition">{lang === 'es' ? '← Ant.' : '← Prev'}</button>
                                                        {/* Page number buttons (show up to 5 around current) */}
                                                        {(() => {
                                                            const totalPages = Math.ceil(logTotalCount / logPageSize);
                                                            const start = Math.max(0, logPage - 2);
                                                            const end = Math.min(totalPages, start + 5);
                                                            return Array.from({ length: end - start }, (_, i) => start + i).map(p => (
                                                                <button key={p} onClick={() => loadStockLogs(p)}
                                                                    className={`w-8 py-1.5 text-xs font-bold rounded-lg border transition ${p === logPage ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 text-gray-600'}`}>{p + 1}</button>
                                                            ));
                                                        })()}
                                                        <button onClick={() => loadStockLogs(logPage + 1)} disabled={(logPage + 1) * logPageSize >= logTotalCount}
                                                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 disabled:opacity-30 transition">{lang === 'es' ? 'Sig. →' : 'Next →'}</button>
                                                        <button onClick={() => loadStockLogs(Math.ceil(logTotalCount / logPageSize) - 1)} disabled={(logPage + 1) * logPageSize >= logTotalCount}
                                                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 disabled:opacity-30 transition">{lang === 'es' ? 'Último ⟩⟩' : 'Last ⟩⟩'}</button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            
        </>
    );
}
