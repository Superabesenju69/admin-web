import React, { useState } from 'react';
import { t } from '../../utils/i18n';
import Link from 'next/link';
import { FolderTree, Plus, Tag } from 'lucide-react';

interface CategoriesTabProps {
    lang: string;
    items: any[];
    categories: any[];
    stations: any[];
    fmtCurrency: (amount: number, currency?: string) => string;
    typeColor: (type: string) => string;
    settings?: any;
    CURRENCIES?: Record<string, { symbol: string; name: string; locale: string }>;
}

export default function CategoriesTab({ lang, items, categories, stations, fmtCurrency, typeColor, settings, CURRENCIES }: CategoriesTabProps) {
    const [activeCategory, setActiveCategory] = useState<string>('all');

    const menuCategories = categories.filter(c => c.type === 'menu');
    const totalMenuItems = items.filter(i => i.type === 'product' || i.type === 'combo');

    const menuItems = totalMenuItems.filter((i: any) => (
        activeCategory === 'all' || i.item_categories?.some((ic: any) => ic.category_id === activeCategory)
    ));

    return (
        <div>
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('menu.title', lang)}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {totalMenuItems.length} {t('menu.items_count', lang)} · {menuCategories.length} {t('menu.categories_count', lang)}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/categories?type=menu"
                        className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs hover:shadow-sm transition active:scale-[0.98]"
                    >
                        <FolderTree className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        <span>{t('menu.manage_categories', lang)}</span>
                    </Link>
                    <Link
                        href="/tags"
                        className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs hover:shadow-sm transition active:scale-[0.98]"
                    >
                        <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>{lang === 'es' ? 'Etiquetas de Extras' : 'Extras Tags'}</span>
                    </Link>
                    <Link
                        href="/items/new?preset=menu"
                        className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-primary-500/20 hover:shadow-md transition active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t('menu.new_item', lang)}</span>
                    </Link>
                </div>
            </div>

            {/* Category filter pills */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:pb-0">
                <button
                    onClick={() => setActiveCategory('all')}
                    className={`inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeCategory === 'all'
                            ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20 ring-2 ring-primary-500/30'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                    }`}
                >
                    <span>{t('menu.all_categories', lang)}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                        activeCategory === 'all'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                        {totalMenuItems.length}
                    </span>
                </button>

                {menuCategories.map((c: any) => {
                    const count = totalMenuItems.filter((i: any) =>
                        i.item_categories?.some((ic: any) => ic.category_id === c.id)
                    ).length;
                    const isActive = activeCategory === c.id;

                    return (
                        <button
                            key={c.id}
                            onClick={() => setActiveCategory(c.id)}
                            className={`inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isActive
                                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20 ring-2 ring-primary-500/30'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                            }`}
                        >
                            <span>{c.name}</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Menu Items Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/80 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-16">{t('menu.th_image', lang)}</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('menu.th_name', lang)}</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('menu.th_type', lang)}</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('menu.th_category', lang)}</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('menu.th_price', lang)}</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('menu.th_station', lang)}</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">{t('menu.th_actions', lang)}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {menuItems.map((item: any) => {
                                const station = stations.find((s: any) => s.id === item.station_id);
                                return (
                                    <tr key={item.id} className="hover:bg-primary-50/30 dark:hover:bg-slate-800/40 transition group">
                                        <td className="px-6 py-3">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-slate-800 shadow-sm" />
                                            ) : (
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-gray-100 dark:border-slate-800 ${typeColor(item.type).split(' ')[0]}`}>
                                                    <span className={`text-base font-bold ${typeColor(item.type).split(' ')[1]}`}>{item.name.charAt(0)}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">{item.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${typeColor(item.type)}`}>
                                                {lang === 'es' ? (item.type === 'combo' ? 'Combo' : item.type === 'ingredient' ? 'Ingrediente' : 'Producto') : (item.type || 'product')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {item.item_categories?.map((ic: any) => {
                                                    const cat = categories.find(c => c.id === ic.category_id);
                                                    return cat ? (
                                                        <span key={cat.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                                                            <Tag className="w-2.5 h-2.5 opacity-70" />
                                                            {cat.name}
                                                        </span>
                                                    ) : null;
                                                })}
                                                {(!item.item_categories || item.item_categories.length === 0) && (
                                                    <span className="text-xs text-gray-400 italic">{t('menu.uncategorized', lang)}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900 dark:text-gray-100 font-mono font-bold">
                                                {fmtCurrency(item.base_price)}
                                            </div>
                                            {(() => {
                                                const cs = settings?.attendance_settings?.currency_settings || settings?.currency_settings;
                                                const enableSec = cs?.enable_secondary_currency ?? settings?.enable_secondary_currency;
                                                const secCode = cs?.secondary_currency || settings?.secondary_currency || 'USD';
                                                const rate = Number(cs?.exchange_rate || settings?.exchange_rate) || 36.80;
                                                const secSymbol = CURRENCIES?.[secCode]?.symbol || '$';

                                                if (enableSec && rate > 0) {
                                                    const converted = (Number(item.base_price || 0) / rate).toFixed(2);
                                                    return (
                                                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded mt-0.5 border border-blue-200/50 dark:border-blue-900/40">
                                                            ≈ {secSymbol}{converted} {secCode}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {station ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm" style={{ backgroundColor: station.color }}>
                                                    {station.name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">{t('menu.no_station', lang)}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/items/${item.id}`} className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 text-sm font-bold opacity-0 group-hover:opacity-100 transition">
                                                {t('btn.edit', lang)} →
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                            {menuItems.length === 0 && (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">{t('menu.empty', lang)}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
