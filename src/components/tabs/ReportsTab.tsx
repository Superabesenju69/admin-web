import React, { useState, useEffect } from 'react';
import { t } from '../../utils/i18n';

interface ReportsTabProps {
    supabase: any;
    lang: string;
    fmtCurrency: (amount: number) => string;
}

export default function ReportsTab({ supabase, lang, fmtCurrency }: ReportsTabProps) {
    const [reportDateRange, setReportDateRange] = useState<'today' | 'week' | 'month'>('today');
    const [reportOrders, setReportOrders] = useState<any[]>([]);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportSubTab, setReportSubTab] = useState<'efficiency' | 'sales' | 'cash_shifts'>('sales');
    const [salesPayments, setSalesPayments] = useState<any[]>([]);
    const [salesLineItems, setSalesLineItems] = useState<any[]>([]);
    const [cashShifts, setCashShifts] = useState<any[]>([]);
    const [selectedShiftForDetails, setSelectedShiftForDetails] = useState<any | null>(null);
    const [selectedShiftAdjustments, setSelectedShiftAdjustments] = useState<any[]>([]);

    async function loadReports() {
        setReportLoading(true);
        let start = new Date();
        start.setHours(0, 0, 0, 0);

        if (reportDateRange === 'week') {
            start.setDate(start.getDate() - 7);
        } else if (reportDateRange === 'month') {
            start.setMonth(start.getMonth() - 1);
        }

        // Fetch orders with tickets (for efficiency) AND line items (for sales) AND cash shifts
        const [ordersRes, paymentsRes, lineItemsRes, shiftsRes] = await Promise.all([
            supabase
                .from('orders')
                .select(`
                    *,
                    usuarios(id, nombre, apellido, role),
                    kitchen_tickets(id, created_at, updated_at, status, is_expediter, kitchen_ticket_items(id, created_at, ready_at, delivered_at))
                `)
                .gte('created_at', start.toISOString())
                .order('created_at', { ascending: false }),
            supabase
                .from('payments')
                .select('*')
                .gte('created_at', start.toISOString()),
            supabase
                .from('order_line_items')
                .select('*, items(id, name), orders!inner(created_at, status)')
                .gte('orders.created_at', start.toISOString()),
            supabase
                .from('cash_shifts')
                .select('*, usuarios(id, nombre, apellido, role, username)')
                .gte('created_at', start.toISOString())
                .order('created_at', { ascending: false })
        ]);

        setReportOrders(ordersRes.data || []);
        setSalesPayments(paymentsRes.data || []);
        setSalesLineItems(lineItemsRes.data || []);
        setCashShifts(shiftsRes.data || []);
        setReportLoading(false);
    }

    async function viewShiftAdjustments(shift: any) {
        setSelectedShiftForDetails(shift);
        const { data, error } = await supabase
            .from('cash_adjustments')
            .select('*')
            .eq('shift_id', shift.id)
            .order('created_at', { ascending: true });
        if (!error) {
            setSelectedShiftAdjustments(data || []);
        }
    }



    useEffect(() => {
        loadReports();
    }, [reportDateRange]);


                    // ═══════════════════════════════════════════════════════
                    // EFFICIENCY AGGREGATES (shared across both sub-tabs)
                    // ═══════════════════════════════════════════════════════
                    let totalPrepMins = 0;
                    let prepCount = 0;
                    let totalServiceMins = 0;
                    let serviceCount = 0;

                    const waiterStats: Record<string, { name: string; totalServiceMins: number; count: number }> = {};

                    reportOrders.forEach(o => {
                        const tickets = o.kitchen_tickets || [];
                        
                        const stationTickets = tickets.filter((t: any) => !t.is_expediter && (t.status === 'done' || t.status === 'archived'));
                        if (stationTickets.length > 0) {
                            const startTimes = stationTickets.map((t: any) => new Date(t.created_at).getTime());
                            const endTimes = stationTickets.map((t: any) => t.updated_at ? new Date(t.updated_at).getTime() : new Date(t.created_at).getTime());
                            const minStart = Math.min(...startTimes);
                            const maxEnd = Math.max(...endTimes);
                            totalPrepMins += (maxEnd - minStart) / 60000;
                            prepCount++;
                        }

                        if (o.user_id) {
                            const expTickets = tickets.filter((t: any) => t.is_expediter);
                            let orderServiceMins = 0;
                            let serviceHits = 0;
                            
                            expTickets.forEach((et: any) => {
                                const items = et.kitchen_ticket_items || [];
                                items.forEach((i: any) => {
                                    if (i.ready_at && i.delivered_at) {
                                        const rMin = new Date(i.ready_at).getTime();
                                        const dMin = new Date(i.delivered_at).getTime();
                                        if (dMin > rMin) {
                                            orderServiceMins += (dMin - rMin) / 60000;
                                            serviceHits++;
                                        }
                                    }
                                });
                            });
                            
                            if (serviceHits > 0) {
                                const avgServiceForThisOrder = orderServiceMins / serviceHits;
                                totalServiceMins += avgServiceForThisOrder;
                                serviceCount++;
                                
                                const waiterName = o.usuarios ? `${o.usuarios.nombre} ${o.usuarios.apellido}` : (lang === 'es' ? 'Desconocido' : 'Unknown');
                                if (!waiterStats[o.user_id]) waiterStats[o.user_id] = { name: waiterName, totalServiceMins: 0, count: 0 };
                                waiterStats[o.user_id].totalServiceMins += avgServiceForThisOrder;
                                waiterStats[o.user_id].count++;
                            }
                        }
                    });

                    const avgPrep = prepCount > 0 ? (totalPrepMins / prepCount).toFixed(1) : '0.0';
                    const avgService = serviceCount > 0 ? (totalServiceMins / serviceCount).toFixed(1) : '0.0';

                    const leaderboard = Object.values(waiterStats)
                        .map(w => ({ name: w.name, avg: (w.totalServiceMins / w.count).toFixed(1), count: w.count }))
                        .sort((a, b) => parseFloat(a.avg) - parseFloat(b.avg));

                    // ═══════════════════════════════════════════════════════
                    // SALES AGGREGATES
                    // ═══════════════════════════════════════════════════════
                    const paidOrders = reportOrders.filter(o => o.status === 'paid');
                    const voidOrders = reportOrders.filter(o => o.status === 'void' || o.status === 'voided' || o.status === 'cancelled');
                    const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
                    const totalOrderCount = paidOrders.length;
                    const avgTicket = totalOrderCount > 0 ? totalRevenue / totalOrderCount : 0;
                    const voidRate = reportOrders.length > 0 ? ((voidOrders.length / reportOrders.length) * 100) : 0;

                    // Daily revenue chart data
                    const dailyMap: Record<string, { revenue: number; orders: number }> = {};
                    paidOrders.forEach((o: any) => {
                        const day = new Date(o.created_at).toISOString().split('T')[0];
                        if (!dailyMap[day]) dailyMap[day] = { revenue: 0, orders: 0 };
                        dailyMap[day].revenue += (o.total_amount || 0);
                        dailyMap[day].orders++;
                    });
                    const dailyData = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b));
                    const maxDailyRevenue = Math.max(...dailyData.map(([, d]) => d.revenue), 1);

                    // Payment method breakdown
                    const paymentMethodMap: Record<string, number> = {};
                    salesPayments.forEach((p: any) => {
                        const method = p.method || 'other';
                        paymentMethodMap[method] = (paymentMethodMap[method] || 0) + (p.amount || 0);
                    });
                    const totalPaymentAmount = Object.values(paymentMethodMap).reduce((s, v) => s + v, 0);
                    const paymentMethodColors: Record<string, string> = {
                        'cash': '#22c55e',
                        'credit_card': '#3b82f6',
                        'bank_deposit': '#8b5cf6',
                        'other': '#6b7280',
                    };
                    const paymentMethodLabels: Record<string, string> = {
                        'cash': t('sales.payment.cash', lang),
                        'credit_card': t('sales.payment.card', lang),
                        'bank_deposit': t('sales.payment.bank', lang),
                        'other': t('sales.payment.other', lang),
                    };

                    // Order type breakdown
                    const dineInOrders = paidOrders.filter((o: any) => o.type === 'dine_in');
                    const takeOutOrders = paidOrders.filter((o: any) => o.type === 'take_out' || o.type !== 'dine_in');
                    const dineInRevenue = dineInOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
                    const takeOutRevenue = takeOutOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

                    // Best selling products
                    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
                    salesLineItems.forEach((li: any) => {
                        if (li.orders?.status !== 'paid') return;
                        const name = li.items?.name || li.item_name || (lang === 'es' ? 'Desconocido' : 'Unknown');
                        if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 };
                        productMap[name].qty += (li.quantity || 1);
                        productMap[name].revenue += (li.line_total || li.unit_price || 0) * (li.quantity || 1);
                    });
                    const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 10);

                    // Hourly distribution
                    const hourlyMap: Record<number, { orders: number; revenue: number }> = {};
                    for (let h = 0; h < 24; h++) hourlyMap[h] = { orders: 0, revenue: 0 };
                    paidOrders.forEach((o: any) => {
                        const hour = new Date(o.created_at).getHours();
                        hourlyMap[hour].orders++;
                        hourlyMap[hour].revenue += (o.total_amount || 0);
                    });
                    const maxHourlyOrders = Math.max(...Object.values(hourlyMap).map(h => h.orders), 1);

                    // Employee sales
                    const employeeSalesMap: Record<string, { name: string; orders: number; revenue: number }> = {};
                    paidOrders.forEach((o: any) => {
                        const uid = o.user_id || 'unknown';
                        const name = o.usuarios ? `${o.usuarios.nombre} ${o.usuarios.apellido}` : (lang === 'es' ? 'Desconocido' : 'Unknown');
                        if (!employeeSalesMap[uid]) employeeSalesMap[uid] = { name, orders: 0, revenue: 0 };
                        employeeSalesMap[uid].orders++;
                        employeeSalesMap[uid].revenue += (o.total_amount || 0);
                    });
                    const employeeSales = Object.values(employeeSalesMap).sort((a, b) => b.revenue - a.revenue);

                    return (
                        <div className="max-w-7xl mx-auto px-10 py-10 space-y-8">
                            {/* ──── Header with date range selector ──── */}
                            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{t('reports.title', lang)}</h1>
                                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">{reportSubTab === 'efficiency' ? t('eff.desc', lang) : t('sales.desc', lang)}</p>
                                </div>
                                <select
                                    value={reportDateRange}
                                    onChange={(e: any) => setReportDateRange(e.target.value)}
                                    className="border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2 font-bold bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                                >
                                    <option value="today">{t('eff.period.today', lang)}</option>
                                    <option value="week">{t('eff.period.week', lang)}</option>
                                    <option value="month">{t('eff.period.month', lang)}</option>
                                </select>
                            </div>

                            {/* ──── Sub-Tab Navigation ──── */}
                            <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
                                {(['sales', 'efficiency', 'cash_shifts'] as const).map(sub => (
                                    <button
                                        key={sub}
                                        onClick={() => setReportSubTab(sub)}
                                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                                            reportSubTab === sub
                                                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                        }`}
                                    >
                                        {t(`reports.tab.${sub}`, lang)}
                                    </button>
                                ))}
                            </div>

                            {reportLoading ? (
                                <div className="p-12 flex justify-center"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                            ) : reportSubTab === 'efficiency' ? (
                                <>
                                    {/* ═══ EFFICIENCY TAB (existing) ═══ */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
                                            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-3xl">👨‍🍳</div>
                                            <div>
                                                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-xs mb-1">{t('reports.prep.title', lang)}</p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{avgPrep}</span>
                                                    <span className="text-lg font-bold text-gray-400">min</span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-2 font-medium">{t('reports.prep.desc', lang)}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
                                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl">🏃</div>
                                            <div>
                                                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-xs mb-1">{t('reports.service.title', lang)}</p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{avgService}</span>
                                                    <span className="text-lg font-bold text-gray-400">min</span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-2 font-medium">{t('reports.service.desc', lang)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Waiter Leaderboard */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('reports.leaderboard', lang)}</h3>
                                            <p className="text-xs text-gray-500 mt-1 font-medium">{t('reports.leaderboard.desc', lang)}</p>
                                        </div>
                                        <table className="w-full">
                                            <thead className="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                                <tr>
                                                    <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('reports.table.rank', lang)}</th>
                                                    <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('reports.table.employee', lang)}</th>
                                                    <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('reports.table.avg', lang)}</th>
                                                    <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('reports.table.orders', lang)}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                {leaderboard.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="text-center py-10 text-gray-400 font-medium">{t('reports.table.empty', lang)}</td>
                                                    </tr>
                                                ) : leaderboard.map((w, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                                                        <td className="px-6 py-4">
                                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-100 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-gray-50 text-gray-500'}`}>
                                                                #{idx + 1}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{w.name}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={`font-black tracking-tight ${parseFloat(w.avg) < 5 ? 'text-emerald-600' : parseFloat(w.avg) > 10 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                                                {w.avg} min
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-bold text-gray-500">{w.count}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : reportSubTab === 'cash_shifts' ? (
                                <>
                                    {/* ═══ CASH DRAWER SHIFTS TAB ═══ */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-between items-center">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {lang === 'es' ? 'Turnos de Caja Registradora' : 'Cash Register Shifts'}
                                                </h3>
                                                <p className="text-xs text-gray-500 mt-1 font-medium">
                                                    {lang === 'es' 
                                                        ? 'Control del flujo de efectivo, arqueos y movimientos de caja por turno.' 
                                                        : 'Track cash flow, physical cash counts, and adjustments per shift.'}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                                    <tr>
                                                        <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                            {lang === 'es' ? 'Cajero' : 'Cashier'}
                                                        </th>
                                                        <th className="text-center px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                            {lang === 'es' ? 'Estado' : 'Status'}
                                                        </th>
                                                        <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                            {lang === 'es' ? 'Apertura' : 'Opened At'}
                                                        </th>
                                                        <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                            {lang === 'es' ? 'Cierre' : 'Closed At'}
                                                        </th>
                                                        <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                            {lang === 'es' ? 'Monto Inicial' : 'Starting Cash'}
                                                        </th>
                                                        <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                            {lang === 'es' ? 'Esperado' : 'Expected'}
                                                        </th>
                                                        <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                            {lang === 'es' ? 'Real' : 'Actual'}
                                                        </th>
                                                        <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                            {lang === 'es' ? 'Diferencia' : 'Difference'}
                                                        </th>
                                                        <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                            {lang === 'es' ? 'Notas' : 'Notes'}
                                                        </th>
                                                        <th className="text-center px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                            {lang === 'es' ? 'Acción' : 'Action'}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                    {cashShifts.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={10} className="text-center py-10 text-gray-400 font-medium">
                                                                {lang === 'es' ? 'No hay turnos registrados en este período.' : 'No register shifts recorded in this period.'}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        cashShifts.map((shift, idx) => {
                                                            const cashierName = shift.usuarios 
                                                                ? `${shift.usuarios.nombre} ${shift.usuarios.apellido}` 
                                                                : 'Unknown';
                                                            const diff = Number(shift.difference || 0);
                                                            let diffClass = 'text-gray-500 font-bold';
                                                            if (shift.status === 'closed') {
                                                                if (diff === 0) diffClass = 'text-emerald-600 font-bold';
                                                                else if (diff > 0) diffClass = 'text-blue-600 font-bold';
                                                                else diffClass = 'text-red-600 font-bold';
                                                            }

                                                            return (
                                                                <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                                                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                                                        {cashierName}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <span className={`px-2 py-1 rounded-full text-xs font-black uppercase ${
                                                                            shift.status === 'open' 
                                                                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                                                                : 'bg-gray-50 text-gray-500 border border-gray-200'
                                                                        }`}>
                                                                            {shift.status === 'open' 
                                                                                ? (lang === 'es' ? 'Abierta' : 'Open') 
                                                                                : (lang === 'es' ? 'Cerrada' : 'Closed')}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-gray-500">
                                                                        {new Date(shift.opening_time).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-gray-500">
                                                                        {shift.closing_time 
                                                                            ? new Date(shift.closing_time).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                                            : '-'}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right font-medium text-gray-600">
                                                                        {fmtCurrency(shift.starting_cash)}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right font-medium text-gray-600">
                                                                        {shift.status === 'closed' ? fmtCurrency(shift.expected_cash || 0) : '-'}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                                                                        {shift.status === 'closed' ? fmtCurrency(shift.actual_cash || 0) : '-'}
                                                                    </td>
                                                                    <td className={`px-6 py-4 text-right ${diffClass}`}>
                                                                        {shift.status === 'closed' 
                                                                            ? (diff > 0 ? `+${fmtCurrency(diff)}` : fmtCurrency(diff)) 
                                                                            : '-'}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={shift.notes || ''}>
                                                                        {shift.notes || '-'}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <button
                                                                            onClick={() => viewShiftAdjustments(shift)}
                                                                            className="px-3 py-1.5 bg-gray-100 hover:bg-primary-50 text-gray-600 hover:text-primary-600 border border-gray-200 hover:border-primary-200 rounded-lg text-xs font-black transition-all cursor-pointer"
                                                                        >
                                                                            {lang === 'es' ? 'Detalles' : 'Details'}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* ─── Selected Shift Adjustments Modal ─── */}
                                    {selectedShiftForDetails && (
                                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-100 dark:border-slate-800">
                                                <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-4 mb-4">
                                                    <h4 className="text-lg font-black text-gray-900 dark:text-white">
                                                        {lang === 'es' ? 'Movimientos de la Caja' : 'Cash Drawer Logs'}
                                                    </h4>
                                                    <button
                                                        onClick={() => setSelectedShiftForDetails(null)}
                                                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-gray-700 cursor-pointer"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                        <p>
                                                            <span className="font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Cajero: ' : 'Cashier: '}</span>
                                                            {selectedShiftForDetails.usuarios 
                                                                ? `${selectedShiftForDetails.usuarios.nombre} ${selectedShiftForDetails.usuarios.apellido}` 
                                                                : (lang === 'es' ? 'Desconocido' : 'Unknown')}
                                                        </p>
                                                        <p>
                                                            <span className="font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Abierta: ' : 'Opened: '}</span>
                                                            {new Date(selectedShiftForDetails.opening_time).toLocaleString()}
                                                        </p>
                                                        {selectedShiftForDetails.closing_time && (
                                                            <p>
                                                                <span className="font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Cerrada: ' : 'Closed: '}</span>
                                                                {new Date(selectedShiftForDetails.closing_time).toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <h5 className="font-bold text-sm text-gray-900 dark:text-white">
                                                        {lang === 'es' ? 'Ingresos / Egresos Detalle' : 'Cash In / Out Adjustments'}
                                                    </h5>

                                                    <div className="max-h-60 overflow-y-auto border border-gray-100 dark:border-slate-800 rounded-xl divide-y divide-gray-100 dark:divide-slate-800">
                                                        {selectedShiftAdjustments.length === 0 ? (
                                                            <div className="p-8 text-center text-gray-400 text-xs font-medium">
                                                                {lang === 'es' ? 'Sin ajustes de efectivo registrados.' : 'No cash adjustments recorded.'}
                                                            </div>
                                                        ) : (
                                                            selectedShiftAdjustments.map(adj => (
                                                                <div key={adj.id} className="p-3 flex justify-between items-center text-xs">
                                                                    <div>
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase mr-2 ${
                                                                            adj.type === 'cash_in' 
                                                                                ? 'bg-blue-50 text-blue-700' 
                                                                                : 'bg-red-50 text-red-700'
                                                                        }`}>
                                                                            {adj.type === 'cash_in' ? (lang === 'es' ? 'Ingreso' : 'In') : (lang === 'es' ? 'Egreso' : 'Out')}
                                                                        </span>
                                                                        <span className="text-gray-500">
                                                                            {new Date(adj.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                        {adj.reason && (
                                                                            <p className="text-gray-400 mt-0.5 font-medium pl-1">
                                                                                {adj.reason}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <span className={`font-black ${adj.type === 'cash_in' ? 'text-blue-600' : 'text-red-600'}`}>
                                                                        {adj.type === 'cash_in' ? '+' : '-'}{fmtCurrency(adj.amount)}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-6 flex justify-end">
                                                    <button
                                                        onClick={() => setSelectedShiftForDetails(null)}
                                                        className="px-4 py-2 bg-gray-900 text-white font-bold rounded-xl text-xs hover:bg-gray-800 transition cursor-pointer"
                                                    >
                                                        {lang === 'es' ? 'Cerrar' : 'Close'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* ═══════════════════════════════════════ */}
                                    {/* ═══ SALES TAB (new) ═══════════════════ */}
                                    {/* ═══════════════════════════════════════ */}

                                    {/* ──── 1. KPI Summary Cards ──── */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {/* Revenue */}
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-2xl">💰</div>
                                                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-xs">{t('sales.kpi.revenue', lang)}</p>
                                            </div>
                                            <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{fmtCurrency(totalRevenue)}</p>
                                        </div>
                                        {/* Orders */}
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">📦</div>
                                                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-xs">{t('sales.kpi.orders', lang)}</p>
                                            </div>
                                            <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{totalOrderCount}</p>
                                        </div>
                                        {/* Avg Ticket */}
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-2xl">🎟️</div>
                                                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-xs">{t('sales.kpi.avg_ticket', lang)}</p>
                                            </div>
                                            <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{fmtCurrency(avgTicket)}</p>
                                        </div>
                                        {/* Void Rate */}
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-2xl">🚫</div>
                                                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-xs">{t('sales.kpi.void_rate', lang)}</p>
                                            </div>
                                            <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{voidRate.toFixed(1)}%</p>
                                            <p className="text-xs text-gray-400 mt-1 font-medium">{voidOrders.length} {t('sales.kpi.void_orders', lang)}</p>
                                        </div>
                                    </div>

                                    {/* ──── 2. Daily Revenue Bar Chart ──── */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('sales.daily.title', lang)}</h3>
                                        </div>
                                        <div className="p-6">
                                            {dailyData.length === 0 ? (
                                                <p className="text-center py-10 text-gray-400 font-medium">{t('sales.daily.no_data', lang)}</p>
                                            ) : (
                                                <div className="flex items-end gap-2" style={{ height: 220 }}>
                                                    {dailyData.map(([day, data], idx) => {
                                                        const pct = (data.revenue / maxDailyRevenue) * 100;
                                                        const dayLabel = new Date(day + 'T12:00:00').toLocaleDateString(lang === 'es' ? 'es-NI' : 'en-US', { weekday: 'short', day: 'numeric' });
                                                        const barColors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];
                                                        const color = barColors[idx % barColors.length];
                                                        return (
                                                            <div key={day} className="flex-1 flex flex-col items-center gap-1" style={{ minWidth: 0 }}>
                                                                <p className="text-xs font-black text-gray-600 dark:text-gray-300 truncate" title={fmtCurrency(data.revenue)}>{fmtCurrency(data.revenue)}</p>
                                                                <div
                                                                    className="w-full rounded-t-lg transition-all duration-500"
                                                                    style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: color, minHeight: 8 }}
                                                                    title={`${data.orders} orders`}
                                                                />
                                                                <p className="text-[10px] font-bold text-gray-400 mt-1 whitespace-nowrap">{dayLabel}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ──── 3 & 4. Payment Methods + Order Types (Side by Side) ──── */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Payment Methods */}
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                            <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('sales.payment.title', lang)}</h3>
                                            </div>
                                            <div className="p-6 space-y-4">
                                                {Object.keys(paymentMethodMap).length === 0 ? (
                                                    <p className="text-center py-6 text-gray-400 font-medium">{t('sales.payment.no_data', lang)}</p>
                                                ) : (
                                                    Object.entries(paymentMethodMap).sort(([,a], [,b]) => b - a).map(([method, amount]) => {
                                                        const pct = totalPaymentAmount > 0 ? (amount / totalPaymentAmount) * 100 : 0;
                                                        const color = paymentMethodColors[method] || '#6b7280';
                                                        const label = paymentMethodLabels[method] || method;
                                                        return (
                                                            <div key={method}>
                                                                <div className="flex justify-between items-center mb-1.5">
                                                                    <span className="font-bold text-gray-700 dark:text-gray-200 text-sm">{label}</span>
                                                                    <span className="font-black text-gray-900 dark:text-white text-sm">{fmtCurrency(amount)} <span className="text-gray-400 font-medium">({pct.toFixed(1)}%)</span></span>
                                                                </div>
                                                                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                                                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>

                                        {/* Order Types */}
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                            <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('sales.type.title', lang)}</h3>
                                            </div>
                                            <div className="p-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 text-center border-2 border-blue-100 dark:border-blue-800">
                                                        <p className="text-4xl mb-2">🍽️</p>
                                                        <p className="font-black text-2xl text-gray-900 dark:text-white">{dineInOrders.length}</p>
                                                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{t('sales.type.dine_in', lang)}</p>
                                                        <p className="text-xs text-gray-500 mt-1 font-medium">{fmtCurrency(dineInRevenue)}</p>
                                                    </div>
                                                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 text-center border-2 border-amber-100 dark:border-amber-800">
                                                        <p className="text-4xl mb-2">🛍️</p>
                                                        <p className="font-black text-2xl text-gray-900 dark:text-white">{takeOutOrders.length}</p>
                                                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{t('sales.type.take_out', lang)}</p>
                                                        <p className="text-xs text-gray-500 mt-1 font-medium">{fmtCurrency(takeOutRevenue)}</p>
                                                    </div>
                                                </div>
                                                {/* Donut-style visual indicator */}
                                                {totalOrderCount > 0 && (
                                                    <div className="mt-4 flex gap-2 items-center">
                                                        <div className="flex-1 h-4 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(dineInOrders.length / totalOrderCount) * 100}%` }} />
                                                            <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${(takeOutOrders.length / totalOrderCount) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ──── 5. Best Selling Products ──── */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('sales.products.title', lang)}</h3>
                                            <p className="text-xs text-gray-500 mt-1 font-medium">{t('sales.products.desc', lang)}</p>
                                        </div>
                                        <table className="w-full">
                                            <thead className="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                                <tr>
                                                    <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('sales.products.th_rank', lang)}</th>
                                                    <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('sales.products.th_product', lang)}</th>
                                                    <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('sales.products.th_qty', lang)}</th>
                                                    <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('sales.products.th_revenue', lang)}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                {topProducts.length === 0 ? (
                                                    <tr><td colSpan={4} className="text-center py-10 text-gray-400 font-medium">{t('sales.products.empty', lang)}</td></tr>
                                                ) : topProducts.map((p, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                                                        <td className="px-6 py-4">
                                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                                                                idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-100 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-gray-50 text-gray-500'
                                                            }`}>
                                                                {idx + 1}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{p.name}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-black px-3 py-1 rounded-full text-sm">{p.qty}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-bold text-gray-700 dark:text-gray-300">{fmtCurrency(p.revenue)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* ──── 6. Hourly Sales Heatmap ──── */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('sales.hourly.title', lang)}</h3>
                                            <p className="text-xs text-gray-500 mt-1 font-medium">{t('sales.hourly.desc', lang)}</p>
                                        </div>
                                        <div className="p-6">
                                            <div className="grid grid-cols-12 gap-1.5">
                                                {Array.from({ length: 24 }, (_, h) => {
                                                    const data = hourlyMap[h];
                                                    const intensity = data.orders / maxHourlyOrders;
                                                    const bgColor = data.orders === 0 ? '#f3f4f6' : `rgba(59, 130, 246, ${Math.max(0.15, intensity)})`;
                                                    const textColor = intensity > 0.5 ? 'white' : '#374151';
                                                    return (
                                                        <div
                                                            key={h}
                                                            className="rounded-xl p-2.5 text-center transition-all duration-300 hover:scale-105 cursor-default"
                                                            style={{ backgroundColor: bgColor }}
                                                            title={`${fmtCurrency(data.revenue)} — ${data.orders} ${t('sales.hourly.orders_label', lang)}`}
                                                        >
                                                            <p className="text-[10px] font-black" style={{ color: data.orders === 0 ? '#9ca3af' : textColor }}>{h.toString().padStart(2, '0')}:00</p>
                                                            <p className="text-lg font-black mt-0.5" style={{ color: data.orders === 0 ? '#d1d5db' : textColor }}>{data.orders}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ──── 7. Sales by Employee ──── */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('sales.employee.title', lang)}</h3>
                                            <p className="text-xs text-gray-500 mt-1 font-medium">{t('sales.employee.desc', lang)}</p>
                                        </div>
                                        <table className="w-full">
                                            <thead className="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                                <tr>
                                                    <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('sales.employee.th_employee', lang)}</th>
                                                    <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('sales.employee.th_orders', lang)}</th>
                                                    <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('sales.employee.th_revenue', lang)}</th>
                                                    <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{t('sales.employee.th_avg', lang)}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                {employeeSales.length === 0 ? (
                                                    <tr><td colSpan={4} className="text-center py-10 text-gray-400 font-medium">{t('sales.employee.empty', lang)}</td></tr>
                                                ) : employeeSales.map((emp, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-black text-sm">
                                                                    {emp.name.charAt(0)}
                                                                </div>
                                                                <span className="font-bold text-gray-900 dark:text-white">{emp.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-bold text-gray-600 dark:text-gray-400">{emp.orders}</td>
                                                        <td className="px-6 py-4 text-right font-black text-gray-900 dark:text-white">{fmtCurrency(emp.revenue)}</td>
                                                        <td className="px-6 py-4 text-right font-bold text-gray-500">{fmtCurrency(emp.orders > 0 ? emp.revenue / emp.orders : 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    );

}
