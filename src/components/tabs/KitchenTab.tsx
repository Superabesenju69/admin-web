import React, { useState } from 'react';
import { t } from '../../utils/i18n';
import Link from 'next/link';

interface KitchenTabProps {
    supabase: any;
    lang: string;
    stations: any[];
    setStations: any;
    printers: any[];
    tickets: any[];
    setTickets: any;
    settings: any;
    updateExpediterSettings: (updates: any) => Promise<void>;
}

export default function KitchenTab({ supabase, lang, stations, setStations, printers, tickets, setTickets, settings, updateExpediterSettings }: KitchenTabProps) {
    const [kitchenView, setKitchenView] = useState<'stations' | 'kds'>('kds');
    const [newStationName, setNewStationName] = useState('');
    const [newStationColor, setNewStationColor] = useState('#6366f1');
    const [ticketFilter, setTicketFilter] = useState<string>('all');

    async function addStation() {
        if (!newStationName.trim()) return;
        const { data } = await supabase.from('kitchen_stations')
            .insert([{ name: newStationName.trim(), color: newStationColor, display_order: stations.length }])
            .select().single();
        if (data) setStations((prev: any[]) => [...prev, data]);
        setNewStationName(''); setNewStationColor('#6366f1');
    }
    async function deleteStation(id: string) {
        await supabase.from('kitchen_stations').delete().eq('id', id);
        setStations((prev: any[]) => prev.filter((s: any) => s.id !== id));
    }

    async function updateStation(id: string, updates: any) {
        setStations((prev: any[]) => prev.map((s: any) => s.id === id ? { ...s, ...updates } : s));
        await supabase.from('kitchen_stations').update(updates).eq('id', id);
    }

    async function updateTicketStatus(id: string, status: string) {
        await supabase.from('kitchen_tickets').update({ status }).eq('id', id);
        if (status === 'done') {
            setTickets((prev: any[]) => prev.filter((t: any) => t.id !== id));
        } else {
            setTickets((prev: any[]) => prev.map((t: any) => t.id === id ? { ...t, status } : t));
        }
    }

    return (
        <>
            {/* ══════════ KITCHEN TAB ══════════ */}
                            
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('kitchen.title', lang)}</h2>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{tickets.length} {t('kitchen.active_orders', lang)}</p>
                                        </div>
                                        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                                            <button onClick={() => setKitchenView('kds')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${kitchenView === 'kds' ? 'bg-white dark:bg-slate-900 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                                                {lang === 'es' ? 'KDS en Vivo' : 'Live KDS'}
                                            </button>
                                            <button onClick={() => setKitchenView('stations')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${kitchenView === 'stations' ? 'bg-white dark:bg-slate-900 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                                                {lang === 'es' ? 'Estaciones' : 'Stations'}
                                            </button>
                                        </div>
                                    </div>

                                    {kitchenView === 'stations' && (
                                        <div>
                                            <div className="flex gap-3 mb-6">
                                                <input type="text" value={newStationName} onChange={e => setNewStationName(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && addStation()}
                                                    placeholder={lang === 'es' ? "Nombre de estación (ej. Parrilla, Freidora, Bar, Ensaladas)" : "Station name (e.g. Grill, Fryer, Bar, Salad)"}
                                                    className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-gray-300 rounded-xl px-3">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{lang === 'es' ? 'Color' : 'Color'}</span>
                                                    <input type="color" value={newStationColor} onChange={e => setNewStationColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
                                                </div>
                                                <button onClick={addStation} disabled={!newStationName.trim()}
                                                    className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-700 transition disabled:opacity-40">
                                                    {lang === 'es' ? '+ Agregar Estación' : '+ Add Station'}
                                                </button>
                                            </div>

                                            {stations.length === 0 ? (
                                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
                                                    {lang === 'es' ? 'No hay estaciones todavía. Crea una estación para comenzar a enrutar tickets.' : 'No stations yet. Create a station to start routing tickets.'}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {stations.map(s => {
                                                        const stationTickets = tickets.filter(t => t.station_id === s.id);
                                                        return (
                                                            <div key={s.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 relative group shadow-sm flex flex-col gap-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: s.color }} />
                                                                        <p className="font-bold text-lg text-gray-900 dark:text-gray-100">{s.name}</p>
                                                                    </div>
                                                                    <button onClick={() => deleteStation(s.id)} className="text-gray-400 hover:text-red-500 transition text-xl font-bold">×</button>
                                                                </div>

                                                                <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-slate-800 pt-4">
                                                                    <div>
                                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">{lang === 'es' ? 'Modo de Salida' : 'Output Mode'}</label>
                                                                        <select
                                                                            value={s.output_mode || 'screen'}
                                                                            onChange={(e) => updateStation(s.id, { output_mode: e.target.value })}
                                                                            className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                        >
                                                                            <option value="screen">{lang === 'es' ? 'Pantalla Solamente (KDS)' : 'Screen Only (KDS)'}</option>
                                                                            <option value="printer">{lang === 'es' ? 'Impresora Solamente (TCP)' : 'Printer Only (TCP)'}</option>
                                                                            <option value="both">{lang === 'es' ? 'Pantalla + Impresora' : 'Screen + Printer'}</option>
                                                                        </select>
                                                                    </div>

                                                                    {(s.output_mode === 'printer' || s.output_mode === 'both') && (
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-gray-500 mb-1">{lang === 'es' ? 'Impresora Asignada' : 'Assigned Printer'}</label>
                                                                            <select
                                                                                value={s.printer_id || ''}
                                                                                onChange={(e) => updateStation(s.id, { printer_id: e.target.value || null })}
                                                                                className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                            >
                                                                                <option value="">{lang === 'es' ? '-- Sin Impresora Asignada --' : '-- No Printer Assigned --'}</option>
                                                                                {printers.map(p => (
                                                                                    <option key={p.id} value={p.id}>{p.name} ({p.ip_address})</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="mt-auto bg-gray-50 dark:bg-slate-800/50 rounded-lg p-2 text-center text-xs font-medium text-gray-500">
                                                                    {stationTickets.length} {lang === 'es' ? (stationTickets.length === 1 ? 'ticket activo' : 'tickets activos') : (stationTickets.length === 1 ? 'active ticket' : 'active tickets')}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Expediter Configuration */}
                                            <div className="mt-10 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t('kitchen.master_kds', lang)}</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{lang === 'es' ? 'Modo de Salida de Despachador' : 'Expediter Output Mode'}</label>
                                                        <select
                                                            value={settings?.expediter_output_mode || 'screen'}
                                                            onChange={(e) => updateExpediterSettings({ expediter_output_mode: e.target.value })}
                                                            className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                        >
                                                            <option value="screen">{lang === 'es' ? 'Pantalla Solamente (KDS)' : 'Screen Only (KDS)'}</option>
                                                            <option value="printer">{lang === 'es' ? 'Impresora Solamente (TCP)' : 'Printer Only (TCP)'}</option>
                                                            <option value="both">{lang === 'es' ? 'Pantalla + Impresora' : 'Screen + Printer'}</option>
                                                        </select>
                                                        <p className="text-xs text-gray-500 mt-2">{lang === 'es' ? 'El despachador maestro recibe todos los ítems de todas las estaciones.' : 'The expediter receives all items across all stations.'}</p>
                                                    </div>

                                                    {(settings?.expediter_output_mode === 'printer' || settings?.expediter_output_mode === 'both') && (
                                                        <div>
                                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{lang === 'es' ? 'Impresora del Despachador' : 'Expediter Printer Selection'}</label>
                                                            <select
                                                                value={settings?.expediter_printer_id || ''}
                                                                onChange={(e) => updateExpediterSettings({ expediter_printer_id: e.target.value || null })}
                                                                className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                            >
                                                                <option value="">{lang === 'es' ? '-- Sin Impresora de Despachador --' : '-- No Expediter Printer --'}</option>
                                                                {printers.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name} ({p.ip_address})</option>
                                                                ))}
                                                            </select>
                                                            <p className="text-xs text-gray-500 mt-2">{lang === 'es' ? 'Todos los tickets consolidados se imprimen aquí al cobrar.' : 'All tickets consolidate here on checkout.'}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {kitchenView === 'kds' && (
                                        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 text-center">
                                            <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner cursor-default">
                                                🍳
                                            </div>
                                            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">{t('kitchen.kds_system', lang)}</h3>
                                            <p className="text-gray-500 max-w-md mx-auto mb-8">
                                                {lang === 'es' ? 'El KDS está diseñado para ejecutarse en pantalla completa en tablets o monitores en tus estaciones de cocina.' : 'The KDS is designed to run full-screen on tablets or monitors in your kitchen stations.'}
                                            </p>
                                            <a
                                                href="/kds"
                                                target="_blank"
                                                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition active:scale-95 shadow-md flex items-center gap-3"
                                            >
                                                {lang === 'es' ? 'Abrir KDS en Pantalla Completa ↗' : 'Launch Full Screen KDS ↗'}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            
        </>
    );
}
