import React, { useState, useEffect } from 'react';
import { formatRole } from '../../utils/i18n';

interface AttendanceTabProps {
    supabase: any;
    lang: string;
}

export default function AttendanceTab({ supabase, lang }: AttendanceTabProps) {
    const isEs = lang === 'es';
    const [subTab, setSubTab] = useState<'tracker' | 'logs' | 'schedules' | 'leaves' | 'reports' | 'settings'>('tracker');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Core state
    const [staffList, setStaffList] = useState<any[]>([]);
    const [punches, setPunches] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);

    // Attendance Settings state
    const [attendanceSettings, setAttendanceSettings] = useState({
        enable_breaks: true,
        enable_break_deductions: true,
        standard_break_duration: 15,
        standard_lunch_duration: 30
    });

    // Weekly Schedule Plotter States
    const [showPlotModal, setShowPlotModal] = useState(false);
    const [plotUserId, setPlotUserId] = useState('');
    const [plotDays, setPlotDays] = useState<number[]>([]);
    const [plotStartTime, setPlotStartTime] = useState('08:00');
    const [plotEndTime, setPlotEndTime] = useState('17:00');
    const [plotEditingScheduleId, setPlotEditingScheduleId] = useState<string | null>(null);

    // Filters for logs & reports
    const [logEmployeeFilter, setLogEmployeeFilter] = useState('');
    const [logDateFilter, setLogDateFilter] = useState('');
    
    // Reports date range
    const [reportStartDate, setReportStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Modals & form states
    const [showAddPunch, setShowAddPunch] = useState(false);
    const [newPunchUserId, setNewPunchUserId] = useState('');
    const [newPunchType, setNewPunchType] = useState('clock_in');
    const [newPunchTime, setNewPunchTime] = useState('');
    const [newPunchDate, setNewPunchDate] = useState('');
    const [newPunchNotes, setNewPunchNotes] = useState('');

    const [editingScheduleUserId, setEditingScheduleUserId] = useState<string | null>(null);
    const [scheduleForms, setScheduleForms] = useState<Record<number, { start_time: string; end_time: string; enabled: boolean }>>({});

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        setLoading(true);
        try {
            // Load employees list from public.usuarios
            const { data: users } = await supabase.from('usuarios').select('*').order('nombre');
            setStaffList(users || []);

            // Try loading punches, schedules, and time off leaves
            const { data: punchesData, error: punchesErr } = await supabase.from('attendance_punches').select('*').order('timestamp', { ascending: false });
            if (!punchesErr) setPunches(punchesData || []);

            const { data: schedulesData } = await supabase.from('attendance_schedules').select('*');
            setSchedules(schedulesData || []);

            const { data: leavesData } = await supabase.from('attendance_time_off').select('*').order('start_date', { ascending: false });
            setLeaveRequests(leavesData || []);

            // Load settings
            const { data: settingsData } = await supabase.from('restaurant_settings').select('attendance_settings').limit(1);
            if (settingsData && settingsData.length > 0 && settingsData[0].attendance_settings) {
                setAttendanceSettings(settingsData[0].attendance_settings);
            }
        } catch (e) {
            console.error('Failed to load attendance datasets:', e);
        }
        setLoading(false);
    }

    // Helper: translate punch types beautifully
    function getPunchTypeLabel(type: string) {
        switch (type) {
            case 'clock_in': return isEs ? 'Entrada' : 'Clock In';
            case 'clock_out': return isEs ? 'Salida' : 'Clock Out';
            case 'break_start': return isEs ? 'Inicio Receso' : 'Start Break';
            case 'break_end': return isEs ? 'Fin Receso' : 'End Break';
            case 'lunch_start': return isEs ? 'Inicio Almuerzo' : 'Start Lunch';
            case 'lunch_end': return isEs ? 'Fin Almuerzo' : 'End Lunch';
            default: return type;
        }
    }

    // Helper: HSL badges for punches
    function getPunchTypeStyle(type: string) {
        switch (type) {
            case 'clock_in': return 'bg-green-50 text-green-700 border-green-200';
            case 'clock_out': return 'bg-gray-100 text-gray-700 border-gray-300';
            case 'break_start': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'break_end': return 'bg-amber-100 text-amber-800 border-amber-300';
            case 'lunch_start': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'lunch_end': return 'bg-blue-100 text-blue-800 border-blue-300';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    }

    // Helper: format dynamic elapsed duration in tracker
    function getLiveStatus(userId: string) {
        // Filter punches for today for this specific user
        const todayStr = new Date().toISOString().split('T')[0];
        const userPunches = punches
            .filter(p => p.user_id === userId && p.timestamp.startsWith(todayStr))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        if (userPunches.length === 0) {
            return { label: isEs ? 'Fuera de Turno' : 'Clocked Out', color: 'bg-gray-100 text-gray-400 border-gray-200', active: false };
        }

        const lastPunch = userPunches[userPunches.length - 1];
        const timeStr = new Date(lastPunch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (lastPunch.type === 'clock_in' || lastPunch.type === 'break_end' || lastPunch.type === 'lunch_end') {
            return { label: `${isEs ? 'Trabajando' : 'Clocked In'} (${timeStr})`, color: 'bg-green-50 text-green-700 border-green-200 ring-2 ring-green-100 animate-pulse', active: true };
        } else if (lastPunch.type === 'break_start') {
            return { label: `${isEs ? 'En Receso' : 'On Break'} (${timeStr})`, color: 'bg-amber-50 text-amber-700 border-amber-200 ring-2 ring-amber-100', active: true };
        } else if (lastPunch.type === 'lunch_start') {
            return { label: `${isEs ? 'Almuerzo' : 'On Lunch'} (${timeStr})`, color: 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-100', active: true };
        } else {
            return { label: `${isEs ? 'Salida Registrada' : 'Clocked Out'} (${timeStr})`, color: 'bg-gray-100 text-gray-400 border-gray-200', active: false };
        }
    }

    // Action: create a manual punch overrides
    async function handleAddPunch() {
        if (!newPunchUserId || !newPunchTime || !newPunchDate) {
            alert(isEs ? 'Por favor complete la fecha, hora y seleccione un empleado.' : 'Please fill date, time and choose staff.');
            return;
        }
        setSaving(true);
        try {
            const timestamp = new Date(`${newPunchDate}T${newPunchTime}:00`).toISOString();
            const { error } = await supabase.from('attendance_punches').insert([{
                user_id: newPunchUserId,
                type: newPunchType,
                timestamp,
                notes: newPunchNotes.trim() || (isEs ? 'Registro manual agregado por administrador' : 'Manual punch added by manager')
            }]);

            if (error) {
                alert(`Error: ${error.message}`);
            } else {
                setShowAddPunch(false);
                setNewPunchUserId(''); setNewPunchNotes('');
                await loadInitialData();
            }
        } catch (e: any) {
            alert(e.message);
        }
        setSaving(false);
    }

    // Action: delete punch log item
    async function handleDeletePunch(id: string) {
        if (!confirm(isEs ? '¿Eliminar este registro de asistencia?' : 'Delete this attendance punch permanently?')) return;
        const { error } = await supabase.from('attendance_punches').delete().eq('id', id);
        if (error) {
            alert(error.message);
        } else {
            setPunches(prev => prev.filter(p => p.id !== id));
        }
    }

    // Action: open shift scheduling forms for a user
    function startEditSchedule(user: any) {
        setEditingScheduleUserId(user.id);
        const userSchedules = schedules.filter(s => s.user_id === user.id);
        const forms: Record<number, { start_time: string; end_time: string; enabled: boolean }> = {};
        for (let d = 0; d <= 6; d++) {
            const existing = userSchedules.find(s => s.day_of_week === d);
            forms[d] = {
                start_time: existing ? existing.start_time.slice(0, 5) : '08:00',
                end_time: existing ? existing.end_time.slice(0, 5) : '17:00',
                enabled: !!existing
            };
        }
        setScheduleForms(forms);
    }

    // Action: save shift schedules updates
    async function saveSchedules() {
        if (!editingScheduleUserId) return;
        setSaving(true);
        try {
            // Delete existing schedules first
            await supabase.from('attendance_schedules').delete().eq('user_id', editingScheduleUserId);

            const inserts = Object.entries(scheduleForms)
                .filter(([_, value]) => value.enabled)
                .map(([day, value]) => ({
                    user_id: editingScheduleUserId,
                    day_of_week: parseInt(day),
                    start_time: `${value.start_time}:00`,
                    end_time: `${value.end_time}:00`
                }));

            if (inserts.length > 0) {
                const { error } = await supabase.from('attendance_schedules').insert(inserts);
                if (error) throw error;
            }

            setEditingScheduleUserId(null);
            await loadInitialData();
            alert(isEs ? 'Horarios actualizados exitosamente!' : 'Weekly shift schedules saved successfully!');
        } catch (e: any) {
            alert(e.message);
        }
        setSaving(false);
    }

    // Action: Save custom break and lunch settings to Supabase
    async function saveAttendanceSettings(updatedSettings: any) {
        setSaving(true);
        try {
            const { error } = await supabase.from('restaurant_settings')
                .update({ attendance_settings: updatedSettings })
                .not('id', 'is', null);

            if (error) {
                alert(`Error saving settings: ${error.message}`);
            } else {
                setAttendanceSettings(updatedSettings);
                alert(isEs ? 'Configuración de asistencia y recesos guardada correctamente!' : 'Break and attendance settings saved successfully!');
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
        setSaving(false);
    }

    // Action: Delete a single shift from the weekly schedules grid
    async function handleDeleteSchedule(id: string) {
        if (!confirm(isEs ? '¿Está seguro de eliminar este turno?' : 'Are you sure you want to delete this shift?')) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('attendance_schedules').delete().eq('id', id);
            if (error) {
                alert(`Error: ${error.message}`);
            } else {
                await loadInitialData();
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
        setSaving(false);
    }

    // Action: Plot / assign shifts in batch across multiple days
    async function handleSavePlotSchedule() {
        if (!plotUserId) {
            alert(isEs ? 'Debe seleccionar un empleado.' : 'Please select an employee.');
            return;
        }
        if (plotDays.length === 0) {
            alert(isEs ? 'Debe seleccionar al menos un día de la semana.' : 'Please select at least one day.');
            return;
        }
        setSaving(true);
        try {
            // Remove existing schedules for this user on the selected days of the week to prevent conflict
            const { error: delErr } = await supabase
                .from('attendance_schedules')
                .delete()
                .eq('user_id', plotUserId)
                .in('day_of_week', plotDays);

            if (delErr) throw delErr;

            // Prepare shifts batch insert
            const inserts = plotDays.map(day => ({
                user_id: plotUserId,
                day_of_week: day,
                start_time: `${plotStartTime}:00`,
                end_time: `${plotEndTime}:00`
            }));

            const { error: insErr } = await supabase
                .from('attendance_schedules')
                .insert(inserts);

            if (insErr) throw insErr;

            // Reset forms and load latest data
            setShowPlotModal(false);
            setPlotUserId('');
            setPlotDays([]);
            setPlotStartTime('08:00');
            setPlotEndTime('17:00');
            setPlotEditingScheduleId(null);
            
            await loadInitialData();
            alert(isEs ? 'Turnos planificados correctamente!' : 'Shifts successfully planned!');
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
        setSaving(false);
    }

    // Action: approve or reject time off leaves
    async function handleLeaveStatus(id: string, status: 'approved' | 'rejected') {
        setSaving(true);
        const { error } = await supabase.from('attendance_time_off').update({ status }).eq('id', id);
        if (error) {
            alert(error.message);
        } else {
            setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        }
        setSaving(false);
    }

    // Report Logic: Aggregate hours, deductions, late arrivals, and time off
    const payrollReport = React.useMemo(() => {
        if (staffList.length === 0) return [];

        const startMs = new Date(reportStartDate + 'T00:00:00').getTime();
        const endMs = new Date(reportEndDate + 'T23:59:59').getTime();

        return staffList.map(employee => {
            const empPunches = punches
                .filter(p => p.user_id === employee.id)
                .map(p => ({ ...p, timeMs: new Date(p.timestamp).getTime() }))
                .filter(p => p.timeMs >= startMs && p.timeMs <= endMs)
                .sort((a, b) => a.timeMs - b.timeMs);

            const empSchedules = schedules.filter(s => s.user_id === employee.id);
            const empLeaves = leaveRequests.filter(l => l.user_id === employee.id && l.status === 'approved');

            // Time off calculations
            let vacationHours = 0;
            let sickHours = 0;
            empLeaves.forEach(l => {
                const lStart = new Date(l.start_date).getTime();
                const lEnd = new Date(l.end_date).getTime();
                if (lStart >= startMs && lEnd <= endMs) {
                    if (l.type === 'vacation') vacationHours += parseFloat(l.hours || 0);
                    if (l.type === 'sick') sickHours += parseFloat(l.hours || 0);
                }
            });

            // Punch analysis logic grouped by date
            const punchesByDate: Record<string, typeof empPunches> = {};
            empPunches.forEach(p => {
                const date = p.timestamp.split('T')[0];
                if (!punchesByDate[date]) punchesByDate[date] = [];
                punchesByDate[date].push(p);
            });

            let totalRegularHours = 0;
            let totalBreakDeductions = 0;
            let totalLunchDeductions = 0;
            let lateEntrances = 0;
            let earlyOuts = 0;

            Object.entries(punchesByDate).forEach(([dateStr, dayPunches]) => {
                // Determine day schedule
                const dateObj = new Date(dateStr + 'T00:00:00');
                const dayOfWeek = dateObj.getDay();
                const daySchedule = empSchedules.find(s => s.day_of_week === dayOfWeek);

                // Identify shift start, ends, breaks, and lunches
                let clockIn: number | null = null;
                let clockOut: number | null = null;
                
                let breakStart: number | null = null;
                let breakEnd: number | null = null;
                let breakOverageMs = 0;

                let lunchStart: number | null = null;
                let lunchEnd: number | null = null;
                let lunchOverageMs = 0;

                dayPunches.forEach(p => {
                    if (p.type === 'clock_in') clockIn = p.timeMs;
                    if (p.type === 'clock_out') clockOut = p.timeMs;
                    if (p.type === 'break_start') breakStart = p.timeMs;
                    if (p.type === 'break_end') breakEnd = p.timeMs;
                    if (p.type === 'lunch_start') lunchStart = p.timeMs;
                    if (p.type === 'lunch_end') lunchEnd = p.timeMs;
                });

                // Calculate late arrivals
                if (clockIn && daySchedule) {
                    const schedStartParts = daySchedule.start_time.split(':');
                    const schedStartMs = new Date(dateStr + `T${schedStartParts[0]}:${schedStartParts[1]}:00`).getTime();
                    // 5-minute grace period allowed
                    if (clockIn > schedStartMs + 5 * 60 * 1000) {
                        lateEntrances += 1;
                    }
                }

                // Calculate early departures
                if (clockOut && daySchedule) {
                    const schedEndParts = daySchedule.end_time.split(':');
                    const schedEndMs = new Date(dateStr + `T${schedEndParts[0]}:${schedEndParts[1]}:00`).getTime();
                    if (clockOut < schedEndMs) {
                        earlyOuts += 1;
                    }
                }

                // Calculate break deduction (Max paid break duration configured by owner)
                if (attendanceSettings.enable_breaks && breakStart && breakEnd) {
                    const breakDuration = breakEnd - breakStart;
                    const maxAllowed = (attendanceSettings.standard_break_duration || 15) * 60 * 1000;
                    if (attendanceSettings.enable_break_deductions && breakDuration > maxAllowed) {
                        breakOverageMs += (breakDuration - maxAllowed);
                    }
                }

                // Calculate lunch deduction (Max paid lunch duration configured by owner)
                if (lunchStart && lunchEnd) {
                    const lunchDuration = lunchEnd - lunchStart;
                    const maxAllowed = (attendanceSettings.standard_lunch_duration || 30) * 60 * 1000;
                    if (lunchDuration > maxAllowed) {
                        lunchOverageMs += (lunchDuration - maxAllowed);
                    }
                }

                // Calculate shift active working hours
                if (clockIn && clockOut) {
                    const elapsedMs = clockOut - clockIn;
                    // Subtract dynamic break and lunch overages from hours
                    const activeMs = Math.max(0, elapsedMs - breakOverageMs - lunchOverageMs);
                    totalRegularHours += (activeMs / (1000 * 60 * 60));
                }

                totalBreakDeductions += (breakOverageMs / (1000 * 60 * 60));
                totalLunchDeductions += (lunchOverageMs / (1000 * 60 * 60));
            });

            const totalPayableHours = Math.max(0, totalRegularHours + vacationHours + sickHours);

            return {
                id: employee.id,
                name: `${employee.nombre} ${employee.apellido}`,
                role: employee.role,
                regularHours: totalRegularHours,
                breakDeductions: totalBreakDeductions,
                lunchDeductions: totalLunchDeductions,
                lateEntrances,
                earlyOuts,
                vacationHours,
                sickHours,
                payableHours: totalPayableHours
            };
        });
    }, [staffList, punches, schedules, leaveRequests, reportStartDate, reportEndDate]);

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{isEs ? 'Asistencia y Control de Tiempos' : 'Time Clock & Attendance Tracker'}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{isEs ? 'Control de marcaciones, horarios de turnos, deducciones y solicitudes de permisos.' : 'Monitor staff punches, break deductions, weekly schedules, and sick/vacation approvals.'}</p>
                </div>
                <button onClick={() => setShowAddPunch(true)} className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-700 transition shadow-sm">
                    ⏰ {isEs ? 'Agregar Marcación' : 'Add Manual Punch'}
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-slate-800 pb-3">
                {(['tracker', 'logs', 'schedules', 'leaves', 'reports', 'settings'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setSubTab(t)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${subTab === t ? 'bg-primary-600 text-white shadow' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-900 hover:text-gray-900'}`}
                    >
                        {t === 'tracker' && `🟢 ${isEs ? 'Tracker Activo' : 'Live Tracker'}`}
                        {t === 'logs' && `📋 ${isEs ? 'Bitácora Logs' : 'Timesheets'}`}
                        {t === 'schedules' && `🗓️ ${isEs ? 'Planificador Semanal' : 'Schedule Grid'}`}
                        {t === 'leaves' && `✈️ ${isEs ? 'Permisos' : 'Leave Requests'}`}
                        {t === 'reports' && `📈 ${isEs ? 'Reporte Payroll' : 'Payroll Reports'}`}
                        {t === 'settings' && `⚙️ ${isEs ? 'Configuración' : 'Break Settings'}`}
                    </button>
                ))}
            </div>

            {/* Loading Indicator */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* PANEL 1: LIVE TRACKER */}
                    {subTab === 'tracker' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {staffList.map(employee => {
                                const status = getLiveStatus(employee.id);
                                return (
                                    <div key={employee.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:scale-[1.01] hover:shadow transition-all duration-300">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-lg uppercase shadow-sm">
                                                {employee.nombre.charAt(0)}{employee.apellido.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-gray-900 dark:text-gray-100">{employee.nombre} {employee.apellido}</h4>
                                                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">{formatRole(employee.role, lang)}</p>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between">
                                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${status.color}`}>
                                                {status.label}
                                            </span>
                                            {status.active && (
                                                <span className="flex h-3 w-3 relative">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* PANEL 2: TIMESHEETS & PUNCHES LOGS */}
                    {subTab === 'logs' && (
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                            {/* Filter Bar */}
                            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex gap-4 bg-gray-50/50">
                                <select
                                    value={logEmployeeFilter}
                                    onChange={e => setLogEmployeeFilter(e.target.value)}
                                    className="border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 focus:outline-none"
                                >
                                    <option value="">{isEs ? 'Todos los empleados' : 'All employees'}</option>
                                    {staffList.map(u => (
                                        <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
                                    ))}
                                </select>
                                <input
                                    type="date"
                                    value={logDateFilter}
                                    onChange={e => setLogDateFilter(e.target.value)}
                                    className="border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 focus:outline-none"
                                />
                            </div>

                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Nombre' : 'Employee'}</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Acción' : 'Punch Type'}</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Fecha & Hora' : 'Date & Time'}</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Notas / Motivo' : 'Notes'}</th>
                                        <th className="px-6 py-3.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                                    {punches
                                        .filter(p => !logEmployeeFilter || p.user_id === logEmployeeFilter)
                                        .filter(p => !logDateFilter || p.timestamp.startsWith(logDateFilter))
                                        .length === 0 ? (
                                            <tr><td colSpan={5} className="text-center py-16 text-gray-400 text-sm font-semibold">{isEs ? 'No hay registros encontrados.' : 'No attendance punches found.'}</td></tr>
                                        ) : punches
                                            .filter(p => !logEmployeeFilter || p.user_id === logEmployeeFilter)
                                            .filter(p => !logDateFilter || p.timestamp.startsWith(logDateFilter))
                                            .map(p => {
                                                const staff = staffList.find(s => s.id === p.user_id);
                                                return (
                                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                                                        <td className="px-6 py-4">
                                                            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{staff ? `${staff.nombre} ${staff.apellido}` : (isEs ? 'Empleado desconocido' : 'Unknown staff')}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${getPunchTypeStyle(p.type)}`}>
                                                                {getPunchTypeLabel(p.type)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                                                            {new Date(p.timestamp).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                                                            {p.notes || <span className="text-gray-300 font-semibold italic">—</span>}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button onClick={() => handleDeletePunch(p.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                                                                {isEs ? 'Eliminar' : 'Remove'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* PANEL 3: WEEKLY SHIFT SCHEDULES PLOTTER GRID */}
                    {subTab === 'schedules' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">
                                        🗓️ {isEs ? 'Planificador Semanal de Turnos' : 'Weekly Shifts Planner'}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {isEs ? 'Planifique, visualice y asigne turnos semanales de lunes a domingo para todo el personal.' : 'Plot, visualize, and batch-assign shifts from Monday to Sunday for all restaurant staff.'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setPlotUserId('');
                                        setPlotDays([]);
                                        setPlotStartTime('08:00');
                                        setPlotEndTime('17:00');
                                        setPlotEditingScheduleId(null);
                                        setShowPlotModal(true);
                                    }}
                                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition shadow flex items-center gap-1.5"
                                >
                                    🗓️ {isEs ? '+ Planificar Turnos' : '+ Plot Shifts'}
                                </button>
                            </div>

                            {/* 7-Column Monday to Sunday visual layout */}
                            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                                {[1, 2, 3, 4, 5, 6, 0].map(day => {
                                    const daysLabels = isEs 
                                        ? ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
                                        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

                                    const daySchedules = schedules.filter(s => s.day_of_week === day);

                                    return (
                                        <div key={day} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col min-h-[360px] shadow-sm">
                                            {/* Column Header */}
                                            <div className="border-b border-gray-100 dark:border-slate-800 pb-2.5 mb-3 flex items-center justify-between">
                                                <span className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                                                    {daysLabels[day]}
                                                </span>
                                                <span className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded-full">
                                                    {daySchedules.length}
                                                </span>
                                            </div>

                                            {/* Column Content */}
                                            <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
                                                {daySchedules.length === 0 ? (
                                                    <div className="flex-1 flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl">
                                                        <span className="text-[20px]">💤</span>
                                                        <span className="text-[10px] text-gray-400 font-bold mt-1 text-center italic">{isEs ? 'Sin turnos' : 'No shifts'}</span>
                                                    </div>
                                                ) : (
                                                    daySchedules.map(s => {
                                                        const staff = staffList.find(u => u.id === s.user_id);
                                                        if (!staff) return null;
                                                        
                                                        return (
                                                            <div 
                                                                key={s.id} 
                                                                onClick={() => {
                                                                    setPlotUserId(s.user_id);
                                                                    setPlotDays([s.day_of_week]);
                                                                    setPlotStartTime(s.start_time.slice(0, 5));
                                                                    setPlotEndTime(s.end_time.slice(0, 5));
                                                                    setPlotEditingScheduleId(s.id);
                                                                    setShowPlotModal(true);
                                                                }}
                                                                className="relative group bg-slate-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 p-3 rounded-xl hover:border-primary-400 dark:hover:border-primary-500 cursor-pointer hover:shadow-sm transition-all duration-200"
                                                            >
                                                                {/* Remove button */}
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteSchedule(s.id);
                                                                    }}
                                                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-[11px] p-0.5 bg-white dark:bg-slate-800 rounded-full border border-gray-100 dark:border-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                                                    title={isEs ? 'Eliminar turno' : 'Delete shift'}
                                                                >
                                                                    ✕
                                                                </button>

                                                                <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100 truncate pr-4">
                                                                    {staff.nombre} {staff.apellido.charAt(0)}.
                                                                </p>
                                                                <p className="text-[9px] text-gray-400 font-semibold uppercase mt-0.5 tracking-wide">
                                                                    {formatRole(staff.role, lang)}
                                                                </p>
                                                                <div className="mt-2.5 flex items-center bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100/50 dark:border-primary-900/30 px-2 py-1 rounded-lg">
                                                                    <span className="font-mono text-[10px] font-black text-primary-700 dark:text-primary-400">
                                                                        ⏰ {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* PANEL 6: ATTENDANCE & BREAK SETTINGS */}
                    {subTab === 'settings' && (
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm max-w-2xl space-y-6">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">
                                    ⚙️ {isEs ? 'Configuración de Políticas de Asistencia y Recesos' : 'Attendance & Break Policy Settings'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {isEs ? 'Personalice las políticas de tiempos, deducciones de almuerzos y recesos para su personal.' : 'Configure custom break limits, grace periods, and break overage payroll deductions.'}
                                </p>
                            </div>

                            <div className="border-t border-gray-100 dark:border-slate-800/80 pt-6 space-y-6">
                                {/* Toggle 1: Enable Breaks */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5 max-w-md">
                                        <label className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                                            ☕ {isEs ? 'Habilitar Descansos / Recesos' : 'Enable Staff Breaks'}
                                        </label>
                                        <p className="text-xs text-gray-400">
                                            {isEs ? 'Habilita los descansos cortos en las tablets POS. Si se apaga, el personal solo podrá marcar Almuerzos.' : 'Enables short break options on POS tablets. If disabled, staff can only request lunches.'}
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={attendanceSettings.enable_breaks}
                                            onChange={e => setAttendanceSettings({
                                                ...attendanceSettings,
                                                enable_breaks: e.target.checked
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>

                                {/* Toggle 2: Enable Break Deductions */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5 max-w-md">
                                        <label className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                                            📉 {isEs ? 'Deducir Exceso de Descansos de las Horas de Trabajo' : 'Deduct Break Overages from Paid Hours'}
                                        </label>
                                        <p className="text-xs text-gray-400">
                                            {isEs ? 'Resta el tiempo extra que exceda el límite permitido para descansos directamente de las horas laboradas.' : 'Subtracts any time spent on break beyond the configured limit from payable hours.'}
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={attendanceSettings.enable_break_deductions}
                                            onChange={e => setAttendanceSettings({
                                                ...attendanceSettings,
                                                enable_break_deductions: e.target.checked
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>

                                {/* Standard Break Duration Limit Input */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                    <div>
                                        <label className="font-bold text-gray-800 dark:text-gray-200 text-sm block">
                                            ⏱️ {isEs ? 'Duración Límite de Descanso (Minutos)' : 'Standard Break Limit (Minutes)'}
                                        </label>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {isEs ? 'Tiempo máximo pagado asignado a descansos antes de que comiencen las deducciones.' : 'Maximum paid minutes allowed for breaks before overage deductions start.'}
                                        </p>
                                    </div>
                                    <input
                                        type="number"
                                        min={1}
                                        value={attendanceSettings.standard_break_duration}
                                        onChange={e => setAttendanceSettings({
                                            ...attendanceSettings,
                                            standard_break_duration: parseInt(e.target.value) || 15
                                        })}
                                        className="border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:outline-none w-full md:w-32 md:justify-self-end text-right font-bold"
                                    />
                                </div>

                                {/* Standard Lunch Duration Limit Input */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center border-t border-gray-100 dark:border-slate-800/80 pt-6">
                                    <div>
                                        <label className="font-bold text-gray-800 dark:text-gray-200 text-sm block">
                                            🍔 {isEs ? 'Duración Límite de Almuerzo (Minutos)' : 'Standard Lunch Limit (Minutes)'}
                                        </label>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {isEs ? 'Tiempo máximo asignado al almuerzo antes de que se deduzca el exceso.' : 'Maximum paid minutes allowed for lunches before overage deductions start.'}
                                        </p>
                                    </div>
                                    <input
                                        type="number"
                                        min={1}
                                        value={attendanceSettings.standard_lunch_duration}
                                        onChange={e => setAttendanceSettings({
                                            ...attendanceSettings,
                                            standard_lunch_duration: parseInt(e.target.value) || 30
                                        })}
                                        className="border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:outline-none w-full md:w-32 md:justify-self-end text-right font-bold"
                                    />
                                </div>
                            </div>

                            {/* Action Save Button */}
                            <div className="pt-6 border-t border-gray-100 dark:border-slate-800/80">
                                <button
                                    onClick={() => saveAttendanceSettings(attendanceSettings)}
                                    disabled={saving}
                                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-sm transition disabled:opacity-50"
                                >
                                    {saving ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Guardar Cambios' : 'Save Policies')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PANEL 4: TIME OFF REQUESTS (LEAVES) */}
                    {subTab === 'leaves' && (
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Empleado' : 'Employee'}</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Tipo Permiso' : 'Type'}</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Periodo / Fechas' : 'Dates Range'}</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Horas Totales' : 'Applied Hours'}</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Estado' : 'Status'}</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Notas / Motivo' : 'Notes'}</th>
                                        <th className="px-6 py-3.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                                    {leaveRequests.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm font-semibold">{isEs ? 'No hay solicitudes registradas.' : 'No time off requests found.'}</td></tr>
                                    ) : leaveRequests.map(r => {
                                        const staff = staffList.find(s => s.id === r.user_id);
                                        const typeColor = r.type === 'sick' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-primary-50 text-primary-700 border-primary-200';
                                        
                                        return (
                                            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{staff ? `${staff.nombre} ${staff.apellido}` : (isEs ? 'Empleado desconocido' : 'Unknown staff')}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-extrabold border uppercase tracking-wider ${typeColor}`}>
                                                        {r.type === 'vacation' ? (isEs ? 'Vacaciones' : 'Vacation') : r.type === 'sick' ? (isEs ? 'Enfermedad' : 'Sick Leave') : (isEs ? 'Salida Temprana' : 'Early Out')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-mono text-gray-700 dark:text-gray-300">
                                                    {r.start_date} {isEs ? 'al' : 'to'} {r.end_date}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-sm text-gray-800 dark:text-gray-200">
                                                    {r.hours} hrs
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${r.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : r.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                                        {r.status === 'approved' ? (isEs ? 'Aprobado' : 'Approved') : r.status === 'rejected' ? (isEs ? 'Rechazado' : 'Rejected') : (isEs ? 'Pendiente' : 'Pending')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                                                    {r.notes || <span className="text-gray-300 font-semibold">—</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {r.status === 'pending' && (
                                                        <div className="flex gap-2 justify-end">
                                                            <button onClick={() => handleLeaveStatus(r.id, 'approved')} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">
                                                                ✓ {isEs ? 'Aprobar' : 'Approve'}
                                                            </button>
                                                            <button onClick={() => handleLeaveStatus(r.id, 'rejected')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">
                                                                ✕ {isEs ? 'Rechazar' : 'Reject'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* PANEL 5: DEDUCTIONS & PAYROLL HOURS REPORT */}
                    {subTab === 'reports' && (
                        <div className="space-y-6">
                            {/* Date Picker Range Bar */}
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">
                                    📈 {isEs ? 'Reporte Resumen de Asistencia y Deducciones' : 'Attendance Hour & Break Overage Payroll Report'}
                                </h3>

                                <div className="flex gap-3 items-center">
                                    <input
                                        type="date"
                                        value={reportStartDate}
                                        onChange={e => setReportStartDate(e.target.value)}
                                        className="border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 focus:outline-none"
                                    />
                                    <span className="text-gray-400 text-xs font-semibold">{isEs ? 'hasta' : 'to'}</span>
                                    <input
                                        type="date"
                                        value={reportEndDate}
                                        onChange={e => setReportEndDate(e.target.value)}
                                        className="border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Hours Summary Tables */}
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Empleado' : 'Employee'}</th>
                                            <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Horas Turno' : 'Regular Hours'}</th>
                                            <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-red-500">{isEs ? 'Exceso Recesos (Deducción)' : 'Break Deduction'}</th>
                                            <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-red-500">{isEs ? 'Exceso Almuerzo (Deducción)' : 'Lunch Deduction'}</th>
                                            <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Entradas Tarde' : 'Lates'}</th>
                                            <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{isEs ? 'Salidas Temprano' : 'Early Outs'}</th>
                                            <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-green-600">{isEs ? 'Vacaciones (+)' : 'Vacation (+)'}</th>
                                            <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-red-600">{isEs ? 'Enfermedad (+)' : 'Sick Leave (+)'}</th>
                                            <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-extrabold">{isEs ? 'Horas Netas Pagaderas' : 'Final Payable Hours'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                                        {payrollReport.length === 0 ? (
                                            <tr><td colSpan={9} className="text-center py-16 text-gray-400 text-sm font-semibold">{isEs ? 'No hay datos de asistencia para el rango seleccionado.' : 'No attendance data for the selected range.'}</td></tr>
                                        ) : payrollReport.map(r => (
                                            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                                                <td className="px-6 py-4 font-bold text-sm text-gray-900 dark:text-gray-100">{r.name}</td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">{r.regularHours.toFixed(2)} hrs</td>
                                                <td className={`px-6 py-4 font-mono text-xs ${r.breakDeductions > 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                                    -{r.breakDeductions.toFixed(2)} hrs
                                                </td>
                                                <td className={`px-6 py-4 font-mono text-xs ${r.lunchDeductions > 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                                    -{r.lunchDeductions.toFixed(2)} hrs
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${r.lateEntrances > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                                                        {r.lateEntrances}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${r.earlyOuts > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                                                        {r.earlyOuts}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-green-600 font-bold">+{r.vacationHours.toFixed(1)} hrs</td>
                                                <td className="px-6 py-4 font-mono text-xs text-indigo-500 font-bold">+{r.sickHours.toFixed(1)} hrs</td>
                                                <td className="px-6 py-4">
                                                    <span className="font-extrabold text-sm text-gray-900 dark:text-gray-100 bg-primary-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-primary-200 dark:border-slate-700">
                                                        {r.payableHours.toFixed(2)} hrs
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* MODAL: ADD MANUAL PUNCH LOG ITEM */}
            {showAddPunch && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-gray-100 dark:border-slate-800 p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                            ⏰ {isEs ? 'Registrar Asistencia Manual' : 'Add Manual Attendance Log'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{isEs ? 'Empleado' : 'Select employee'}</label>
                                <select
                                    value={newPunchUserId}
                                    onChange={e => setNewPunchUserId(e.target.value)}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-400 focus:outline-none"
                                >
                                    <option value="">-- {isEs ? 'Seleccionar' : 'Select Employee'} --</option>
                                    {staffList.map(u => (
                                        <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{isEs ? 'Acción' : 'Punch status'}</label>
                                    <select
                                        value={newPunchType}
                                        onChange={e => setNewPunchType(e.target.value)}
                                        className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-400 focus:outline-none"
                                    >
                                        <option value="clock_in">{isEs ? 'Entrada (Clock In)' : 'Clock In'}</option>
                                        <option value="clock_out">{isEs ? 'Salida (Clock Out)' : 'Clock Out'}</option>
                                        <option value="break_start">{isEs ? 'Inicio Receso' : 'Start Break'}</option>
                                        <option value="break_end">{isEs ? 'Fin Receso' : 'End Break'}</option>
                                        <option value="lunch_start">{isEs ? 'Inicio Almuerzo' : 'Start Lunch'}</option>
                                        <option value="lunch_end">{isEs ? 'Fin Almuerzo' : 'End Lunch'}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{isEs ? 'Hora' : 'Time (24h)'}</label>
                                    <input
                                        type="time"
                                        value={newPunchTime}
                                        onChange={e => setNewPunchTime(e.target.value)}
                                        className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-400 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{isEs ? 'Fecha' : 'Date'}</label>
                                <input
                                    type="date"
                                    value={newPunchDate}
                                    onChange={e => setNewPunchDate(e.target.value)}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-400 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{isEs ? 'Notas / Motivo del cambio' : 'Reason / Note'}</label>
                                <textarea
                                    value={newPunchNotes}
                                    onChange={e => setNewPunchNotes(e.target.value)}
                                    placeholder={isEs ? 'ej. Olvidó marcar entrada en recepción' : 'e.g. Forgot to punch at shift start'}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-400 focus:outline-none h-20 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-slate-800/80">
                            <button onClick={handleAddPunch} disabled={saving} className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-700 transition disabled:opacity-50">
                                {saving ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Registrar' : 'Submit Punch')}
                            </button>
                            <button onClick={() => { setShowAddPunch(false); setNewPunchUserId(''); setNewPunchNotes(''); }} className="flex-1 border border-gray-200 dark:border-slate-800 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                                {isEs ? 'Cancelar' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL: BATCH PLOT / ASSIGN WEEKLY SHIFT SCHEDULES */}
            {showPlotModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-gray-100 dark:border-slate-800 p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                            🗓️ {isEs ? 'Planificar / Asignar Horarios' : 'Plot / Assign Staff Schedules'}
                        </h3>

                        <div className="space-y-4">
                            {/* Employee Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                    {isEs ? 'Seleccionar Empleado' : 'Select Employee'}
                                </label>
                                <select
                                    value={plotUserId}
                                    onChange={e => setPlotUserId(e.target.value)}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-400 focus:outline-none"
                                >
                                    <option value="">-- {isEs ? 'Seleccionar Empleado' : 'Select Employee'} --</option>
                                    {staffList.map(u => (
                                        <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Days of Week Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                    {isEs ? 'Días de la Semana' : 'Days of the Week'}
                                </label>
                                <div className="grid grid-cols-4 gap-2 mt-1">
                                    {[1, 2, 3, 4, 5, 6, 0].map(day => {
                                        const shortDaysLabels = isEs
                                            ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
                                            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                        
                                        const isSelected = plotDays.includes(day);
                                        return (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setPlotDays(prev => prev.filter(d => d !== day));
                                                    } else {
                                                        setPlotDays(prev => [...prev, day]);
                                                    }
                                                }}
                                                className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${isSelected ? 'bg-primary-600 border-primary-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-slate-50'}`}
                                            >
                                                {shortDaysLabels[day]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Start and End Times */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                        {isEs ? 'Hora Inicio' : 'Start Time'}
                                    </label>
                                    <input
                                        type="time"
                                        value={plotStartTime}
                                        onChange={e => setPlotStartTime(e.target.value)}
                                        className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-400 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                        {isEs ? 'Hora Fin' : 'End Time'}
                                    </label>
                                    <input
                                        type="time"
                                        value={plotEndTime}
                                        onChange={e => setPlotEndTime(e.target.value)}
                                        className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-400 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-slate-800/80">
                            <button onClick={handleSavePlotSchedule} disabled={saving} className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-700 transition disabled:opacity-50">
                                {saving ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Asignar Turnos' : 'Plot Schedule')}
                            </button>
                            <button onClick={() => { setShowPlotModal(false); setPlotUserId(''); setPlotDays([]); setPlotStartTime('08:00'); setPlotEndTime('17:00'); setPlotEditingScheduleId(null); }} className="flex-1 border border-gray-200 dark:border-slate-800 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                                {isEs ? 'Cancelar' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
