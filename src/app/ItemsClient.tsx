"use client";

import { useState, useEffect } from "react";
import { Package, Utensils, Beaker } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";

type ItemTypeFilter = "all" | "ingredient" | "product" | "combo";

export default function ItemsClient({ items, error }: any) {
    const [activeTab, setActiveTab] = useState<ItemTypeFilter>("all");
    const [lang, setLang] = useState<'es' | 'en'>('es');

    useEffect(() => {
        const saved = localStorage.getItem('pos_language');
        if (saved === 'en' || saved === 'es') setLang(saved);
    }, []);

    if (error) {
        return (
            <div className="p-8 text-red-500">
                <h1>{lang === 'es' ? 'Error al cargar artículos:' : 'Error loading items:'}</h1>
                <p>{error.message}</p>
            </div>
        );
    }

    const filteredItems = items?.filter((item: any) =>
        activeTab === "all" ? true : item.type === activeTab
    ) || [];

    return (
        <div className="h-screen flex bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
            <Header />

            <main className="flex-1 overflow-y-auto w-full">
                <div className="max-w-6xl mx-auto p-8">
                    <header className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{lang === 'es' ? 'Gestión de Artículos' : 'Items Management'}</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">{lang === 'es' ? 'Administra tus ingredientes, productos y combos.' : 'Manage your ingredients, products, and combos.'}</p>
                        </div>
                        <Link href="/items/new" className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors text-sm">
                            {lang === 'es' ? '+ Nuevo Artículo' : '+ New Item'}
                        </Link>
                    </header>

                    {/* Custom Tabs */}
                    <div className="mb-6 border-b border-gray-200 dark:border-slate-800">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            {[
                                { id: "all", label: lang === 'es' ? 'Todos los Artículos' : 'All Items' },
                                { id: "ingredient", label: lang === 'es' ? 'Ingredientes' : 'Ingredients' },
                                { id: "product", label: lang === 'es' ? 'Productos' : 'Products' },
                                { id: "combo", label: 'Combos' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as ItemTypeFilter)}
                                    className={`
                  whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                  ${activeTab === tab.id
                                            ? "border-primary-500 text-primary-600"
                                            : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700"
                                        }
                `}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-100">
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400 w-16">{lang === 'es' ? 'Imagen' : 'Image'}</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Nombre del Artículo' : 'Item Name'}</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Tipo' : 'Type'}</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Etiquetas' : 'Tags'}</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Estado de Inventario' : 'Inventory Status'}</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400 text-right">{lang === 'es' ? 'Acciones' : 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredItems.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-primary-50/30 transition-colors group">
                                            <td className="px-6 py-3">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-slate-800 shadow-sm" />
                                                ) : (
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-gray-100 ${getTypeColor(item.type).split(' ')[0]}`}>
                                                        <span className={`text-lg font-bold ${getTypeColor(item.type).split(' ')[1]}`}>{item.name.charAt(0)}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">{item.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                                                    {getTypeIcon(item.type)}
                                                    <span className="capitalize">{lang === 'es' ? (item.type === 'combo' ? 'Combo' : item.type === 'ingredient' ? 'Ingrediente' : 'Producto') : item.type}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {(item.tags || []).map((t: string) => (
                                                        <span key={t} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                            {t}
                                                        </span>
                                                    ))}
                                                    {(!item.tags || item.tags.length === 0) && (
                                                        <span className="text-xs text-slate-400 italic">{lang === 'es' ? 'Sin etiquetas' : 'No tags'}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.track_inventory ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${item.stock_level > 20 ? 'bg-green-500' : 'bg-amber-500'}`} />
                                                        <span className="text-sm font-medium text-gray-700">{item.stock_level} {lang === 'es' ? 'unidades' : 'units'}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-400 italic">{lang === 'es' ? 'No rastreado' : 'Not tracked'}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link href={`/items/${item.id}`} className="text-primary-600 hover:text-primary-800 font-medium text-sm transition-colors">
                                                    {lang === 'es' ? 'Editar' : 'Edit'}
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredItems.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Package className="w-8 h-8 text-gray-300" />
                                                    <p>{lang === 'es' ? 'No se encontraron artículos.' : `No items found for ${activeTab === "all" ? "your database" : `the type "${activeTab}"`}.`}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Helper functions for UI
function getTypeColor(type: string) {
    switch (type) {
        case 'ingredient': return 'bg-amber-50 text-amber-700';
        case 'product': return 'bg-primary-50 text-primary-700';
        case 'combo': return 'bg-purple-50 text-purple-700';
        default: return 'bg-gray-50 text-gray-700';
    }
}

function getTypeIcon(type: string) {
    switch (type) {
        case 'ingredient': return <Beaker className="w-3.5 h-3.5" />;
        case 'product': return <Utensils className="w-3.5 h-3.5" />;
        case 'combo': return <Package className="w-3.5 h-3.5" />;
        default: return null;
    }
}
