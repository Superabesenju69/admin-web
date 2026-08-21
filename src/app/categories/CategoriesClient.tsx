"use client";

import { Folder, ArrowUpDown } from "lucide-react";
import { Header } from "@/components/Header";
import { CategoryFormModal } from "@/components/CategoryFormModal";
import { useState, useEffect } from "react";

export default function CategoriesClient({ categories, error, categoryType }: any) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [lang, setLang] = useState<'en'|'es'>('es');

    useEffect(() => {
        const saved = localStorage.getItem('pos_language');
        if (saved === 'en' || saved === 'es') setLang(saved);
    }, []);

    if (error) {
        return (
            <div className="p-8 text-red-500">
                <h1>{lang === 'es' ? 'Error al cargar categorías:' : 'Error loading categories:'}</h1>
                <p>{error.message}</p>
            </div>
        );
    }

    return (
        <div className="h-screen flex bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
            <Header />

            <main className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-6xl mx-auto">
                    <header className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                                {categoryType === 'inventory' ? (lang === 'es' ? 'Categorías de Inventario' : 'Inventory Categories') : (lang === 'es' ? 'Categorías de Menú' : 'Menu Categories')}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">
                                {categoryType === 'inventory'
                                    ? (lang === 'es' ? 'Organiza tus ingredientes en grupos para facilitar la gestión.' : 'Organize your ingredients into groups for easier management.')
                                    : (lang === 'es' ? 'Organiza tus artículos en grupos para el POS y los Menús.' : 'Organize your items into groups for the POS and Menus.')}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors text-sm"
                        >
                            + {lang === 'es' ? 'Nueva Categoría' : 'New Category'}
                        </button>
                    </header>

                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400 w-16"></th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Nombre de Categoría' : 'Category Name'}</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Conteo de Artículos' : 'Items Count'}</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400 text-right">{lang === 'es' ? 'Acciones' : 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {categories?.map((category: any) => (
                                        <tr key={category.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 dark:text-gray-400">
                                                <ArrowUpDown className="w-4 h-4" />
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-3">
                                                <div className="bg-primary-50 text-primary-600 p-2 rounded-lg">
                                                    <Folder className="w-4 h-4" />
                                                </div>
                                                {category.name}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <span className="inline-flex items-center justify-center bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                                    {category.item_categories[0]?.count || 0} {lang === 'es' ? 'artículos' : 'items'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-primary-600 hover:text-primary-800 font-medium text-sm transition-colors opacity-0 group-hover:opacity-100">
                                                    {lang === 'es' ? 'Editar' : 'Edit'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {categories?.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                {lang === 'es' ? 'No se encontraron categorías. ¡Crea una para organizar tu menú!' : 'No categories found. Create one to organize your menu!'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            <CategoryFormModal
                isOpen={isModalOpen}
                categoryType={categoryType}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}
