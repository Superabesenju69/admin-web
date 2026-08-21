import React, { useState, useEffect } from 'react';
import { t } from '../../utils/i18n';
import {
    calculateGrossSalary,
    calculateINSSLaboral,
    calculateINSSPatronal,
    calculateIRLaboral,
    calculateAguinaldoAccrual,
    calculateVacationAccrual,
    calculateNetSalary,
    calculateIRProfessional,
    DEFAULT_PAYROLL_SETTINGS,
    PayrollSettings
} from '../../utils/payrollCalculator';

interface PayrollTabProps {
    supabase: any;
    lang: string;
}

const ROLE_DEFAULT_RATES: Record<string, number> = {
    super_admin: 120.00,
    owner: 120.00,
    admin: 100.00,
    cajero: 70.00,
    mesero: 60.00,
    cocinero: 80.00,
    estacion: 50.00,
};

export default function PayrollTab({ supabase, lang }: PayrollTabProps) {
    const [activeSection, setActiveSection] = useState<'generate' | 'rules' | 'history'>('generate');
    const [settings, setSettings] = useState<PayrollSettings>(DEFAULT_PAYROLL_SETTINGS);
    const [settingsLoading, setSettingsLoading] = useState(true);

    // Generate section states
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    });
    const [employees, setEmployees] = useState<any[]>([]);
    const [previewEntries, setPreviewEntries] = useState<any[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [savingPayroll, setSavingPayroll] = useState(false);
    const [payrollError, setPayrollError] = useState('');
    const [payrollSuccess, setPayrollSuccess] = useState('');
    const [emailSending, setEmailSending] = useState(false);
    const [sentTestUrls, setSentTestUrls] = useState<Array<{ email: string; url: string }> | null>(null);

    // History section states
    const [periods, setPeriods] = useState<any[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null);
    const [periodEntries, setPeriodEntries] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Load Settings
    useEffect(() => {
        loadSettings();
        if (activeSection === 'history') {
            loadHistory();
        }
    }, [activeSection]);

    async function loadSettings() {
        setSettingsLoading(true);
        try {
            const { data } = await supabase.from('restaurant_settings').select('payroll_settings').limit(1).single();
            if (data?.payroll_settings) {
                setSettings(data.payroll_settings);
            }
        } catch (err) {
            console.error("Failed to load payroll settings, using defaults.", err);
        } finally {
            setSettingsLoading(false);
        }
    }

    async function saveSettings(e: React.FormEvent) {
        e.preventDefault();
        setSettingsLoading(true);
        try {
            const { error } = await supabase
                .from('restaurant_settings')
                .update({ payroll_settings: settings })
                .not('id', 'is', null);

            if (error) throw error;
            alert(lang === 'es' ? 'Configuraciones guardadas con éxito!' : 'Settings saved successfully!');
        } catch (err: any) {
            alert(err.message || "Failed to save settings.");
        } finally {
            setSettingsLoading(false);
        }
    }

    // Load history periods
    async function loadHistory() {
        setHistoryLoading(true);
        try {
            const { data } = await supabase.from('payroll_periods').select('*').order('start_date', { ascending: false });
            setPeriods(data || []);
        } catch (err) {
            console.error("Failed to load payroll history:", err);
        } finally {
            setHistoryLoading(false);
        }
    }

    async function viewPeriodDetails(period: any) {
        setSelectedPeriod(period);
        try {
            const { data } = await supabase
                .from('payroll_entries')
                .select('*, usuarios(nombre, apellido, role)')
                .eq('period_id', period.id);
            setPeriodEntries(data || []);
        } catch (err) {
            console.error("Failed to load period entries:", err);
        }
    }

    // Process Attendance and Calculate Preview
    async function calculatePreview() {
        setPreviewLoading(true);
        setPayrollError('');
        setPayrollSuccess('');
        try {
            // 1. Fetch active employees
            const { data: usersData, error: uErr } = await supabase
                .from('usuarios')
                .select('id, nombre, apellido, role, contract_type, hourly_rate')
                .eq('active', true);

            if (uErr) throw uErr;
            if (!usersData || usersData.length === 0) {
                setPayrollError(lang === 'es' ? 'No se encontraron empleados activos.' : 'No active employees found.');
                setPreviewLoading(false);
                return;
            }

            // 2. Fetch punches for date range
            const startStr = `${startDate}T00:00:00.000Z`;
            const endStr = `${endDate}T23:59:59.999Z`;
            const { data: punchesData, error: pErr } = await supabase
                .from('attendance_punches')
                .select('user_id, type, timestamp')
                .gte('timestamp', startStr)
                .lte('timestamp', endStr)
                .order('timestamp', { ascending: true });

            if (pErr) throw pErr;

            // 3. Compute hours per employee
            const previewRows = usersData.map((user: any) => {
                const userPunches = (punchesData || []).filter((p: any) => p.user_id === user.id);
                
                // Group punches by calendar date (YYYY-MM-DD in local time)
                const dailyPunches: Record<string, any[]> = {};
                userPunches.forEach((punch: any) => {
                    const localDateStr = punch.timestamp.split('T')[0]; // simple YYYY-MM-DD parser
                    if (!dailyPunches[localDateStr]) dailyPunches[localDateStr] = [];
                    dailyPunches[localDateStr].push(punch);
                });

                let totalOrdinary = 0;
                let totalOvertime = 0;

                // Loop through days to calculate hours + overtime
                Object.values(dailyPunches).forEach((punches) => {
                    let dayActiveMs = 0;
                    let lastInTime: number | null = null;
                    let lastBreakInTime: number | null = null;

                    punches.forEach((p) => {
                        const timeMs = new Date(p.timestamp).getTime();
                        if (p.type === 'clock_in') {
                            lastInTime = timeMs;
                        } else if (p.type === 'clock_out' && lastInTime) {
                            dayActiveMs += (timeMs - lastInTime);
                            lastInTime = null;
                        } else if ((p.type === 'break_start' || p.type === 'lunch_start') && lastInTime) {
                            lastBreakInTime = timeMs;
                        } else if ((p.type === 'break_end' || p.type === 'lunch_end') && lastBreakInTime && lastInTime) {
                            dayActiveMs -= (timeMs - lastBreakInTime);
                            lastBreakInTime = null;
                        }
                    });

                    const dayHours = Math.max(0, dayActiveMs / (1000 * 60 * 60));
                    const limit = settings.ordinary_daily_hours_limit || 8;
                    if (dayHours > limit) {
                        totalOrdinary += limit;
                        totalOvertime += (dayHours - limit);
                    } else {
                        totalOrdinary += dayHours;
                    }
                });

                // Round hours to 2 decimals
                const ordinary_hours = Number(totalOrdinary.toFixed(2));
                const overtime_hours = Number(totalOvertime.toFixed(2));
                const hourly_rate = user.hourly_rate && Number(user.hourly_rate) > 0 ? Number(user.hourly_rate) : (ROLE_DEFAULT_RATES[user.role] || 60.00);
                const contract_type = user.contract_type || 'laboral';

                // Apply Nicaraguan legal calculations
                const gross_salary = calculateGrossSalary(ordinary_hours, hourly_rate, overtime_hours, settings.overtime_multiplier);
                
                let inss_laboral = 0;
                let inss_patronal = 0;
                let ir_retention = 0;
                let aguinaldo_accrual = 0;
                let vacation_accrual = 0;

                if (contract_type === 'profesional') {
                    ir_retention = calculateIRProfessional(gross_salary, settings.professional_ir_retention_rate);
                } else {
                    inss_laboral = calculateINSSLaboral(gross_salary, settings.inss_laboral_rate);
                    inss_patronal = calculateINSSPatronal(gross_salary, settings.inss_patronal_rate);
                    const taxableBase = gross_salary - inss_laboral;
                    ir_retention = calculateIRLaboral(taxableBase, settings.enable_ir_tax_table);
                    aguinaldo_accrual = calculateAguinaldoAccrual(gross_salary, settings.aguinaldo_accrual_rate);
                    vacation_accrual = calculateVacationAccrual(gross_salary, settings.vacation_accrual_rate);
                }
                
                const net_salary = calculateNetSalary(gross_salary, inss_laboral, ir_retention, 0);

                return {
                    user_id: user.id,
                    nombre: user.nombre,
                    apellido: user.apellido,
                    role: user.role,
                    contract_type,
                    ordinary_hours,
                    overtime_hours,
                    hourly_rate,
                    gross_salary,
                    inss_laboral,
                    inss_patronal,
                    ir_retention,
                    aguinaldo_accrual,
                    vacation_accrual,
                    deductions: 0,
                    net_salary
                };
            });

            setPreviewEntries(previewRows);
        } catch (err: any) {
            setPayrollError(err.message || "Failed to calculate payroll preview.");
        } finally {
            setPreviewLoading(false);
        }
    }

    // Handle updates to hourly rates or deductions in preview table
    function handleRowChange(idx: number, field: string, value: any) {
        setPreviewEntries(prev => prev.map((row, i) => {
            if (i !== idx) return row;

            const updatedRow = { ...row, [field]: value };
            
            // Recalculate values
            const gross_salary = calculateGrossSalary(
                updatedRow.ordinary_hours,
                updatedRow.hourly_rate,
                updatedRow.overtime_hours,
                settings.overtime_multiplier
            );
            
            let inss_laboral = 0;
            let inss_patronal = 0;
            let ir_retention = 0;
            let aguinaldo_accrual = 0;
            let vacation_accrual = 0;

            if (updatedRow.contract_type === 'profesional') {
                ir_retention = calculateIRProfessional(gross_salary, settings.professional_ir_retention_rate);
            } else {
                inss_laboral = calculateINSSLaboral(gross_salary, settings.inss_laboral_rate);
                inss_patronal = calculateINSSPatronal(gross_salary, settings.inss_patronal_rate);
                const taxableBase = gross_salary - inss_laboral;
                ir_retention = calculateIRLaboral(taxableBase, settings.enable_ir_tax_table);
                aguinaldo_accrual = calculateAguinaldoAccrual(gross_salary, settings.aguinaldo_accrual_rate);
                vacation_accrual = calculateVacationAccrual(gross_salary, settings.vacation_accrual_rate);
            }
            
            const net_salary = calculateNetSalary(gross_salary, inss_laboral, ir_retention, Number(updatedRow.deductions || 0));

            return {
                ...updatedRow,
                gross_salary,
                inss_laboral,
                inss_patronal,
                ir_retention,
                aguinaldo_accrual,
                vacation_accrual,
                net_salary
            };
        }));
    }

    // Save Payroll run
    async function finalizePayroll() {
        if (previewEntries.length === 0) return;
        setSavingPayroll(true);
        setPayrollError('');
        setPayrollSuccess('');
        try {
            // 1. Create period record
            const { data: period, error: perErr } = await supabase
                .from('payroll_periods')
                .insert([{
                    start_date: startDate,
                    end_date: endDate,
                    status: 'paid'
                }])
                .select()
                .single();

            if (perErr) throw perErr;

            // 2. Map preview entries to DB entries
            const entriesToSave = previewEntries.map(e => ({
                period_id: period.id,
                user_id: e.user_id,
                contract_type: e.contract_type,
                ordinary_hours: e.ordinary_hours,
                overtime_hours: e.overtime_hours,
                hourly_rate: e.hourly_rate,
                gross_salary: e.gross_salary,
                inss_laboral: e.inss_laboral,
                inss_patronal: e.inss_patronal,
                ir_retention: e.ir_retention,
                aguinaldo_accrual: e.aguinaldo_accrual,
                vacation_accrual: e.vacation_accrual,
                deductions: e.deductions,
                net_salary: e.net_salary
            }));

            // 3. Save entries
            const { error: entErr } = await supabase.from('payroll_entries').insert(entriesToSave);
            if (entErr) throw entErr;

            setPreviewEntries([]);

            // 4. Send email payslips
            try {
                setSentTestUrls(null);
                const res = await fetch('/api/payroll/send-payslips', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ periodId: period.id })
                });
                const emailResult = await res.json();
                if (emailResult.success) {
                    setPayrollSuccess(
                        lang === 'es' 
                            ? `Nómina procesada con éxito. Boletas enviadas: ${emailResult.sentCount} enviadas, ${emailResult.skippedCount} omitidas (sin correo).`
                            : `Payroll processed and saved successfully. Payslips emailed: ${emailResult.sentCount} sent, ${emailResult.skippedCount} skipped (no email).`
                    );
                    if (emailResult.testUrls) {
                        setSentTestUrls(emailResult.testUrls);
                    }
                } else {
                    setPayrollSuccess(
                        lang === 'es'
                            ? 'Nómina procesada con éxito, pero falló el envío de boletas por correo.'
                            : 'Payroll processed successfully, but emailing payslips failed.'
                    );
                }
            } catch (emailErr) {
                console.error("Failed to trigger email sends:", emailErr);
                setPayrollSuccess(
                    lang === 'es'
                        ? 'Nómina procesada con éxito (error de red al enviar correos).'
                        : 'Payroll processed successfully (network error sending emails).'
                );
            }
        } catch (err: any) {
            setPayrollError(err.message || "Failed to finalize payroll.");
        } finally {
            setSavingPayroll(false);
        }
    }

    async function resendEmailsForPeriod(periodId: string) {
        setEmailSending(true);
        setSentTestUrls(null);
        try {
            const res = await fetch('/api/payroll/send-payslips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ periodId })
            });
            const data = await res.json();
            if (data.success) {
                alert(
                    lang === 'es'
                        ? `Boletas de pago enviadas con éxito. Enviadas: ${data.sentCount}, Omitidas: ${data.skippedCount}.`
                        : `Payslips emailed successfully. Sent: ${data.sentCount}, Skipped: ${data.skippedCount}.`
                );
                if (data.testUrls) {
                    setSentTestUrls(data.testUrls);
                }
            } else {
                alert(lang === 'es' ? `Error al enviar correos: ${data.error}` : `Error sending emails: ${data.error}`);
            }
        } catch (err: any) {
            alert(lang === 'es' ? `Error de red al enviar correos: ${err.message}` : `Network error sending emails: ${err.message}`);
        } finally {
            setEmailSending(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">
                    💰 {lang === 'es' ? 'Gestión de Nómina' : 'Payroll Management'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {lang === 'es'
                        ? 'Calcula salarios, retenciones del INSS, retenciones de IR y provisiones de ley de Nicaragua.'
                        : 'Calculate wages, INSS deductions, IR tax retentions, and legal provisions for Nicaragua.'}
                </p>
            </div>

            {/* Segment Selector */}
            <div className="flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                <button
                    onClick={() => setActiveSection('generate')}
                    className={`px-4 py-2 text-sm font-bold rounded-xl transition ${activeSection === 'generate' ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    {lang === 'es' ? 'Correr Nómina' : 'Run Payroll'}
                </button>
                <button
                    onClick={() => setActiveSection('rules')}
                    className={`px-4 py-2 text-sm font-bold rounded-xl transition ${activeSection === 'rules' ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    {lang === 'es' ? 'Configuración de Ley' : 'Legal Settings'}
                </button>
                <button
                    onClick={() => setActiveSection('history')}
                    className={`px-4 py-2 text-sm font-bold rounded-xl transition ${activeSection === 'history' ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    {lang === 'es' ? 'Historial de Pagos' : 'Payment History'}
                </button>
            </div>

            {/* Error & Success alerts */}
            {payrollError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {payrollError}
                </div>
            )}
            {payrollSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                    {payrollSuccess}
                </div>
            )}

            {sentTestUrls && sentTestUrls.length > 0 && (
                <div className="bg-primary-50 border border-primary-200 dark:bg-primary-950/20 dark:border-primary-900 rounded-2xl p-5 space-y-3">
                    <h4 className="font-bold text-primary-900 dark:text-primary-300 text-sm flex items-center gap-1.5">
                        🧪 {lang === 'es' ? 'Simulador de Correo Activo (Ethereal)' : 'Active Mail Simulator (Ethereal)'}
                    </h4>
                    <p className="text-xs text-primary-750 dark:text-primary-400">
                        {lang === 'es' 
                            ? 'Los correos de prueba han sido interceptados en un buzón de pruebas público. Haz clic en los enlaces a continuación para ver el diseño y contenido de cada boleta de pago:' 
                            : 'Test emails have been intercepted in a public sandbox. Click the links below to view the design and content of each payslip:'}
                    </p>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                        {sentTestUrls.map((item, idx) => (
                            <a 
                                key={idx} 
                                href={item.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center justify-between bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm hover:border-primary-400 dark:hover:border-primary-800 transition shadow-sm text-gray-700 dark:text-gray-300 font-medium"
                            >
                                <span className="flex items-center gap-2">
                                    📧 <span className="font-semibold text-gray-900 dark:text-gray-100">{item.email}</span>
                                </span>
                                <span className="text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline">
                                    {lang === 'es' ? 'Ver Boleta →' : 'View Payslip →'}
                                </span>
                            </a>
                        ))}
                    </div>
                    <button 
                        onClick={() => setSentTestUrls(null)} 
                        className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 pt-1 block"
                    >
                        {lang === 'es' ? 'Ocultar Enlaces' : 'Dismiss Links'}
                    </button>
                </div>
            )}

            {/* SECTION 1: RUN PAYROLL */}
            {activeSection === 'generate' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                            {lang === 'es' ? 'Seleccionar Período de Pago' : 'Select Pay Period'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                                    {lang === 'es' ? 'Fecha de Inicio' : 'Start Date'}
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm dark:bg-slate-950 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                                    {lang === 'es' ? 'Fecha de Fin' : 'End Date'}
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm dark:bg-slate-950 dark:text-white"
                                />
                            </div>
                            <button
                                onClick={calculatePreview}
                                disabled={previewLoading}
                                className="bg-primary-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-primary-700 transition"
                            >
                                {previewLoading
                                    ? (lang === 'es' ? 'Calculando...' : 'Calculating...')
                                    : (lang === 'es' ? 'Calcular Preliminar' : 'Calculate Preview')}
                            </button>
                        </div>
                    </div>

                    {previewEntries.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-gray-900 dark:text-gray-100 text-lg">
                                    {lang === 'es' ? 'Pre-nómina de Empleados' : 'Employee Pay Sheet'}
                                </h3>
                                <div className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg">
                                    ⚠️ {lang === 'es' ? 'Precios en Córdobas (C$)' : 'Rates in Córdobas (C$)'}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-slate-800">
                                        <tr>
                                            <th className="px-4 py-3">{lang === 'es' ? 'Empleado' : 'Employee'}</th>
                                            <th className="px-4 py-3">{lang === 'es' ? 'Rol' : 'Role'}</th>
                                            <th className="px-4 py-3">{lang === 'es' ? 'Contrato' : 'Contract'}</th>
                                            <th className="px-4 py-3 text-right">{lang === 'es' ? 'Horas Ord.' : 'Ord. Hrs'}</th>
                                            <th className="px-4 py-3 text-right">{lang === 'es' ? 'Horas Ext.' : 'Ovt. Hrs'}</th>
                                            <th className="px-4 py-3 text-right">{lang === 'es' ? 'Tarifa (C$/hr)' : 'Rate (C$/hr)'}</th>
                                            <th className="px-4 py-3 text-right">{lang === 'es' ? 'Bruto (C$)' : 'Gross (C$)'}</th>
                                            <th className="px-4 py-3 text-right">INSS (7%)</th>
                                            <th className="px-4 py-3 text-right">IR</th>
                                            <th className="px-4 py-3 text-right">{lang === 'es' ? 'Otros Desct.' : 'Deductions'}</th>
                                            <th className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">{lang === 'es' ? 'Neto (C$)' : 'Net (C$)'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                        {previewEntries.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-850">
                                                <td className="px-4 py-3.5 font-bold text-gray-900 dark:text-gray-100">
                                                    {row.nombre} {row.apellido}
                                                </td>
                                                <td className="px-4 py-3.5 text-xs font-semibold capitalize">
                                                    {row.role}
                                                </td>
                                                <td className="px-4 py-3.5 text-xs">
                                                    <select
                                                        value={row.contract_type}
                                                        onChange={e => handleRowChange(idx, 'contract_type', e.target.value)}
                                                        className="border border-gray-200 dark:border-slate-800 rounded px-1.5 py-1 text-xs dark:bg-slate-950 dark:text-white"
                                                    >
                                                        <option value="laboral">{lang === 'es' ? 'Laboral' : 'Laboral'}</option>
                                                        <option value="profesional">{lang === 'es' ? 'Profesional' : 'Professional'}</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-medium">{row.ordinary_hours}</td>
                                                <td className="px-4 py-3.5 text-right font-medium">{row.overtime_hours}</td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <input
                                                        type="number"
                                                        value={row.hourly_rate}
                                                        onChange={e => handleRowChange(idx, 'hourly_rate', Number(e.target.value))}
                                                        className="w-20 border border-gray-200 dark:border-slate-800 rounded px-2 py-1 text-right text-sm dark:bg-slate-950"
                                                    />
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-medium">C$ {row.gross_salary}</td>
                                                <td className="px-4 py-3.5 text-right text-red-600 font-medium">- C$ {row.inss_laboral}</td>
                                                <td className="px-4 py-3.5 text-right text-red-600 font-medium">- C$ {row.ir_retention}</td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <input
                                                        type="number"
                                                        value={row.deductions}
                                                        onChange={e => handleRowChange(idx, 'deductions', Number(e.target.value))}
                                                        className="w-20 border border-gray-200 dark:border-slate-800 rounded px-2 py-1 text-right text-sm dark:bg-slate-950 text-red-600 font-medium"
                                                    />
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-black text-gray-950 dark:text-white">
                                                    C$ {row.net_salary}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
                                <div className="text-sm text-gray-500">
                                    {lang === 'es' ? 'Total Empleados:' : 'Total Employees:'} <span className="font-bold text-gray-900 dark:text-gray-100">{previewEntries.length}</span>
                                </div>
                                <button
                                    onClick={finalizePayroll}
                                    disabled={savingPayroll}
                                    className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-700 transition text-sm shadow-sm"
                                >
                                    {savingPayroll
                                        ? (lang === 'es' ? 'Guardando...' : 'Saving...')
                                        : (lang === 'es' ? 'Aprobar y Pagar Nómina' : 'Approve & Pay Payroll')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SECTION 2: RULES SETTINGS */}
            {activeSection === 'rules' && (
                <form onSubmit={saveSettings} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                    <h3 className="font-black text-gray-900 dark:text-gray-100 text-lg">
                        {lang === 'es' ? 'Configuración de Parámetros de Ley (Nicaragua)' : 'Legal Rule Configuration (Nicaragua)'}
                    </h3>

                    {settingsLoading ? (
                        <div className="flex justify-center py-6">
                            <ActivityIndicator size="large" color="#0d9488" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                                    {lang === 'es' ? 'INSS Laboral (Tasa del Trabajador)' : 'Employee INSS Rate'}
                                </label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={settings.inss_laboral_rate}
                                    onChange={e => setSettings(prev => ({ ...prev, inss_laboral_rate: Number(e.target.value) }))}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm dark:bg-slate-950 dark:text-white"
                                />
                                <span className="text-xs text-gray-400 mt-1 block">{lang === 'es' ? 'Estándar: 0.07 (7.0%)' : 'Standard: 0.07 (7.0%)'}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                                    {lang === 'es' ? 'INSS Patronal (Tasa del Empleador)' : 'Employer INSS Rate'}
                                </label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={settings.inss_patronal_rate}
                                    onChange={e => setSettings(prev => ({ ...prev, inss_patronal_rate: Number(e.target.value) }))}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm dark:bg-slate-950 dark:text-white"
                                />
                                <span className="text-xs text-gray-400 mt-1 block">{lang === 'es' ? 'Estándar: 0.215 (21.5%) o 0.225 (22.5%)' : 'Standard: 0.215 (21.5%) or 0.225 (22.5%)'}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                                    {lang === 'es' ? 'Multiplicador de Horas Extras' : 'Overtime Multiplier'}
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={settings.overtime_multiplier}
                                    onChange={e => setSettings(prev => ({ ...prev, overtime_multiplier: Number(e.target.value) }))}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm dark:bg-slate-950 dark:text-white"
                                />
                                <span className="text-xs text-gray-400 mt-1 block">{lang === 'es' ? 'Estándar: 2.0 (Pago doble)' : 'Standard: 2.0 (Double pay)'}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                                    {lang === 'es' ? 'Límite de Horas Diarias Ordinarias' : 'Daily Ordinary Hours Limit'}
                                </label>
                                <input
                                    type="number"
                                    value={settings.ordinary_daily_hours_limit}
                                    onChange={e => setSettings(prev => ({ ...prev, ordinary_daily_hours_limit: Number(e.target.value) }))}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm dark:bg-slate-950 dark:text-white"
                                />
                                <span className="text-xs text-gray-400 mt-1 block">{lang === 'es' ? 'Estándar: 8 horas por día' : 'Standard: 8 hours per day'}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                                    {lang === 'es' ? 'Tasa de Provisión de Aguinaldo (13er Mes)' : '13th Month Provision Rate (Aguinaldo)'}
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={settings.aguinaldo_accrual_rate}
                                    onChange={e => setSettings(prev => ({ ...prev, aguinaldo_accrual_rate: Number(e.target.value) }))}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm dark:bg-slate-950 dark:text-white"
                                />
                                <span className="text-xs text-gray-400 mt-1 block">{lang === 'es' ? 'Estándar: 0.0833 (8.33% o 1/12)' : 'Standard: 0.0833 (8.33% or 1/12)'}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                                    {lang === 'es' ? 'Tasa de Provisión de Vacaciones' : 'Vacation Provision Rate'}
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={settings.vacation_accrual_rate}
                                    onChange={e => setSettings(prev => ({ ...prev, vacation_accrual_rate: Number(e.target.value) }))}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm dark:bg-slate-950 dark:text-white"
                                />
                                <span className="text-xs text-gray-400 mt-1 block">{lang === 'es' ? 'Estándar: 0.0833 (8.33% para 30 días anuales)' : 'Standard: 0.0833 (8.33% for 30 annual days)'}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                                    {lang === 'es' ? 'Retención IR Contrato Profesional' : 'Professional Contract Withholding Tax (IR)'}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.professional_ir_retention_rate}
                                    onChange={e => setSettings(prev => ({ ...prev, professional_ir_retention_rate: Number(e.target.value) }))}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm dark:bg-slate-950 dark:text-white"
                                />
                                <span className="text-xs text-gray-400 mt-1 block">{lang === 'es' ? 'Estándar Ley 822: 0.10 (10.0%)' : 'Standard Law 822: 0.10 (10.0%)'}</span>
                            </div>

                            <div className="md:col-span-2 flex items-center gap-3 py-2">
                                <input
                                    type="checkbox"
                                    id="enable_ir"
                                    checked={settings.enable_ir_tax_table}
                                    onChange={e => setSettings(prev => ({ ...prev, enable_ir_tax_table: e.target.checked }))}
                                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                                <label htmlFor="enable_ir" className="text-sm font-bold text-gray-750 dark:text-gray-300">
                                    {lang === 'es' ? 'Aplicar Tabla de Retenciones del Impuesto sobre la Renta (IR)' : 'Apply Income Tax (IR) Withholding Table'}
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-800">
                        <button
                            type="submit"
                            disabled={settingsLoading}
                            className="bg-primary-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary-700 transition text-sm shadow-sm"
                        >
                            {lang === 'es' ? 'Guardar Parámetros' : 'Save Rules'}
                        </button>
                    </div>
                </form>
            )}

            {/* SECTION 3: HISTORY LOGS */}
            {activeSection === 'history' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                            {lang === 'es' ? 'Períodos Cerrados' : 'Past Run Periods'}
                        </h3>
                        {historyLoading ? (
                            <div className="flex justify-center py-4">
                                <ActivityIndicator size="small" color="#0d9488" />
                            </div>
                        ) : periods.length === 0 ? (
                            <p className="text-sm text-gray-500">{lang === 'es' ? 'No hay períodos registrados.' : 'No periods recorded.'}</p>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-slate-800">
                                {periods.map((p, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => viewPeriodDetails(p)}
                                        className={`w-full text-left py-3 px-2 rounded-xl transition ${selectedPeriod?.id === p.id ? 'bg-primary-50 dark:bg-primary-950' : 'hover:bg-gray-50 dark:hover:bg-slate-850'}`}
                                    >
                                        <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                            📅 {p.start_date} {lang === 'es' ? 'al' : 'to'} {p.end_date}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 flex justify-between items-center">
                                            <span>{lang === 'es' ? 'Estado:' : 'Status:'} <span className="text-green-600 font-semibold">{p.status.toUpperCase()}</span></span>
                                            <span>{new Date(p.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                                {selectedPeriod
                                    ? (lang === 'es' ? `Detalles: Período ${selectedPeriod.start_date} al ${selectedPeriod.end_date}` : `Details: Period ${selectedPeriod.start_date} to ${selectedPeriod.end_date}`)
                                    : (lang === 'es' ? 'Selecciona un período de la lista' : 'Select a period from the list')}
                            </h3>
                            {selectedPeriod && (
                                <button
                                    onClick={() => resendEmailsForPeriod(selectedPeriod.id)}
                                    disabled={emailSending}
                                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {emailSending ? '✉️ ' + (lang === 'es' ? 'Enviando...' : 'Sending...') : '✉️ ' + (lang === 'es' ? 'Enviar Boletas por Correo' : 'Email Payslips')}
                                </button>
                            )}
                        </div>

                        {selectedPeriod && periodEntries.length > 0 ? (
                            <div className="space-y-6">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                                        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-slate-800">
                                            <tr>
                                                <th className="px-4 py-2">{lang === 'es' ? 'Empleado' : 'Employee'}</th>
                                                <th className="px-4 py-2 text-right">{lang === 'es' ? 'Horas' : 'Hours'}</th>
                                                <th className="px-4 py-2 text-right">{lang === 'es' ? 'Bruto' : 'Gross'}</th>
                                                <th className="px-4 py-2 text-right">INSS (7%)</th>
                                                <th className="px-4 py-2 text-right">IR</th>
                                                <th className="px-4 py-2 text-right">{lang === 'es' ? 'Deduct.' : 'Deduct.'}</th>
                                                <th className="px-4 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{lang === 'es' ? 'Neto' : 'Net'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                            {periodEntries.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-850">
                                                    <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-gray-100">
                                                        {row.usuarios?.nombre} {row.usuarios?.apellido}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-medium">
                                                        Ord: {row.ordinary_hours} / Ext: {row.overtime_hours}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">C$ {row.gross_salary}</td>
                                                    <td className="px-4 py-2.5 text-right text-red-600">- C$ {row.inss_laboral}</td>
                                                    <td className="px-4 py-2.5 text-right text-red-600">- C$ {row.ir_retention}</td>
                                                    <td className="px-4 py-2.5 text-right text-red-600">- C$ {row.deductions}</td>
                                                    <td className="px-4 py-2.5 text-right font-black text-gray-950 dark:text-white">
                                                        C$ {row.net_salary}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-850 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div>
                                        <div className="text-xs text-gray-500 font-bold uppercase">{lang === 'es' ? 'Costo Bruto Total' : 'Total Gross Cost'}</div>
                                        <div className="text-lg font-black text-gray-900 dark:text-gray-100 mt-1">
                                            C$ {periodEntries.reduce((acc, e) => acc + Number(e.gross_salary), 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 font-bold uppercase">{lang === 'es' ? 'Retención INSS Total' : 'Total INSS Held'}</div>
                                        <div className="text-lg font-black text-red-600 mt-1">
                                            C$ {periodEntries.reduce((acc, e) => acc + Number(e.inss_laboral), 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 font-bold uppercase">{lang === 'es' ? 'Gasto INSS Patronal' : 'Total Employer INSS'}</div>
                                        <div className="text-lg font-black text-amber-600 mt-1">
                                            C$ {periodEntries.reduce((acc, e) => acc + Number(e.inss_patronal), 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 font-bold uppercase">{lang === 'es' ? 'Neto Desembolsado' : 'Net Disbursed'}</div>
                                        <div className="text-lg font-black text-green-600 mt-1">
                                            C$ {periodEntries.reduce((acc, e) => acc + Number(e.net_salary), 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : selectedPeriod ? (
                            <p className="text-sm text-gray-500 mt-2">{lang === 'es' ? 'Cargando detalles de nómina...' : 'Loading payroll details...'}</p>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple React Native/Web compatibility wrapper loader
function ActivityIndicator({ size, color }: { size: 'small' | 'large'; color: string }) {
    const loaderSizeClass = size === 'large' ? 'w-10 h-10 border-4' : 'w-6 h-6 border-2';
    return (
        <div className="flex justify-center items-center">
            <div
                className={`${loaderSizeClass} rounded-full animate-spin border-t-transparent`}
                style={{ borderColor: `${color} transparent transparent ${color}` }}
            />
        </div>
    );
}
