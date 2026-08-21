'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../utils/supabase/client';

const supabase = createClient();

function statusStyle(s: string) {
    if (s === 'done') return 'bg-green-100 text-green-800';
    if (s === 'in_progress') return 'bg-primary-100 text-primary-800';
    return 'bg-yellow-100 text-yellow-800';
}

export default function KDSClient() {
    const [stations, setStations] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [filter, setFilter] = useState<string>('expediter'); // 'expediter' or station_id
    const [loading, setLoading] = useState(true);
    const [dismissedBatchIds, setDismissedBatchIds] = useState<Set<string>>(new Set()); // track locally dismissed batches
    const [lang, setLang] = useState<'es' | 'en'>('es');

    useEffect(() => {
        const saved = localStorage.getItem('pos_language');
        if (saved === 'en' || saved === 'es') setLang(saved);
        loadData();

        const tenantId = typeof window !== 'undefined' ? localStorage.getItem('pos_tenant_id') : null;
        const filterStr = tenantId ? `tenant_id=eq.${tenantId}` : undefined;

        // Subscribe to kitchen_tickets changes
        const ticketSub = supabase.channel('kds-tickets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_tickets', filter: filterStr }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    // Fetch nested items for new ticket
                    supabase.from('kitchen_ticket_items').select('*').eq('ticket_id', payload.new.id).then(({ data }) => {
                        setTickets(prev => [{ ...payload.new, kitchen_ticket_items: data || [] }, ...prev]);
                    });
                } else if (payload.eventType === 'UPDATE') {
                    if (payload.new.status === 'archived') {
                        // When a ticket is archived, remove ALL tickets for that batch
                        const batchId = payload.new.batch_id;
                        if (batchId) {
                           setTickets(prev => prev.filter(t => t.batch_id !== batchId));
                        } else {
                           setTickets(prev => prev.filter(t => t.order_id !== payload.new.order_id));
                        }
                    } else {
                        setTickets(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
                    }
                } else if (payload.eventType === 'DELETE') {
                    setTickets(prev => prev.filter(t => t.id !== payload.old.id));
                }
            })
            .subscribe();

        // Subscribe to kitchen_ticket_items changes (if items get updated)
        const itemSub = supabase.channel('kds-items')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kitchen_ticket_items', filter: filterStr }, (payload) => {
                setTickets(prev => prev.map(t => {
                    if (t.id === payload.new.ticket_id) {
                        return {
                            ...t,
                            kitchen_ticket_items: t.kitchen_ticket_items.map((i: any) => i.id === payload.new.id ? payload.new : i)
                        };
                    }
                    return t;
                }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(ticketSub);
            supabase.removeChannel(itemSub);
        };
    }, []);

    async function loadData() {
        // Only fetch ACTIVE tickets (pending + in_progress) from the last 12 hours.
        // 'done' tickets are NOT loaded on page load — they only appear via realtime
        // when a station marks them as done. This means completed orders naturally
        // disappear on page reload.
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

        const [statRes, tickRes] = await Promise.all([
            supabase.from('kitchen_stations').select('*').order('display_order'),
            supabase.from('kitchen_tickets')
                .select('*, kitchen_ticket_items(*)')
                .in('status', ['pending', 'in_progress'])
                .gte('created_at', twelveHoursAgo)
                .order('created_at', { ascending: false })
        ]);
        setStations(statRes.data || []);
        setTickets(tickRes.data || []);
        setDismissedBatchIds(new Set());
        setLoading(false);
    }

    async function updateTicket(id: string, status: string) {
        const payload: any = { status };

        // Optimistic update
        const now = new Date().toISOString();
        setTickets(prev => prev.map(t => t.id === id ? { ...t, ...payload, updated_at: now } : t));
        await supabase.from('kitchen_tickets').update(payload).eq('id', id);

        // Auto-sync items to "ready" on the Expediter Ticket if a Station marks his ticket done
        const ticket = tickets.find(t => t.id === id);
        if (ticket && ticket.batch_id && !ticket.is_expediter && status === 'done') {
            const expediterTicket = tickets.find(t => t.batch_id === ticket.batch_id && t.is_expediter);
            if (expediterTicket && expediterTicket.kitchen_ticket_items) {
                const myItems = ticket.kitchen_ticket_items || [];
                for (const stationItem of myItems) {
                    const expItem = expediterTicket.kitchen_ticket_items.find((ei: any) => ei.item_name === stationItem.item_name && ei.status !== 'delivered');
                    if (expItem) {
                        await supabase.from('kitchen_ticket_items').update({ status: 'ready', ready_at: now }).eq('id', expItem.id);
                    }
                }
            }
        }
    }

    async function updateItemStatus(itemId: string, newStatus: string) {
        const now = new Date().toISOString();
        const payload: any = { status: newStatus };
        if (newStatus === 'ready') payload.ready_at = now;
        if (newStatus === 'delivered') payload.delivered_at = now;

        setTickets(prev => prev.map(t => ({
            ...t,
            kitchen_ticket_items: t.kitchen_ticket_items?.map((i: any) => 
                i.id === itemId ? { ...i, ...payload } : i
            )
        })));
        await supabase.from('kitchen_ticket_items').update(payload).eq('id', itemId);
    }

    // Mark Complete: Mark all items in an Expediter Ticket as delivered, archive the batch.
    async function markExpediterBatchComplete(batchId: string) {
        // Optimistic
        setDismissedBatchIds(prev => new Set([...prev, batchId]));
        const now = new Date().toISOString();
        
        const extTicket = tickets.find(t => t.batch_id === batchId && t.is_expediter);
        if (extTicket) {
             const pendingItems = extTicket.kitchen_ticket_items?.filter((i: any) => i.status !== 'delivered');
             if (pendingItems && pendingItems.length > 0) {
                  for (const item of pendingItems) {
                      await supabase.from('kitchen_ticket_items').update({ status: 'delivered', delivered_at: now }).eq('id', item.id);
                  }
             }
        }
        await supabase.from('kitchen_tickets').update({ status: 'archived' }).eq('batch_id', batchId);
    }

    if (loading) return <div className="p-10 text-center text-gray-500">{lang === 'es' ? 'Cargando KDS...' : 'Loading KDS...'}</div>;

    // Filter tickets based on selection
    const visibleTickets = filter === 'expediter'
        ? tickets.filter(t => t.is_expediter && t.status !== 'archived') // expediter sees only true batches
        : tickets.filter(t => t.station_id === filter && t.status !== 'archived' && !t.is_expediter); // station view sees its specific parts

    const orderGroups = filter === 'expediter' 
        ? visibleTickets.filter(t => t.batch_id && !dismissedBatchIds.has(t.batch_id)).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        : [];

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex flex-col">
            {/* Top Bar */}
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between shadow-md z-10 sticky top-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-black tracking-tight">KDS</h1>

                    <div className="h-6 w-px bg-gray-700 mx-2" />

                    <button
                        onClick={() => setFilter('expediter')}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition ${filter === 'expediter' ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >
                        {lang === 'es' ? 'Expedidor Principal' : 'Master Expediter'}
                    </button>

                    {stations.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setFilter(s.id)}
                            className={`px-4 py-1.5 rounded-full text-sm font-bold transition flex items-center gap-2`}
                            style={{
                                backgroundColor: filter === s.id ? s.color : 'transparent',
                                color: filter === s.id ? '#fff' : s.color,
                                border: `1px solid ${s.color}`
                            }}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>

                <div className="text-sm font-medium text-gray-400">
                    {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-auto">
                {visibleTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 mt-20">
                        <span className="text-6xl mb-4">🍽️</span>
                        <h2 className="text-2xl font-bold">{lang === 'es' ? 'Sin comandas activas' : 'No active tickets'}</h2>
                        <p>{lang === 'es' ? '¡La cocina está al día!' : 'Kitchen is all caught up!'}</p>
                    </div>
                ) : (
                    <>
                        {/* EXPEDITER VIEW */}
                        {filter === 'expediter' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {orderGroups.map((batchTicket: any, idx) => {
                                    const items = batchTicket.kitchen_ticket_items || [];
                                    const allReady = items.length > 0 && items.every((i: any) => i.status === 'ready' || i.status === 'delivered');
                                    const allDelivered = items.length > 0 && items.every((i: any) => i.status === 'delivered');
                                    
                                    // Use updated_at to freeze timer when all tickets are ready
                                    const readyItems = items.filter((i: any) => i.status === 'ready' || i.status === 'delivered');
                                    const lastUpdatedAt = readyItems.length > 0
                                        ? Math.max(...readyItems.map((i: any) => new Date(i.updated_at || i.created_at || batchTicket.created_at).getTime()))
                                        : null;
                                    const endTime = allReady && lastUpdatedAt ? lastUpdatedAt : Date.now();
                                    const elapsed = Math.floor((endTime - new Date(batchTicket.created_at).getTime()) / 60000);
                                    const urgent = elapsed >= 15 && !allReady;

                                    if (allDelivered) return null; // Safety hide

                                    return (
                                        <div key={batchTicket.id} className={`bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border-2 flex flex-col ${urgent ? 'border-red-500 animate-pulse' : allReady ? 'border-green-500' : 'border-gray-200 dark:border-slate-800'}`}>
                                            <div className={`px-4 py-3 flex justify-between items-center ${allReady ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-slate-800'}`}>
                                                <div>
                                                    <span className="font-black text-xl dark:text-white">#{batchTicket.order_number || '—'}</span>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{batchTicket.type === 'dine_in' ? `${lang === 'es' ? 'En Sala' : 'Dine In'}: ${batchTicket.table_name}` : (lang === 'es' ? 'Para Llevar' : 'Take Out')}</p>
                                                </div>
                                                <div className="text-right flex items-center gap-2">
                                                    {allReady && <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{lang === 'es' ? '✓ TODO LISTO' : '✓ ALL READY'}</span>}
                                                    <span className={`text-sm font-bold ${allReady ? 'text-green-600' : urgent ? 'text-red-600' : 'text-gray-500'}`}>{elapsed}m</span>
                                                </div>
                                            </div>

                                            <div className="p-4 flex-1 flex flex-col gap-3">
                                                {items.map((item: any) => {
                                                    const isReady = item.status === 'ready';
                                                    const isDelivered = item.status === 'delivered';
                                                    if (isDelivered) return null; // Don't show already delivered items
                                                    return (
                                                        <div key={item.id} className={`rounded-lg p-3 border flex justify-between items-center ${isReady ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-800'}`}>
                                                            <div className="space-y-1">
                                                                <div className="text-sm flex gap-2">
                                                                    <span className="font-bold">{item.quantity}×</span>
                                                                    <span className={`font-medium ${isReady ? 'text-green-800 dark:text-green-400' : 'dark:text-gray-200'}`}>{item.item_name}</span>
                                                                </div>
                                                                {item.modifications?.ingredients?.filter((i:any)=>i.removed||i.extra).length > 0 && (
                                                                    <div className="pl-6 text-xs text-red-500">
                                                                        {item.modifications.ingredients.map((i:any)=>i.removed ? `NO ${i.name}` : `EXTRA ${i.name}`).join(', ')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {!isReady ? (
                                                                    <span className="text-yellow-600 font-bold text-xs">{lang === 'es' ? '⏳ Esperando Estación' : '⏳ Waiting for Station'}</span>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => updateItemStatus(item.id, 'delivered')}
                                                                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg active:scale-95 transition"
                                                                    >
                                                                        {lang === 'es' ? '✓ Entregar' : '✓ Deliver'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="p-3 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                                                {allReady ? (
                                                    <button
                                                        onClick={() => markExpediterBatchComplete(batchTicket.batch_id)}
                                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-lg uppercase tracking-wider active:scale-95 transition"
                                                    >
                                                        {lang === 'es' ? '✓ Entregar Todo' : '✓ Deliver All'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled
                                                        className="w-full py-3 bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-gray-400 rounded-lg font-bold cursor-not-allowed uppercase text-sm"
                                                    >
                                                        {lang === 'es' ? 'Esperando a la cocina' : 'Waiting for kitchen'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* STATION VIEW */}
                        {filter !== 'expediter' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {visibleTickets.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(ticket => {
                                    const isFinished = ticket.status === 'done' || ticket.status === 'archived';
                                    const endTime = isFinished ? new Date(ticket.updated_at).getTime() : Date.now();
                                    const elapsed = Math.floor((endTime - new Date(ticket.created_at).getTime()) / 60000);
                                    const urgent = elapsed >= 15 && !isFinished;

                                    return (
                                        <div key={ticket.id} className={`bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border-2 flex flex-col ${urgent ? 'border-red-500' : 'border-gray-200 dark:border-slate-800'}`}>
                                            <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800 flex justify-between items-center border-b border-gray-100 dark:border-slate-700">
                                                <span className="font-black text-2xl dark:text-white">#{ticket.order_number || '—'}</span>
                                                <div className="flex gap-2 items-center">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusStyle(ticket.status)}`}>
                                                        {ticket.status === 'pending' ? (lang === 'es' ? 'Pendiente' : 'Pending') : ticket.status === 'in_progress' ? (lang === 'es' ? 'En Preparación' : 'In Progress') : ticket.status === 'done' ? (lang === 'es' ? 'Listo' : 'Done') : ticket.status.replace('_', ' ')}
                                                    </span>
                                                    <span className={`font-bold ${urgent ? 'text-red-600' : 'text-gray-500'}`}>{elapsed}m</span>
                                                </div>
                                            </div>

                                            <div className="p-5 flex-1 space-y-3">
                                                {(ticket.kitchen_ticket_items || []).map((line: any) => {
                                                    const mods = line.modifications || {};
                                                    const removed = (mods.ingredients || []).filter((i: any) => i.removed);
                                                    const extras = (mods.ingredients || []).filter((i: any) => i.extra);
                                                    const options = Object.entries(mods.selectedOptions || {});

                                                    return (
                                                        <div key={line.id} className="flex gap-3 pb-3 border-b border-dashed border-gray-200 dark:border-slate-700 last:border-0">
                                                            <span className="text-xl font-black text-gray-900 dark:text-white">
                                                                {line.quantity}×
                                                            </span>
                                                            <div>
                                                                <p className="font-bold text-lg dark:text-white leading-tight">{line.item_name}</p>
                                                                {options.map(([k, v]: any, i: number) => (
                                                                    <p key={i} className="text-sm font-semibold text-indigo-500">{k}: {v}</p>
                                                                ))}
                                                                {removed.map((i: any, idx: number) => (
                                                                    <p key={idx} className="text-sm font-bold text-red-500 uppercase">NO {i.name}</p>
                                                                ))}
                                                                {extras.map((i: any, idx: number) => (
                                                                    <p key={idx} className="text-sm font-bold text-primary-500">+ EXTRA {i.name}</p>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="p-3 flex gap-2 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 mt-auto">
                                                {ticket.status === 'pending' && (
                                                    <button
                                                        onClick={() => updateTicket(ticket.id, 'in_progress')}
                                                        className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-lg uppercase tracking-wider active:scale-95 transition"
                                                    >
                                                        {lang === 'es' ? 'Iniciar Preparación' : 'Start Prep'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => updateTicket(ticket.id, 'done')}
                                                    className="flex-1 py-3 bg-green-500 text-white font-bold rounded-lg uppercase tracking-wider active:scale-95 transition"
                                                >
                                                    {lang === 'es' ? 'Marcar Listo' : 'Mark Done'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
