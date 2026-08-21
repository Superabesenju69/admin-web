import React, { useState, useEffect } from 'react';
import { generateExcelReport } from '../../utils/excelGenerator';

interface ExpensesTabProps {
    supabase: any;
    lang: string;
    fmtCurrency: (amount: number) => string;
}

export type ExpenseCategory = 'utilities' | 'rent' | 'transport' | 'maintenance' | 'marketing' | 'taxes' | 'other';
export type PaymentMethod = 'cash' | 'card' | 'bank_deposit';

export interface ExpenseItem {
    id?: string;
    tenant_id?: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
    payment_method: PaymentMethod;
    supplier?: string;
    expense_date: string;
    created_at?: string;
}

const CATEGORY_MAP: Record<ExpenseCategory, { es: string; en: string; icon: string; bg: string; text: string }> = {
    utilities: { es: 'Servicios Públicos (Agua/Luz/Internet/Gas)', en: 'Utilities (Water/Power/Internet/Gas)', icon: '💡', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' },
    rent: { es: 'Alquiler / Local', en: 'Rent / Real Estate', icon: '🏢', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400' },
    transport: { es: 'Transporte y Viáticos', en: 'Transport & Logistics', icon: '🚚', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400' },
    maintenance: { es: 'Mantenimiento y Reparaciones', en: 'Maintenance & Repairs', icon: '🛠️', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400' },
    marketing: { es: 'Publicidad y Mercadeo', en: 'Marketing & Ads', icon: '📢', bg: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-700 dark:text-pink-400' },
    taxes: { es: 'Impuestos y Tasas Municipales', en: 'Taxes & Gov Fees', icon: '🏛️', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400' },
    other: { es: 'Otros Gastos Operativos', en: 'Other Operating Expenses', icon: '📦', bg: 'bg-gray-50 dark:bg-slate-800', text: 'text-gray-700 dark:text-gray-300' },
};

const PAYMENT_METHOD_MAP: Record<PaymentMethod, { es: string; en: string }> = {
    cash: { es: '💵 Efectivo', en: '💵 Cash' },
    card: { es: '💳 Tarjeta', en: '💳 Card' },
    bank_deposit: { es: '🏦 Transferencia / Depósito', en: '🏦 Bank Transfer' },
};

export default function ExpensesTab({ supabase, lang, fmtCurrency }: ExpensesTabProps) {
    const isEs = lang === 'es';
    const [subTab, setSubTab] = useState<'expenses' | 'pnl' | 'taxes_contracts'>('expenses');
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');

    // Expense list & form states
    const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [showAddModal, setShowAddModal] = useState(false);

    // Form inputs
    const [formCategory, setFormCategory] = useState<ExpenseCategory>('utilities');
    const [formDescription, setFormDescription] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('cash');
    const [formSupplier, setFormSupplier] = useState('');
    const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    // P&L & Tax metric states
    const [ordersData, setOrdersData] = useState<any[]>([]);
    const [payrollEntries, setPayrollEntries] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [dateRange]);

    async function loadData() {
        setLoading(true);
        let start = new Date();
        start.setHours(0, 0, 0, 0);

        if (dateRange === 'week') {
            start.setDate(start.getDate() - 7);
        } else if (dateRange === 'month') {
            start.setMonth(start.getMonth() - 1);
        } else if (dateRange === 'all') {
            start = new Date('2020-01-01');
        }

        const startIso = start.toISOString();
        const startDateStr = start.toISOString().split('T')[0];

        try {
            const [expRes, ordRes, payRes, empRes, invRes] = await Promise.all([
                supabase.from('expenses').select('*').gte('expense_date', startDateStr).order('expense_date', { ascending: false }),
                supabase.from('orders').select('*').gte('created_at', startIso).eq('status', 'completed'),
                supabase.from('payroll_entries').select('*').gte('created_at', startIso),
                supabase.from('usuarios').select('*').order('nombre'),
                supabase.from('inventory_logs').select('*, items(cost_per_unit)').gte('created_at', startIso)
            ]);

            if (expRes.data) setExpenses(expRes.data);
            if (ordRes.data) setOrdersData(ordRes.data);
            if (payRes.data) setPayrollEntries(payRes.data);
            if (empRes.data) setEmployees(empRes.data);
            if (invRes.data) setInventoryLogs(invRes.data);
        } catch (err) {
            console.error('Failed to load expenses or financial data:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddExpense(e: React.FormEvent) {
        e.preventDefault();
        setFormError('');
        const numAmount = parseFloat(formAmount);

        if (!formDescription.trim()) {
            setFormError(isEs ? 'Ingrese una descripción del gasto.' : 'Please enter an expense description.');
            return;
        }
        if (isNaN(numAmount) || numAmount <= 0) {
            setFormError(isEs ? 'Ingrese un monto válido mayor a 0.' : 'Please enter a valid amount greater than 0.');
            return;
        }

        setSubmitting(true);
        try {
            const newExpense: ExpenseItem = {
                category: formCategory,
                description: formDescription.trim(),
                amount: numAmount,
                payment_method: formPaymentMethod,
                supplier: formSupplier.trim() || undefined,
                expense_date: formDate,
            };

            const { data, error } = await supabase.from('expenses').insert([newExpense]).select().single();

            if (error) throw error;

            if (data) {
                setExpenses(prev => [data, ...prev]);
            }
            setShowAddModal(false);
            setFormDescription('');
            setFormAmount('');
            setFormSupplier('');
        } catch (err: any) {
            setFormError(err.message || 'Error saving expense.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDeleteExpense(id: string) {
        if (!confirm(isEs ? '¿Está seguro de eliminar este gasto?' : 'Are you sure you want to delete this expense?')) {
            return;
        }

        try {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) throw error;
            setExpenses(prev => prev.filter(e => e.id !== id));
        } catch (err: any) {
            alert(err.message || 'Error deleting expense.');
        }
    }

    // Filtered expenses
    const filteredExpenses = expenses.filter(e => categoryFilter === 'all' || e.category === categoryFilter);
    const totalManualExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Financial Calculations
    const totalSales = ordersData.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalOperatingExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Cost of Goods Sold (Inventory consumed)
    const totalInventoryCost = inventoryLogs.reduce((sum, log) => {
        if (log.change_type === 'usage' || log.change_type === 'waste' || log.change_type === 'deduction') {
            const qty = Math.abs(Number(log.quantity_removed || log.quantity_changed || 0));
            const cost = Number(log.items?.cost_per_unit || 0);
            return sum + (qty * cost);
        }
        return sum;
    }, 0);

    // Payroll Liabilities & Employer Obligations
    const totalGrossPayroll = payrollEntries.reduce((sum, p) => sum + (Number(p.gross_salary) || 0), 0);
    const totalINSSPatronal = payrollEntries.reduce((sum, p) => sum + (Number(p.inss_patronal) || (Number(p.gross_salary) * 0.215)), 0);
    const totalINATEC = totalGrossPayroll * 0.02; // 2% INATEC
    const totalAguinaldoProv = payrollEntries.reduce((sum, p) => sum + (Number(p.aguinaldo_accrual) || (Number(p.gross_salary) * 0.0833)), 0);
    const totalVacationProv = payrollEntries.reduce((sum, p) => sum + (Number(p.vacation_accrual) || (Number(p.gross_salary) * 0.0833)), 0);

    const totalPayrollLiabilities = totalGrossPayroll + totalINSSPatronal + totalINATEC + totalAguinaldoProv + totalVacationProv;

    // Combined Liabilities
    const totalLiabilities = totalOperatingExpenses + totalInventoryCost + totalPayrollLiabilities;
    const netProfit = totalSales - totalLiabilities;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    // Taxes
    const salesTaxIVA = totalSales * 0.15; // 15% IVA

    return (
        <div className="max-w-7xl mx-auto px-10 py-10 space-y-8">
            {/* Header Title & Date Range selector Card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        💸 {isEs ? 'Gastos Operativos, Pasivos y Estado de Resultados' : 'Expenses, Liabilities & P&L Statement'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        {isEs ? 'Registre gastos manuales, consulte los pasivos consolidados y analice la ganancia neta con impuestos y cargas sociales.' : 'Log operational expenses, view consolidated liabilities, and analyze net profit with tax and labor obligations.'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{isEs ? 'Período:' : 'Period:'}</span>
                    <select
                        value={dateRange}
                        onChange={(e: any) => setDateRange(e.target.value)}
                        className="border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2 font-bold bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer text-sm"
                    >
                        <option value="today">{isEs ? 'Hoy' : 'Today'}</option>
                        <option value="week">{isEs ? 'Últimos 7 Días' : '7 Days'}</option>
                        <option value="month">{isEs ? 'Este Mes' : 'This Month'}</option>
                        <option value="all">{isEs ? 'Todo' : 'All'}</option>
                    </select>

                    <button
                        onClick={async () => {
                            const repType = subTab === 'expenses' ? 'expenses' : subTab === 'pnl' ? 'pnl' : 'payroll';
                            await generateExcelReport(supabase, repType, dateRange);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98"
                    >
                        📊 {isEs ? 'Exportar a Excel' : 'Export to Excel'}
                    </button>
                </div>
            </div>

            {/* Navigation Sub-Tab Pill Bar */}
            <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => setSubTab('expenses')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                        subTab === 'expenses'
                            ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                    📝 {isEs ? '1. Gastos Operativos (Manuales)' : '1. Manual Expenses'}
                    <span className="bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 text-xs px-2 py-0.5 rounded-full font-mono">{filteredExpenses.length}</span>
                </button>
                <button
                    onClick={() => setSubTab('pnl')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                        subTab === 'pnl'
                            ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                    📊 {isEs ? '2. Estado de Resultados (P&L)' : '2. P&L Financial Statement'}
                </button>
                <button
                    onClick={() => setSubTab('taxes_contracts')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                        subTab === 'taxes_contracts'
                            ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                    ⚖️ {isEs ? '3. Impuestos y Cargas por Contrato' : '3. Taxes & Contract Obligations'}
                </button>
            </div>

            {/* SUB-TAB 1: EXPENSES LOG & ENTRY */}
            {subTab === 'expenses' && (
                <div className="space-y-6">
                    {/* Controls & Filter Card */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{isEs ? 'Categoría:' : 'Category:'}</span>
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none cursor-pointer"
                            >
                                <option value="all">{isEs ? 'Todas las Categorías' : 'All Categories'}</option>
                                {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                                    <option key={key} value={key}>{val.icon} {isEs ? val.es : val.en}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-6 w-full sm:w-auto justify-end">
                            <div className="text-right">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">{isEs ? 'Total Gastos Registrados:' : 'Total Logged Expenses:'}</span>
                                <span className="text-xl font-black text-primary-600 dark:text-primary-400">{fmtCurrency(totalManualExpenses)}</span>
                            </div>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer flex items-center gap-2 active:scale-98"
                            >
                                ➕ {isEs ? 'Anotar Nuevo Gasto' : 'Log New Expense'}
                            </button>
                        </div>
                    </div>

                    {/* Table of expenses */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-12 flex justify-center"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                        ) : filteredExpenses.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 dark:text-gray-400 space-y-3">
                                <div className="text-5xl">🧾</div>
                                <p className="font-extrabold text-lg text-gray-900 dark:text-white">{isEs ? 'No hay gastos registrados en este período.' : 'No expenses logged for this period.'}</p>
                                <p className="text-xs text-gray-400">{isEs ? 'Presione "Anotar Nuevo Gasto" para registrar agua, luz, alquiler, transporte, etc.' : 'Click "Log New Expense" to record utilities, rent, transport, etc.'}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 text-gray-400 uppercase text-xs font-bold">
                                        <tr>
                                            <th className="p-4">{isEs ? 'Fecha' : 'Date'}</th>
                                            <th className="p-4">{isEs ? 'Categoría' : 'Category'}</th>
                                            <th className="p-4">{isEs ? 'Descripción' : 'Description'}</th>
                                            <th className="p-4">{isEs ? 'Proveedor / Emisor' : 'Supplier'}</th>
                                            <th className="p-4">{isEs ? 'Pago' : 'Payment'}</th>
                                            <th className="p-4 text-right">{isEs ? 'Monto' : 'Amount'}</th>
                                            <th className="p-4 text-center">{isEs ? 'Acciones' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                        {filteredExpenses.map((exp) => {
                                            const catInfo = CATEGORY_MAP[exp.category] || CATEGORY_MAP.other;
                                            const payInfo = PAYMENT_METHOD_MAP[exp.payment_method] || PAYMENT_METHOD_MAP.cash;

                                            return (
                                                <tr key={exp.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="p-4 font-mono font-medium text-gray-500 dark:text-gray-400">{exp.expense_date}</td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border border-gray-200/60 dark:border-slate-700/60 ${catInfo.bg} ${catInfo.text}`}>
                                                            <span>{catInfo.icon}</span>
                                                            <span>{isEs ? catInfo.es : catInfo.en}</span>
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-bold text-gray-900 dark:text-gray-100">{exp.description}</td>
                                                    <td className="p-4 text-gray-500 dark:text-gray-400">{exp.supplier || '—'}</td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-300 font-medium">{isEs ? payInfo.es : payInfo.en}</td>
                                                    <td className="p-4 text-right font-black text-gray-900 dark:text-white text-base">{fmtCurrency(Number(exp.amount))}</td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => exp.id && handleDeleteExpense(exp.id)}
                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                                                            title={isEs ? 'Eliminar' : 'Delete'}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SUB-TAB 2: P&L FINANCIAL STATEMENT */}
            {subTab === 'pnl' && (
                <div className="space-y-6">
                    {/* Top KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-5">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl font-black">📈</div>
                            <div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">{isEs ? 'Ventas Totales (Ingresos)' : 'Total Revenue (Sales)'}</span>
                                <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{fmtCurrency(totalSales)}</div>
                                <span className="text-xs text-gray-400 font-medium">{ordersData.length} {isEs ? 'órdenes completadas' : 'completed orders'}</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-5">
                            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-2xl font-black">💸</div>
                            <div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">{isEs ? 'Pasivos & Gastos Totales' : 'Total Expenses & Liabilities'}</span>
                                <div className="text-2xl font-black text-red-600 dark:text-red-400 tracking-tight">{fmtCurrency(totalLiabilities)}</div>
                                <span className="text-xs text-gray-400 font-medium">{isEs ? 'Gastos + Inventario + Nómina' : 'Operating + Inventory + Payroll'}</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-5">
                            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl font-black">💰</div>
                            <div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">{isEs ? 'Ganancia Neta (Utilidad)' : 'Net Profit'}</span>
                                <div className={`text-2xl font-black tracking-tight ${netProfit >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-red-600'}`}>
                                    {fmtCurrency(netProfit)}
                                </div>
                                <span className="text-xs text-gray-400 font-medium">{isEs ? 'Ventas - Pasivos Totales' : 'Revenue - Liabilities'}</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-5">
                            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-2xl font-black">📊</div>
                            <div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">{isEs ? 'Margen de Utilidad' : 'Profit Margin'}</span>
                                <div className={`text-2xl font-black tracking-tight ${profitMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                                    {profitMargin.toFixed(1)}%
                                </div>
                                <span className="text-xs text-gray-400 font-medium">{isEs ? 'Retorno sobre las ventas' : 'Return on sales %'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed P&L Breakdown Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                📋 {isEs ? 'Desglose Estructurado del Estado de Resultados' : 'P&L Detailed Breakdown Statement'}
                            </h3>
                        </div>

                        <div className="p-6 space-y-6 text-sm">
                            {/* Revenue section */}
                            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-slate-800">
                                <span className="font-extrabold text-gray-900 dark:text-white">1. {isEs ? 'VENTAS E INGRESOS OPERATIVOS' : 'TOTAL OPERATING REVENUE'}</span>
                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">{fmtCurrency(totalSales)}</span>
                            </div>

                            {/* Operating Expenses section */}
                            <div className="space-y-3 pl-4 border-l-4 border-amber-500">
                                <div className="flex justify-between items-center text-gray-800 dark:text-gray-200 font-bold">
                                    <span>2. {isEs ? 'GASTOS OPERATIVOS MANUALES (Agua, Luz, Alquiler, etc.)' : 'MANUAL OPERATING EXPENSES'}</span>
                                    <span className="text-amber-600 dark:text-amber-400 font-extrabold">{fmtCurrency(totalOperatingExpenses)}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400 pl-4 pt-1">
                                    {Object.entries(CATEGORY_MAP).map(([catKey, catVal]) => {
                                        const catSum = expenses.filter(e => e.category === catKey).reduce((s, e) => s + (Number(e.amount) || 0), 0);
                                        if (catSum === 0) return null;
                                        return (
                                            <div key={catKey} className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-1.5">
                                                <span>{catVal.icon} {isEs ? catVal.es : catVal.en}:</span>
                                                <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{fmtCurrency(catSum)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Inventory COGS section */}
                            <div className="space-y-2 pl-4 border-l-4 border-purple-500">
                                <div className="flex justify-between items-center text-gray-800 dark:text-gray-200 font-bold">
                                    <span>3. {isEs ? 'COSTO DE INVENTARIO E INSUMOS CONSUMIDOS (COGS)' : 'COST OF GOODS SOLD (COGS)'}</span>
                                    <span className="text-purple-600 dark:text-purple-400 font-extrabold">{fmtCurrency(totalInventoryCost)}</span>
                                </div>
                                <p className="text-xs text-gray-400">{isEs ? 'Materia prima consumida y mermas registradas en inventario.' : 'Raw materials consumed and waste logged.'}</p>
                            </div>

                            {/* Payroll liabilities section */}
                            <div className="space-y-3 pl-4 border-l-4 border-blue-500">
                                <div className="flex justify-between items-center text-gray-800 dark:text-gray-200 font-bold">
                                    <span>4. {isEs ? 'NÓMINA Y CARGAS PATRONALES CONSOLIDADAS' : 'PAYROLL & EMPLOYER OBLIGATIONS'}</span>
                                    <span className="text-blue-600 dark:text-blue-400 font-extrabold">{fmtCurrency(totalPayrollLiabilities)}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400 pl-4 pt-1">
                                    <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-1.5">
                                        <span>• {isEs ? 'Salarios Brutos' : 'Gross Salaries'}:</span>
                                        <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{fmtCurrency(totalGrossPayroll)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-1.5">
                                        <span>• {isEs ? 'INSS Patronal (21.5%)' : 'Employer INSS (21.5%)'}:</span>
                                        <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{fmtCurrency(totalINSSPatronal)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-1.5">
                                        <span>• {isEs ? 'INATEC (2%)' : 'INATEC (2%)'}:</span>
                                        <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{fmtCurrency(totalINATEC)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-1.5">
                                        <span>• {isEs ? 'Provisión Aguinaldo (8.33%)' : 'Aguinaldo Provision'}:</span>
                                        <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{fmtCurrency(totalAguinaldoProv)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-1.5">
                                        <span>• {isEs ? 'Provisión Vacaciones (8.33%)' : 'Vacation Provision'}:</span>
                                        <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{fmtCurrency(totalVacationProv)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Net result calculation */}
                            <div className="pt-6 border-t-2 border-gray-200 dark:border-slate-700 flex justify-between items-center text-lg">
                                <span className="font-black text-gray-900 dark:text-white">{isEs ? 'GANANCIA NETA DEL PERÍODO (Utilidad Neta):' : 'NET PERIOD PROFIT:'}</span>
                                <span className={`text-2xl font-black ${netProfit >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-red-600'}`}>
                                    {fmtCurrency(netProfit)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SUB-TAB 3: TAXES & WORKER CONTRACT OBLIGATIONS */}
            {subTab === 'taxes_contracts' && (
                <div className="space-y-6">
                    {/* Sales Tax (IVA) Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                    🏛️ {isEs ? 'Impuesto sobre Ventas (IVA 15%)' : 'Sales Tax Breakdown (15% VAT/IVA)'}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{isEs ? 'Estimación de impuestos generados por las ventas del período.' : 'Estimated sales tax generated during period.'}</p>
                            </div>
                            <span className="text-2xl font-black text-red-600 dark:text-red-400">{fmtCurrency(salesTaxIVA)}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                            <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                                <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">{isEs ? 'Ventas Totales Gravadas:' : 'Total Taxable Sales:'}</span>
                                <span className="text-base font-black text-gray-900 dark:text-white">{fmtCurrency(totalSales)}</span>
                            </div>

                            <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                                <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">{isEs ? 'Tasa de IVA Aplicada:' : 'Applied VAT Rate:'}</span>
                                <span className="text-base font-black text-gray-900 dark:text-white">15.0%</span>
                            </div>

                            <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                                <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">{isEs ? 'Monto Estimado a Declarar:' : 'Estimated Tax Payable:'}</span>
                                <span className="text-base font-black text-red-600 dark:text-red-400">{fmtCurrency(salesTaxIVA)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Worker Contract Obligations Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                👥 {isEs ? 'Desglose de Cargas Sociales y Costo por Empleado según Contrato' : 'Worker Contract & Employer Obligation Breakdown'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                {isEs ? 'Calcula las cargas sociales patronales (INSS 21.5%, INATEC 2%, Aguinaldo 8.33%, Vacaciones 8.33%) y retención IR profesional (10%) según cada trabajador.' : 'Calculates employer social security contributions and professional retentions for each staff contract.'}
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 text-gray-400 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="p-4">{isEs ? 'Trabajador / Rol' : 'Employee'}</th>
                                        <th className="p-4">{isEs ? 'Contrato' : 'Contract'}</th>
                                        <th className="p-4 text-right">{isEs ? 'Tarifa Bruta' : 'Base Rate'}</th>
                                        <th className="p-4 text-right">{isEs ? 'INSS Patronal (21.5%)' : 'Employer INSS'}</th>
                                        <th className="p-4 text-right">{isEs ? 'INATEC (2%)' : 'INATEC'}</th>
                                        <th className="p-4 text-right">{isEs ? 'Aguinaldo (8.33%)' : 'Aguinaldo'}</th>
                                        <th className="p-4 text-right">{isEs ? 'Vacaciones (8.33%)' : 'Vacation'}</th>
                                        <th className="p-4 text-right">{isEs ? 'Costo Real Empleador' : 'Total Employer Cost'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {employees.map((emp) => {
                                        const isLaboral = (emp.contract_type || 'laboral') === 'laboral';
                                        const rate = Number(emp.hourly_rate || 60);

                                        // Estimated monthly base (160h)
                                        const monthlyBase = rate * 160;

                                        const inssPatronal = isLaboral ? monthlyBase * 0.215 : 0;
                                        const inatec = isLaboral ? monthlyBase * 0.02 : 0;
                                        const aguinaldo = isLaboral ? monthlyBase * 0.0833 : 0;
                                        const vacaciones = isLaboral ? monthlyBase * 0.0833 : 0;

                                        const totalCost = monthlyBase + inssPatronal + inatec + aguinaldo + vacaciones;

                                        return (
                                            <tr key={emp.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4 font-bold text-gray-900 dark:text-gray-100">
                                                    <div>{emp.nombre} {emp.apellido}</div>
                                                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{emp.role}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                                                        isLaboral ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'
                                                    }`}>
                                                        {isLaboral ? (isEs ? 'Laboral (INSS 21.5%)' : 'Laboral') : (isEs ? 'Profesional (IR 10%)' : 'Professional')}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-mono font-medium text-gray-600 dark:text-gray-300">{fmtCurrency(monthlyBase)}/mes</td>
                                                <td className="p-4 text-right font-mono text-gray-500">{isLaboral ? fmtCurrency(inssPatronal) : 'C$0.00'}</td>
                                                <td className="p-4 text-right font-mono text-gray-500">{isLaboral ? fmtCurrency(inatec) : 'C$0.00'}</td>
                                                <td className="p-4 text-right font-mono text-gray-500">{isLaboral ? fmtCurrency(aguinaldo) : 'C$0.00'}</td>
                                                <td className="p-4 text-right font-mono text-gray-500">{isLaboral ? fmtCurrency(vacaciones) : 'C$0.00'}</td>
                                                <td className="p-4 text-right font-mono font-black text-primary-600 dark:text-primary-400 text-base">{fmtCurrency(totalCost)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD EXPENSE MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 w-full max-w-lg rounded-3xl p-8 space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
                            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                📝 {isEs ? 'Anotar Nuevo Gasto Operativo' : 'Log New Operational Expense'}
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg font-bold">✕</button>
                        </div>

                        {formError && (
                            <div className="p-4 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-xs rounded-2xl border border-red-100 dark:border-red-500/20 font-medium">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleAddExpense} className="space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{isEs ? 'Categoría de Gasto:' : 'Expense Category:'}</label>
                                <select
                                    value={formCategory}
                                    onChange={e => setFormCategory(e.target.value as ExpenseCategory)}
                                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none cursor-pointer"
                                >
                                    {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                                        <option key={key} value={key}>{val.icon} {isEs ? val.es : val.en}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{isEs ? 'Monto:' : 'Amount:'}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formAmount}
                                        onChange={e => setFormAmount(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-mono font-bold rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{isEs ? 'Fecha del Gasto:' : 'Expense Date:'}</label>
                                    <input
                                        type="date"
                                        value={formDate}
                                        onChange={e => setFormDate(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-semibold rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{isEs ? 'Descripción:' : 'Description:'}</label>
                                <input
                                    type="text"
                                    placeholder={isEs ? 'Ej: Pago de recibo de luz comercial del mes' : 'e.g., Commercial electricity bill payment'}
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-medium rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{isEs ? 'Método de Pago:' : 'Payment Method:'}</label>
                                    <select
                                        value={formPaymentMethod}
                                        onChange={e => setFormPaymentMethod(e.target.value as PaymentMethod)}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none cursor-pointer"
                                    >
                                        {Object.entries(PAYMENT_METHOD_MAP).map(([key, val]) => (
                                            <option key={key} value={key}>{isEs ? val.es : val.en}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{isEs ? 'Proveedor / Emisor (Opcional):' : 'Supplier (Optional):'}</label>
                                    <input
                                        type="text"
                                        placeholder={isEs ? 'Ej: Disnorte / Enacal' : 'e.g., Water Utility / Electric Co.'}
                                        value={formSupplier}
                                        onChange={e => setFormSupplier(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-medium rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                >
                                    {isEs ? 'Cancelar' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                                >
                                    {submitting ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Guardar Gasto' : 'Save Expense')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
