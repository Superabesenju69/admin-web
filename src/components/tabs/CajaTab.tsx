import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRole } from '../../utils/i18n';

interface CajaTabProps {
    supabase: any;
    currentUser: any;
    lang: string;
    fmtCurrency: (amount: number) => string;
}

export default function CajaTab({ supabase, currentUser, lang, fmtCurrency }: CajaTabProps) {
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedShift, setSelectedShift] = useState<any | null>(null);

    // Selected shift details
    const [shiftDetailsLoading, setShiftDetailsLoading] = useState(false);
    const [cashSales, setCashSales] = useState(0);
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [adjInTotal, setAdjInTotal] = useState(0);
    const [adjOutTotal, setAdjOutTotal] = useState(0);

    async function loadShifts() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('cash_shifts')
                .select(`
                    *,
                    usuarios:user_id (nombre, apellido, role)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setShifts(data || []);
            
            // Auto-select the first shift if none is selected
            if (data && data.length > 0 && !selectedShift) {
                setSelectedShift(data[0]);
            }
        } catch (err: any) {
            console.error('Error loading cash shifts:', err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadShiftDetails(shiftId: string) {
        setShiftDetailsLoading(true);
        try {
            // Get cash sales
            const { data: payments, error: payErr } = await supabase
                .from('payments')
                .select('amount')
                .eq('cash_shift_id', shiftId)
                .eq('method', 'cash');
            if (payErr) throw payErr;
            const sales = (payments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
            setCashSales(sales);

            // Get adjustments
            const { data: adjs, error: adjErr } = await supabase
                .from('cash_adjustments')
                .select('*')
                .eq('shift_id', shiftId)
                .order('created_at', { ascending: false });
            if (adjErr) throw adjErr;
            
            setAdjustments(adjs || []);
            const inSum = (adjs || []).filter((a: any) => a.type === 'cash_in').reduce((sum: number, a: any) => sum + Number(a.amount), 0);
            const outSum = (adjs || []).filter((a: any) => a.type === 'cash_out').reduce((sum: number, a: any) => sum + Number(a.amount), 0);
            setAdjInTotal(inSum);
            setAdjOutTotal(outSum);
        } catch (err: any) {
            console.error('Error loading shift details:', err.message);
        } finally {
            setShiftDetailsLoading(false);
        }
    }

    useEffect(() => {
        loadShifts();
    }, []);

    useEffect(() => {
        if (selectedShift) {
            loadShiftDetails(selectedShift.id);
        }
    }, [selectedShift]);

    const filteredShifts = shifts.filter(s => {
        const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
        const cashierName = `${s.usuarios?.nombre || ''} ${s.usuarios?.apellido || ''}`.toLowerCase();
        const matchesSearch = cashierName.includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Header section with info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <span>💵</span> {lang === 'es' ? 'Control y Turnos de Caja' : 'Cash Shift Control & Logs'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {lang === 'es' 
                            ? 'Monitoree los turnos de caja activos y cerrados del personal del POS. Las cajas se abren y cierran únicamente desde la app POS.'
                            : 'Monitor active and closed cash drawer shifts from POS staff. Cash registers can only be opened/closed from the POS app.'}
                    </p>
                </div>
                <button
                    onClick={loadShifts}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white rounded-xl text-sm font-bold transition flex items-center gap-2"
                >
                    🔄 {lang === 'es' ? 'Actualizar' : 'Refresh'}
                </button>
            </div>

            {/* Shift Logs & Details Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Side: Shift Logs List */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
                            {(['all', 'open', 'closed'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black capitalize transition-all ${
                                        filterStatus === status
                                            ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    {status === 'all' ? (lang === 'es' ? 'Todos' : 'All') : status === 'open' ? (lang === 'es' ? 'Activos' : 'Active') : (lang === 'es' ? 'Cerrados' : 'Closed')}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder={lang === 'es' ? 'Buscar por cajero...' : 'Search cashier...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    {/* Shifts Table */}
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredShifts.length === 0 ? (
                        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
                            <span className="text-4xl block mb-2">📁</span>
                            {lang === 'es' ? 'No se encontraron turnos de caja.' : 'No cash register shifts found.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-slate-800 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                        <th className="pb-3">{lang === 'es' ? 'Cajero / Usuario' : 'Cashier'}</th>
                                        <th className="pb-3">{lang === 'es' ? 'Estado' : 'Status'}</th>
                                        <th className="pb-3">{lang === 'es' ? 'Apertura' : 'Opened At'}</th>
                                        <th className="pb-3 text-right">{lang === 'es' ? 'Diferencia' : 'Difference'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {filteredShifts.map((shift) => {
                                        const isSelected = selectedShift?.id === shift.id;
                                        const cashierName = `${shift.usuarios?.nombre || 'POS'} ${shift.usuarios?.apellido || 'Staff'}`;
                                        
                                        return (
                                            <tr
                                                key={shift.id}
                                                onClick={() => setSelectedShift(shift)}
                                                className={`cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-slate-800/50 ${
                                                    isSelected ? 'bg-primary-50/50 dark:bg-primary-950/20 font-semibold' : ''
                                                }`}
                                            >
                                                <td className="py-3.5 pr-2">
                                                    <div className="font-bold text-gray-900 dark:text-white">{cashierName}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{formatRole(shift.usuarios?.role || 'cajero', lang)}</div>
                                                </td>
                                                <td className="py-3.5 pr-2">
                                                    {shift.status === 'open' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                            {lang === 'es' ? 'Abierta' : 'Open'}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400">
                                                            {lang === 'es' ? 'Cerrada' : 'Closed'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 pr-2 text-xs text-gray-600 dark:text-gray-400">
                                                    <div>{new Date(shift.opening_time).toLocaleDateString()}</div>
                                                    <div>{new Date(shift.opening_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </td>
                                                <td className="py-3.5 text-right font-black">
                                                    {shift.status === 'open' ? (
                                                        <span className="text-gray-400 font-medium">-</span>
                                                    ) : shift.difference > 0 ? (
                                                        <span className="text-green-600 dark:text-green-400">+{fmtCurrency(shift.difference)}</span>
                                                    ) : shift.difference < 0 ? (
                                                        <span className="text-red-600 dark:text-red-400">{fmtCurrency(shift.difference)}</span>
                                                    ) : (
                                                        <span className="text-gray-500 dark:text-gray-400">{fmtCurrency(0)}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right Side: Shift Details Monitoring Card */}
                <div className="lg:col-span-5">
                    <AnimatePresence mode="wait">
                        {selectedShift ? (
                            <motion.div
                                key={selectedShift.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-6"
                            >
                                {/* Header */}
                                <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                                {selectedShift.usuarios?.nombre || 'POS'} {selectedShift.usuarios?.apellido || 'Staff'}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                ID: {selectedShift.id.slice(0, 8)}...
                                            </p>
                                        </div>
                                        {selectedShift.status === 'open' ? (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                                                {lang === 'es' ? 'Turno Activo' : 'Active Shift'}
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400">
                                                {lang === 'es' ? 'Cerrado' : 'Closed'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Shift Summary Details */}
                                {shiftDetailsLoading ? (
                                    <div className="flex justify-center items-center py-20">
                                        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Status metrics grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl">
                                                <div className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">{lang === 'es' ? 'Efectivo Inicial' : 'Starting Cash'}</div>
                                                <div className="text-lg font-black text-gray-900 dark:text-white mt-1">
                                                    {fmtCurrency(selectedShift.starting_cash)}
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl">
                                                <div className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">{lang === 'es' ? 'Ventas en Efectivo' : 'Cash Sales'}</div>
                                                <div className="text-lg font-black text-green-600 dark:text-green-400 mt-1">
                                                    +{fmtCurrency(cashSales)}
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl">
                                                <div className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">{lang === 'es' ? 'Ingresos de Efectivo' : 'Cash In'}</div>
                                                <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">
                                                    +{fmtCurrency(adjInTotal)}
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl">
                                                <div className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">{lang === 'es' ? 'Retiros de Efectivo' : 'Cash Out'}</div>
                                                <div className="text-lg font-black text-red-600 dark:text-red-400 mt-1">
                                                    -{fmtCurrency(adjOutTotal)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Total expected vs actual */}
                                        <div className="border-t border-b border-gray-100 dark:border-slate-800 py-4 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400 font-medium">{lang === 'es' ? 'Efectivo Esperado' : 'Expected Cash'}</span>
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {fmtCurrency(Number(selectedShift.starting_cash) + cashSales + adjInTotal - adjOutTotal)}
                                                </span>
                                            </div>
                                            
                                            {selectedShift.status === 'closed' && (
                                                <>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400 font-medium">{lang === 'es' ? 'Arqueo Declarado' : 'Declared Cash'}</span>
                                                        <span className="font-black text-gray-900 dark:text-white">
                                                            {fmtCurrency(selectedShift.actual_cash)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm border-t border-dashed border-gray-100 dark:border-slate-800 pt-2 mt-2">
                                                        <span className="font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Diferencia' : 'Difference'}</span>
                                                        <span className={`font-black ${
                                                            selectedShift.difference > 0 ? 'text-green-600 dark:text-green-400' :
                                                            selectedShift.difference < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
                                                        }`}>
                                                            {selectedShift.difference > 0 ? '+' : ''}{fmtCurrency(selectedShift.difference)}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Cash Adjustments logs */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                                {lang === 'es' ? 'Historial de Movimientos de Caja' : 'Shift Cash Adjustments Logs'}
                                            </h4>
                                            {adjustments.length === 0 ? (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
                                                    {lang === 'es' ? 'No se registraron movimientos manuales.' : 'No manual movements recorded.'}
                                                </p>
                                            ) : (
                                                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                                                    {adjustments.map((a: any) => (
                                                        <div key={a.id} className="flex justify-between items-center text-xs p-2.5 bg-gray-50 dark:bg-slate-950 rounded-xl">
                                                            <div className="space-y-0.5">
                                                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                    a.type === 'cash_in'
                                                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                                                                        : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                                                                }`}>
                                                                    {a.type === 'cash_in' ? (lang === 'es' ? 'Ingreso' : 'In') : (lang === 'es' ? 'Retiro' : 'Out')}
                                                                </span>
                                                                <p className="text-gray-700 dark:text-gray-300 font-medium">{a.reason || (lang === 'es' ? 'Sin concepto' : 'No reason')}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-gray-900 dark:text-white">
                                                                    {a.type === 'cash_in' ? '+' : '-'}{fmtCurrency(a.amount)}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400">
                                                                    {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Notes and timing info */}
                                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2 border-t border-gray-100 dark:border-slate-800 pt-4">
                                            <div>
                                                <span className="font-bold text-gray-700 dark:text-gray-300">{lang === 'es' ? 'Apertura: ' : 'Opened At: '}</span>
                                                {new Date(selectedShift.opening_time).toLocaleString()}
                                            </div>
                                            {selectedShift.closing_time && (
                                                <div>
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">{lang === 'es' ? 'Cierre: ' : 'Closed At: '}</span>
                                                    {new Date(selectedShift.closing_time).toLocaleString()}
                                                </div>
                                            )}
                                            {selectedShift.notes && (
                                                <div className="bg-amber-50/55 dark:bg-slate-950 p-3 rounded-xl border border-amber-100 dark:border-slate-800 text-amber-800 dark:text-amber-400 mt-2 font-medium">
                                                    <div className="font-bold text-[10px] uppercase tracking-wider mb-1">{lang === 'es' ? 'Observaciones de Cierre:' : 'Closing Notes:'}</div>
                                                    {selectedShift.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm p-8 text-center text-gray-400 dark:text-gray-500">
                                <span className="text-4xl block mb-2">📊</span>
                                {lang === 'es' ? 'Seleccione un turno de la lista para ver su balance detallado.' : 'Select a cash shift from the list to view its detailed report.'}
                            </div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
}
