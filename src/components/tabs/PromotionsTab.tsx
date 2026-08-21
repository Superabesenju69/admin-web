import React, { useState, useEffect } from 'react';
import { t } from '../../utils/i18n';

interface PromotionsTabProps {
    supabase: any;
    lang: string;
    fmtCurrency: (amount: number) => string;
    menuCategories: any[];
    items: any[];
}

export default function PromotionsTab({ supabase, lang, fmtCurrency, menuCategories, items }: PromotionsTabProps) {
    const [promotions, setPromotions] = useState<any[]>([]);
    const [promotionTargets, setPromotionTargets] = useState<any[]>([]);
    const [showPromoForm, setShowPromoForm] = useState(false);
    const [editingPromo, setEditingPromo] = useState<any | null>(null);
    const [promoForm, setPromoForm] = useState({
        name: '', description: '', type: 'percentage' as string,
        discount_value: '', is_automatic: false, allow_stacking: false,
        priority: 0, start_date: '', end_date: '',
        schedule_days: [] as number[], schedule_time_start: '', schedule_time_end: '',
        min_order_amount: '',
        bogo_buy_qty: '1', bogo_get_qty: '1', bogo_discount_type: 'percentage', bogo_discount_value: '100',
        bogo_get_target_type: 'same' as string, bogo_get_target_id: '' as string,
        target_type: 'all' as string, target_ids: [] as string[],
        active: true
    });
    const [promoSaving, setPromoSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        setSearchQuery('');
        setDropdownOpen(false);
    }, [promoForm.target_type]);

    useEffect(() => {
        refreshPromotions();
    }, []);

    async function refreshPromotions() {
        const [promoR, promoTR] = await Promise.all([
            supabase.from('promotions').select('*').order('priority', { ascending: false }),
            supabase.from('promotion_targets').select('*'),
        ]);
        setPromotions(promoR.data || []);
        setPromotionTargets(promoTR.data || []);
    }

    function resetPromoForm() {
        setPromoForm({
            name: '', description: '', type: 'percentage',
            discount_value: '', is_automatic: false, allow_stacking: false,
            priority: 0, start_date: '', end_date: '',
            schedule_days: [], schedule_time_start: '', schedule_time_end: '',
            min_order_amount: '',
            bogo_buy_qty: '1', bogo_get_qty: '1', bogo_discount_type: 'percentage', bogo_discount_value: '100',
            bogo_get_target_type: 'same', bogo_get_target_id: '',
            target_type: 'all', target_ids: [],
            active: true
        });
        setEditingPromo(null);
    }

    function openEditPromo(promo: any) {
        const targets = promotionTargets.filter(t => t.promotion_id === promo.id);
        const scheduleRules = promo.schedule_rules || {};
        const conditions = promo.conditions || {};
        const bogoRules = promo.bogo_rules || {};

        setPromoForm({
            name: promo.name || '',
            description: promo.description || '',
            type: promo.type || 'percentage',
            discount_value: String(promo.discount_value || ''),
            is_automatic: promo.is_automatic || false,
            allow_stacking: promo.allow_stacking || false,
            priority: promo.priority || 0,
            start_date: promo.start_date ? promo.start_date.split('T')[0] : '',
            end_date: promo.end_date ? promo.end_date.split('T')[0] : '',
            schedule_days: scheduleRules.days || [],
            schedule_time_start: scheduleRules.timeStart || '',
            schedule_time_end: scheduleRules.timeEnd || '',
            min_order_amount: conditions.minOrderAmount ? String(conditions.minOrderAmount) : '',
            bogo_buy_qty: String(bogoRules.buyQuantity || 1),
            bogo_get_qty: String(bogoRules.getQuantity || 1),
            bogo_discount_type: bogoRules.discountType || 'percentage',
            bogo_discount_value: String(bogoRules.discountValue || 100),
            bogo_get_target_type: bogoRules.getTargetType || 'same',
            bogo_get_target_id: bogoRules.getTargetId || '',
            target_type: targets.length > 0 ? targets[0].target_type : 'all',
            target_ids: targets.filter(t => t.target_id).map(t => t.target_id),
            active: promo.active ?? true
        });
        setEditingPromo(promo);
        setShowPromoForm(true);
    }

    async function savePromotion() {
        setPromoSaving(true);
        try {
            const scheduleRules = (promoForm.schedule_days.length > 0 || promoForm.schedule_time_start)
                ? { days: promoForm.schedule_days, timeStart: promoForm.schedule_time_start, timeEnd: promoForm.schedule_time_end }
                : null;
            const conditions = promoForm.min_order_amount ? { minOrderAmount: parseFloat(promoForm.min_order_amount) } : null;
            const bogoRules = promoForm.type === 'bogo' ? {
                buyQuantity: parseInt(promoForm.bogo_buy_qty) || 1,
                getQuantity: parseInt(promoForm.bogo_get_qty) || 1,
                discountType: promoForm.bogo_discount_type,
                discountValue: parseFloat(promoForm.bogo_discount_value) || 100,
                getTargetType: promoForm.bogo_get_target_type,
                getTargetId: promoForm.bogo_get_target_type !== 'same' ? promoForm.bogo_get_target_id : null
            } : null;

            const payload = {
                name: promoForm.name,
                description: promoForm.description || null,
                type: promoForm.type,
                discount_value: parseFloat(promoForm.discount_value) || 0,
                is_automatic: promoForm.is_automatic,
                allow_stacking: promoForm.allow_stacking,
                priority: promoForm.priority,
                start_date: promoForm.start_date || null,
                end_date: promoForm.end_date || null,
                schedule_rules: scheduleRules,
                conditions: conditions,
                bogo_rules: bogoRules,
                active: promoForm.active,
            };

            let promoId: string | undefined;
            if (editingPromo) {
                const { error: updateError } = await supabase.from('promotions').update(payload).eq('id', editingPromo.id);
                if (updateError) {
                    console.error('Promotion update failed:', updateError);
                    alert(`Error al actualizar la promoción: ${updateError.message}`);
                    setPromoSaving(false);
                    return;
                }
                promoId = editingPromo.id;
            } else {
                const { data, error: insertError } = await supabase.from('promotions').insert([payload]).select().single();
                if (insertError || !data) {
                    console.error('Promotion insert failed:', insertError);
                    alert(`Error al crear la promoción: ${insertError?.message || 'No se recibió respuesta'}`);
                    setPromoSaving(false);
                    return;
                }
                promoId = data.id;
            }

            // Re-sync targets
            if (promoId) {
                const { error: delError } = await supabase.from('promotion_targets').delete().eq('promotion_id', promoId);
                if (delError) console.error('Error clearing promotion targets:', delError);

                if (promoForm.target_type === 'all') {
                    const { error: tgtError } = await supabase.from('promotion_targets').insert([{ promotion_id: promoId, target_type: 'all', target_id: null }]);
                    if (tgtError) console.error('Error inserting promotion target (all):', tgtError);
                } else {
                    const targetInserts = promoForm.target_ids.map(tid => ({
                        promotion_id: promoId!,
                        target_type: promoForm.target_type,
                        target_id: tid,
                    }));
                    if (targetInserts.length > 0) {
                        const { error: tgtError } = await supabase.from('promotion_targets').insert(targetInserts);
                        if (tgtError) console.error('Error inserting promotion targets:', tgtError);
                    }
                }
            }

            await refreshPromotions();
            resetPromoForm();
            setShowPromoForm(false);
        } catch (err: any) {
            console.error('Unexpected error saving promotion:', err);
            alert(`Error inesperado: ${err.message || 'Error desconocido'}`);
        } finally {
            setPromoSaving(false);
        }
    }

    async function deletePromotion(id: string) {
        if (!confirm(lang === 'es' ? '¿Seguro que deseas eliminar esta promoción?' : 'Are you sure you want to delete this promotion?')) return;
        await supabase.from('promotions').delete().eq('id', id);
        await refreshPromotions();
    }

    async function togglePromoActive(id: string, currentActive: boolean) {
        await supabase.from('promotions').update({ active: !currentActive }).eq('id', id);
        await refreshPromotions();
    }

    const dayLabels = lang === 'es' ? ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    return (
        <>
            {/* ══════════ PROMOTIONS TAB ══════════ */}
                            
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('promos.title', lang)}</h2>
                                        <button onClick={() => { resetPromoForm(); setShowPromoForm(true); }} className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all">{t('promos.new_promo', lang)}</button>
                                    </div>

                                    {/* Active Promo Summary */}
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-2xl p-5">
                                            <p className="text-sm font-bold text-green-600 dark:text-green-400">{lang === 'es' ? 'Activas' : 'Active'}</p>
                                            <p className="text-3xl font-black text-green-900 dark:text-green-100">{promotions.filter(p => p.active).length}</p>
                                        </div>
                                        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-2xl p-5">
                                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{lang === 'es' ? 'Automáticas' : 'Automatic'}</p>
                                            <p className="text-3xl font-black text-amber-900 dark:text-amber-100">{promotions.filter(p => p.is_automatic && p.active).length}</p>
                                        </div>
                                        <div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-5">
                                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">BOGO</p>
                                            <p className="text-3xl font-black text-indigo-900 dark:text-indigo-100">{promotions.filter(p => p.type === 'bogo' && p.active).length}</p>
                                        </div>
                                    </div>

                                    {/* Promo List */}
                                    {promotions.length === 0 ? (
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-12 text-center">
                                            <p className="text-5xl mb-4">🏷️</p>
                                            <p className="text-lg font-bold text-gray-500 dark:text-gray-400">{lang === 'es' ? 'No hay promociones creadas' : 'No promotions created yet'}</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">{lang === 'es' ? 'Crea tu primera promoción para desbloquear Happy Hour, descuentos, y BOGO.' : 'Create your first promotion to unlock Happy Hour, discounts, and BOGO.'}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {promotions.map(promo => {
                                                const targets = promotionTargets.filter(t => t.promotion_id === promo.id);
                                                return (
                                                    <div key={promo.id} className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm transition-all ${promo.active ? 'border-gray-200 dark:border-slate-800' : 'border-red-200 dark:border-red-900 opacity-60'}`}>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3 mb-1">
                                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{promo.name}</h3>
                                                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${promo.type === 'percentage' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : promo.type === 'bogo' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'}`}>
                                                                        {promo.type === 'percentage' ? `${promo.discount_value}% OFF` : promo.type === 'bogo' ? 'BOGO' : `C$${promo.discount_value} OFF`}
                                                                    </span>
                                                                    {promo.is_automatic && <span className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-lg text-xs font-bold">⚡ Auto</span>}
                                                                    {promo.allow_stacking && <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 px-2 py-0.5 rounded-lg text-xs font-bold">{lang === 'es' ? 'Acumulable' : 'Stackable'}</span>}
                                                                    {!promo.active && <span className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded-lg text-xs font-bold">{lang === 'es' ? 'Inactiva' : 'Inactive'}</span>}
                                                                </div>
                                                                {promo.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{promo.description}</p>}
                                                                <div className="flex gap-2 flex-wrap mt-2">
                                                                    {promo.schedule_rules?.days && (
                                                                        <span className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg font-semibold">
                                                                            📅 {promo.schedule_rules.days.map((d: number) => dayLabels[d]).join(', ')} {promo.schedule_rules.timeStart}–{promo.schedule_rules.timeEnd}
                                                                        </span>
                                                                    )}
                                                                    {targets.map(t => (
                                                                        <span key={t.id} className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg font-semibold">
                                                                            🎯 {t.target_type === 'all' ? (lang === 'es' ? 'Todo el menú' : 'Entire Menu') : t.target_type === 'category' ? `Cat: ${menuCategories.find((c: any) => c.id === t.target_id)?.name || t.target_id}` : `Item: ${items.find(i => i.id === t.target_id)?.name || t.target_id}`}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 ml-4">
                                                                <button onClick={() => togglePromoActive(promo.id, promo.active)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${promo.active ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:border-red-800 dark:text-red-300' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:border-green-800 dark:text-green-300'}`}>
                                                                    {promo.active ? (lang === 'es' ? 'Desactivar' : 'Deactivate') : (lang === 'es' ? 'Activar' : 'Activate')}
                                                                </button>
                                                                <button onClick={() => openEditPromo(promo)} className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">{lang === 'es' ? 'Editar' : 'Edit'}</button>
                                                                <button onClick={() => deletePromotion(promo.id)} className="bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">🗑</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Create / Edit Promo Modal */}
                                    {showPromoForm && (
                                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-800">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{editingPromo ? (lang === 'es' ? 'Editar Promoción' : 'Edit Promotion') : (lang === 'es' ? 'Nueva Promoción' : 'New Promotion')}</h2>
                                                    <button onClick={() => { setShowPromoForm(false); resetPromoForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold">✕</button>
                                                </div>

                                                <div className="space-y-5">
                                                    {/* Name & Description */}
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{lang === 'es' ? 'Nombre *' : 'Name *'}</label>
                                                        <input value={promoForm.name} onChange={e => setPromoForm({ ...promoForm, name: e.target.value })} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100" placeholder={lang === 'es' ? "Happy Hour Viernes" : "Friday Happy Hour"} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{lang === 'es' ? 'Descripción' : 'Description'}</label>
                                                        <input value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100" placeholder={lang === 'es' ? "Descuento para bebidas los viernes" : "Discount for drinks on Friday"} />
                                                    </div>

                                                    {/* Type */}
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{lang === 'es' ? 'Tipo de Descuento *' : 'Discount Type *'}</label>
                                                        <div className="flex gap-3">
                                                            {[{ v: 'percentage', l: lang === 'es' ? '% Porcentaje' : '% Percentage' }, { v: 'fixed_amount', l: lang === 'es' ? 'C$ Fijo' : 'Fixed Amount' }, { v: 'bogo', l: 'BOGO (2x1)' }].map(opt => (
                                                                <button key={opt.v} onClick={() => setPromoForm({ ...promoForm, type: opt.v })} className={`flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${promoForm.type === opt.v ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400'}`}>
                                                                    {opt.l}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Discount Value (for percentage / fixed) */}
                                                    {promoForm.type !== 'bogo' && (
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{lang === 'es' ? 'Valor del Descuento *' : 'Discount Value *'}</label>
                                                            <input type="number" value={promoForm.discount_value} onChange={e => setPromoForm({ ...promoForm, discount_value: e.target.value })} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100" placeholder={promoForm.type === 'percentage' ? (lang === 'es' ? '20 (para 20%)' : '20 (for 20%)') : (lang === 'es' ? '50 (para C$50)' : '50 (for $50)')} />
                                                        </div>
                                                    )}

                                                    {/* BOGO Rules */}
                                                    {promoForm.type === 'bogo' && (
                                                        <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-2xl p-5">
                                                            <h4 className="font-bold text-purple-800 dark:text-purple-200 mb-3">{lang === 'es' ? '⚡ Configuración BOGO' : '⚡ BOGO Settings'}</h4>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">{lang === 'es' ? 'Compra (cantidad)' : 'Buy (quantity)'}</label>
                                                                    <input type="number" value={promoForm.bogo_buy_qty} onChange={e => setPromoForm({ ...promoForm, bogo_buy_qty: e.target.value })} className="w-full border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">{lang === 'es' ? 'Llévate (cantidad)' : 'Get (quantity)'}</label>
                                                                    <input type="number" value={promoForm.bogo_get_qty} onChange={e => setPromoForm({ ...promoForm, bogo_get_qty: e.target.value })} className="w-full border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">{lang === 'es' ? 'Tipo de descuento gratis' : 'Free Item Discount Type'}</label>
                                                                    <select value={promoForm.bogo_discount_type} onChange={e => setPromoForm({ ...promoForm, bogo_discount_type: e.target.value })} className="w-full border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
                                                                        <option value="percentage">{lang === 'es' ? 'Porcentaje' : 'Percentage'}</option>
                                                                        <option value="fixed_amount">{lang === 'es' ? 'Monto Fijo' : 'Fixed Amount'}</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">{lang === 'es' ? 'Valor (100 = gratis)' : 'Value (100 = free)'}</label>
                                                                    <input type="number" value={promoForm.bogo_discount_value} onChange={e => setPromoForm({ ...promoForm, bogo_discount_value: e.target.value })} className="w-full border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100" />
                                                                </div>
                                                                <div className="col-span-2 mt-2">
                                                                    <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-2">{lang === 'es' ? 'Producto a Recibir (Cross-Item BOGO)' : 'Reward Item (Cross-Item BOGO)'}</label>
                                                                    <div className="flex gap-2 mb-2">
                                                                        {[{ v: 'same', l: lang === 'es' ? '🔁 Mismo Producto' : '🔁 Same Product' }, { v: 'category', l: lang === 'es' ? '📁 Categoría' : '📁 Category' }, { v: 'item', l: lang === 'es' ? '🍔 Ítem' : '🍔 Item' }].map(opt => (
                                                                            <button key={opt.v} onClick={() => setPromoForm({ ...promoForm, bogo_get_target_type: opt.v, bogo_get_target_id: '' })} className={`flex-1 py-1.5 rounded-lg font-bold text-xs border-2 transition-all ${promoForm.bogo_get_target_type === opt.v ? 'border-purple-500 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'border-purple-200 dark:border-purple-800 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/50'}`}>
                                                                                {opt.l}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    {promoForm.bogo_get_target_type === 'category' && (
                                                                        <select value={promoForm.bogo_get_target_id} onChange={e => setPromoForm({ ...promoForm, bogo_get_target_id: e.target.value })} className="w-full border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-sm">
                                                                            <option value="">{lang === 'es' ? 'Selecciona una categoría...' : 'Select a category...'}</option>
                                                                            {menuCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                                        </select>
                                                                    )}
                                                                    {promoForm.bogo_get_target_type === 'item' && (
                                                                        <select value={promoForm.bogo_get_target_id} onChange={e => setPromoForm({ ...promoForm, bogo_get_target_id: e.target.value })} className="w-full border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-sm">
                                                                            <option value="">{lang === 'es' ? 'Selecciona un ítem...' : 'Select an item...'}</option>
                                                                            {items.filter(i => i.type === 'product' || i.type === 'combo').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                                                        </select>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Target */}
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{lang === 'es' ? '¿A qué aplica?' : 'Applies to'}</label>
                                                        <div className="flex gap-3 mb-3">
                                                            {[{ v: 'all', l: lang === 'es' ? '🌐 Todo el menú' : '🌐 Entire Menu' }, { v: 'category', l: lang === 'es' ? '📁 Categorías' : '📁 Categories' }, { v: 'item', l: lang === 'es' ? '🍔 Ítems específicos' : '🍔 Specific Items' }].map(opt => (
                                                                <button key={opt.v} onClick={() => setPromoForm({ ...promoForm, target_type: opt.v, target_ids: [] })} className={`flex-1 py-2 rounded-xl font-bold text-xs border-2 transition-all ${promoForm.target_type === opt.v ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400'}`}>
                                                                    {opt.l}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {promoForm.target_type !== 'all' && (
                                                            <div>
                                                                {/* Selected options capsules */}
                                                                {promoForm.target_ids.length > 0 && (
                                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                                        {promoForm.target_ids.map(id => {
                                                                            const name = promoForm.target_type === 'category'
                                                                                ? menuCategories.find(c => c.id === id)?.name
                                                                                : items.find(i => i.id === id)?.name;
                                                                            if (!name) return null;
                                                                            return (
                                                                                <span key={id} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-800 border border-primary-200 dark:bg-primary-900/50 dark:text-primary-200 dark:border-primary-800">
                                                                                    {name}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setPromoForm({ ...promoForm, target_ids: promoForm.target_ids.filter(itemId => itemId !== id) })}
                                                                                        className="hover:text-primary-950 font-black ml-1 text-sm"
                                                                                    >
                                                                                        ×
                                                                                    </button>
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}

                                                                {/* Searchable Select Dropdown Input */}
                                                                <div className="relative">
                                                                    <div className="relative">
                                                                        <input
                                                                            type="text"
                                                                            placeholder={promoForm.target_type === 'category' ? (lang === 'es' ? 'Buscar categorías...' : 'Search categories...') : (lang === 'es' ? 'Buscar productos...' : 'Search products...')}
                                                                            value={searchQuery}
                                                                            onChange={(e) => {
                                                                                setSearchQuery(e.target.value);
                                                                                setDropdownOpen(true);
                                                                            }}
                                                                            onFocus={() => setDropdownOpen(true)}
                                                                            className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                                        />
                                                                        <span className="absolute right-4 top-2 text-gray-400 pointer-events-none">🔍</span>
                                                                    </div>

                                                                    {/* Options Dropdown list */}
                                                                    {dropdownOpen && (
                                                                        <>
                                                                            {/* Backdrop */}
                                                                            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                                                                            
                                                                            <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20">
                                                                                {(() => {
                                                                                    const options = promoForm.target_type === 'category'
                                                                                        ? menuCategories
                                                                                        : items.filter(i => i.type === 'product' || i.type === 'combo');
                                                                                    
                                                                                    const filtered = options.filter(opt =>
                                                                                        opt.name.toLowerCase().includes(searchQuery.toLowerCase())
                                                                                    );

                                                                                    if (filtered.length === 0) {
                                                                                        return (
                                                                                            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                                                                {lang === 'es' ? 'No se encontraron resultados' : 'No results found'}
                                                                                            </div>
                                                                                        );
                                                                                    }

                                                                                    return filtered.map(opt => {
                                                                                        const isSelected = promoForm.target_ids.includes(opt.id);
                                                                                        return (
                                                                                            <button
                                                                                                key={opt.id}
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    const newIds = isSelected
                                                                                                        ? promoForm.target_ids.filter(id => id !== opt.id)
                                                                                                        : [...promoForm.target_ids, opt.id];
                                                                                                    setPromoForm({ ...promoForm, target_ids: newIds });
                                                                                                }}
                                                                                                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 ${isSelected ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-300 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}
                                                                                            >
                                                                                                <span>{opt.name}</span>
                                                                                                {isSelected && <span className="text-primary-600 dark:text-primary-400 font-bold">✓</span>}
                                                                                            </button>
                                                                                        );
                                                                                    });
                                                                                })()}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Scheduling */}
                                                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                                                        <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-3">{lang === 'es' ? '📅 Horario (Happy Hour)' : '📅 Schedule (Happy Hour)'}</h4>
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {dayLabels.map((day, i) => (
                                                                <button key={i} onClick={() => setPromoForm({ ...promoForm, schedule_days: promoForm.schedule_days.includes(i) ? promoForm.schedule_days.filter(d => d !== i) : [...promoForm.schedule_days, i] })} className={`w-11 h-11 rounded-xl text-xs font-bold border-2 transition-all ${promoForm.schedule_days.includes(i) ? 'border-amber-500 bg-amber-100 text-amber-800' : 'border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500'}`}>
                                                                    {day}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">{lang === 'es' ? 'Hora Inicio' : 'Start Time'}</label>
                                                                <input type="time" value={promoForm.schedule_time_start} onChange={e => setPromoForm({ ...promoForm, schedule_time_start: e.target.value })} className="w-full border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">{lang === 'es' ? 'Hora Fin' : 'End Time'}</label>
                                                                <input type="time" value={promoForm.schedule_time_end} onChange={e => setPromoForm({ ...promoForm, schedule_time_end: e.target.value })} className="w-full border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Flags */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <label className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 p-4 rounded-xl cursor-pointer">
                                                            <input type="checkbox" checked={promoForm.is_automatic} onChange={e => setPromoForm({ ...promoForm, is_automatic: e.target.checked })} className="w-5 h-5 rounded" />
                                                            <div>
                                                                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{lang === 'es' ? '⚡ Automática' : '⚡ Automatic'}</span>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Se aplica sin intervención del mesero' : 'Applies without server intervention'}</p>
                                                            </div>
                                                        </label>
                                                        <label className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 p-4 rounded-xl cursor-pointer">
                                                            <input type="checkbox" checked={promoForm.allow_stacking} onChange={e => setPromoForm({ ...promoForm, allow_stacking: e.target.checked })} className="w-5 h-5 rounded" />
                                                            <div>
                                                                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{lang === 'es' ? '🔗 Acumulable' : '🔗 Stackable'}</span>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Se puede sumar con otras promociones' : 'Can be combined with other promotions'}</p>
                                                            </div>
                                                        </label>
                                                    </div>

                                                    {/* Priority & Min Order */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{lang === 'es' ? 'Prioridad' : 'Priority'}</label>
                                                            <input type="number" value={promoForm.priority} onChange={e => setPromoForm({ ...promoForm, priority: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{lang === 'es' ? 'Monto Mín. (C$)' : 'Min. Order Amount'}</label>
                                                            <input type="number" value={promoForm.min_order_amount} onChange={e => setPromoForm({ ...promoForm, min_order_amount: e.target.value })} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100" placeholder={lang === 'es' ? "Opcional" : "Optional"} />
                                                        </div>
                                                    </div>

                                                    {/* Date Range */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{lang === 'es' ? 'Fecha Inicio' : 'Start Date'}</label>
                                                            <input type="date" value={promoForm.start_date} onChange={e => setPromoForm({ ...promoForm, start_date: e.target.value })} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{lang === 'es' ? 'Fecha Fin' : 'End Date'}</label>
                                                            <input type="date" value={promoForm.end_date} onChange={e => setPromoForm({ ...promoForm, end_date: e.target.value })} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100" />
                                                        </div>
                                                    </div>

                                                    <button onClick={savePromotion} disabled={!promoForm.name || promoSaving} className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-bold text-lg shadow-sm transition-all">
                                                        {promoSaving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : editingPromo ? (lang === 'es' ? 'Actualizar Promoción' : 'Update Promotion') : (lang === 'es' ? 'Crear Promoción' : 'Create Promotion')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            
        </>
    );
}
