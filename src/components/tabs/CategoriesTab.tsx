import React, { useState } from 'react';
import { t } from '../../utils/i18n';
import Link from 'next/link';
import { Edit2, Plus } from 'lucide-react';

interface CategoriesTabProps {
    lang: string;
    items: any[];
    categories: any[];
    stations: any[];
    fmtCurrency: (amount: number, currency?: string) => string;
    typeColor: (type: string) => string;
}

export default function CategoriesTab({ lang, items, categories, stations, fmtCurrency, typeColor }: CategoriesTabProps) {
    const [activeCategory, setActiveCategory] = useState<string>('all');
    

    const menuCategories = categories.filter(c => c.type === 'menu');


    const menuItems = items.filter((i: any) => (i.type === 'product' || i.type === 'combo') && (activeCategory === 'all' || i.item_categories?.some((ic: any) => ic.category_id === activeCategory)));

    return (
        <>
            {/* ══════════ MENU TAB ══════════ */}
                            
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('menu.title', lang)}</h2>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{items.filter(i => i.type === 'product' || i.type === 'combo').length} {t('menu.items_count', lang)} · {menuCategories.length} {t('menu.categories_count', lang)}</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <Link href="/categories?type=menu" className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow transition">
                                                {t('menu.manage_categories', lang)}
                                            </Link>
                                            <Link href="/items/new?preset=menu" className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition">
                                                {t('menu.new_item', lang)}
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Category filter */}
                                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:pb-0">
                                        <button onClick={() => setActiveCategory('all')}
                                            className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeCategory === 'all' ? 'bg-primary-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}>
                                            {t('menu.all_categories', lang)}
                                        </button>
                                        {menuCategories.map((c: any) => (
                                            <button key={c.id} onClick={() => setActiveCategory(c.id)}
                                                className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold tracking-wider transition-all ${activeCategory === c.id ? 'bg-primary-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}>
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-gray-50/80 border-b border-gray-100">
                                                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-16">{t('menu.th_image', lang)}</th>
                                                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('menu.th_name', lang)}</th>
                                                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('menu.th_type', lang)}</th>
                                                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('menu.th_category', lang)}</th>
                                                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('menu.th_price', lang)}</th>
                                                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('menu.th_station', lang)}</th>
                                                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">{t('menu.th_actions', lang)}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {menuItems.map((item: any) => {
                                                    const station = stations.find((s: any) => s.id === item.station_id);
                                                    return (
                                                        <tr key={item.id} className="hover:bg-primary-50/30 transition group">
                                                            <td className="px-6 py-3">
                                                                {item.image_url ? (
                                                                    <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-slate-800 shadow-sm" />
                                                                ) : (
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-gray-100 ${typeColor(item.type).split(' ')[0]}`}>
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
                                                                <div className="flex flex-wrap gap-1">
                                                                    {item.item_categories?.map((ic: any) => {
                                                                        const cat = categories.find(c => c.id === ic.category_id);
                                                                        return cat ? (
                                                                            <span key={cat.id} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                                                                {cat.name}
                                                                            </span>
                                                                        ) : null;
                                                                    })}
                                                                    {(!item.item_categories || item.item_categories.length === 0) && (
                                                                        <span className="text-[10px] text-gray-400 italic">{t('menu.uncategorized', lang)}</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-600 font-mono font-medium">{fmtCurrency(item.base_price)}</td>
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
                                                                <Link href={`/items/${item.id}`} className="text-primary-600 hover:text-primary-800 text-sm font-bold opacity-0 group-hover:opacity-100 transition">
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
                            
        </>
    );
}
