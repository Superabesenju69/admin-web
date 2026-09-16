"use client";

import { Folder, ArrowUpDown, ChevronUp, ChevronDown, Pencil, Trash2, ArrowLeft, AlertTriangle, X, Plus } from "lucide-react";
import { Header } from "@/components/Header";
import { CategoryFormModal } from "@/components/CategoryFormModal";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function CategoriesClient({ categories: initialCategories, error, categoryType }: any) {
    const router = useRouter();
    const supabase = createClient();

    const [categories, setCategories] = useState<any[]>(initialCategories || []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<any | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [lang, setLang] = useState<'en'|'es'>('es');

    useEffect(() => {
        const saved = localStorage.getItem('pos_language');
        if (saved === 'en' || saved === 'es') setLang(saved);
    }, []);

    useEffect(() => {
        if (initialCategories) {
            setCategories(initialCategories);
        }
    }, [initialCategories]);

    const handleOpenCreate = () => {
        setCategoryToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (category: any) => {
        setCategoryToEdit(category);
        setIsModalOpen(true);
    };

    const handleModalSuccess = (savedCat?: any) => {
        if (!savedCat) {
            router.refresh();
            return;
        }

        setCategories((prev) => {
            const index = prev.findIndex((c) => c.id === savedCat.id);
            if (index >= 0) {
                const updated = [...prev];
                updated[index] = {
                    ...prev[index],
                    ...savedCat,
                    item_categories: savedCat.item_categories ?? prev[index].item_categories,
                };
                return updated.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
            } else {
                const nextList = [
                    ...prev,
                    {
                        ...savedCat,
                        item_categories: savedCat.item_categories || [{ count: 0 }],
                    },
                ];
                return nextList.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
            }
        });
        router.refresh();
    };

    const handleConfirmDelete = async () => {
        if (!categoryToDelete) return;
        setIsDeleting(true);
        setDeleteError(null);

        try {
            // First unlink from item_categories
            await supabase.from("item_categories").delete().eq("category_id", categoryToDelete.id);
            // Then delete category
            const { error: delErr } = await supabase.from("categories").delete().eq("id", categoryToDelete.id);
            if (delErr) throw delErr;

            setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
            setCategoryToDelete(null);
            router.refresh();
        } catch (err: any) {
            console.error("Error deleting category:", err);
            setDeleteError(err.message || (lang === 'es' ? 'Error al eliminar la categoría' : 'Error deleting category'));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= categories.length) return;

        const currentCat = categories[index];
        const targetCat = categories[targetIndex];

        let currentOrder = currentCat.display_order ?? index;
        let targetOrder = targetCat.display_order ?? targetIndex;
        if (currentOrder === targetOrder) {
            targetOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
        }

        const nextList = [...categories];
        nextList[index] = { ...currentCat, display_order: targetOrder };
        nextList[targetIndex] = { ...targetCat, display_order: currentOrder };
        nextList.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
        setCategories(nextList);

        try {
            await Promise.all([
                supabase.from("categories").update({ display_order: targetOrder }).eq("id", currentCat.id),
                supabase.from("categories").update({ display_order: currentOrder }).eq("id", targetCat.id),
            ]);
            router.refresh();
        } catch (e) {
            console.error("Error moving category order:", e);
        }
    };

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
                    {/* Breadcrumb / Back button */}
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-6 transition-colors group cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        <span>{categoryType === 'inventory' ? (lang === 'es' ? 'Volver a Inventario' : 'Back to Inventory') : (lang === 'es' ? 'Volver al Menú' : 'Back to Menu')}</span>
                    </Link>

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
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm shadow-primary-500/20 hover:shadow transition-colors text-sm cursor-pointer active:scale-[0.98]"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{lang === 'es' ? 'Nueva Categoría' : 'New Category'}</span>
                        </button>
                    </header>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800">
                                        <th className="px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-20 text-center">{lang === 'es' ? 'Orden' : 'Order'}</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{lang === 'es' ? 'Nombre de Categoría' : 'Category Name'}</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{lang === 'es' ? 'Conteo de Artículos' : 'Items Count'}</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">{lang === 'es' ? 'Acciones' : 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {categories?.map((category: any, index: number) => (
                                        <tr key={category.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-4 py-4 text-center">
                                                <div className="inline-flex items-center gap-1">
                                                    <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 w-5 text-right">
                                                        {category.display_order ?? index}
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <button
                                                            onClick={() => handleMoveOrder(index, 'up')}
                                                            disabled={index === 0}
                                                            className="p-0.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                                            title={lang === 'es' ? 'Subir' : 'Move up'}
                                                        >
                                                            <ChevronUp className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleMoveOrder(index, 'down')}
                                                            disabled={index === categories.length - 1}
                                                            className="p-0.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                                            title={lang === 'es' ? 'Bajar' : 'Move down'}
                                                        >
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                                                <div className="bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 p-2 rounded-xl">
                                                    <Folder className="w-4 h-4" />
                                                </div>
                                                <span className="text-base">{category.name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                <span className="inline-flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                                    {category.item_categories?.[0]?.count || 0} {lang === 'es' ? 'artículos' : 'items'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenEdit(category)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 dark:hover:bg-primary-900/60 border border-primary-200/50 dark:border-primary-800/50 transition-colors cursor-pointer"
                                                        title={lang === 'es' ? 'Editar categoría' : 'Edit category'}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                        <span>{lang === 'es' ? 'Editar' : 'Edit'}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setDeleteError(null);
                                                            setCategoryToDelete(category);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200/50 dark:border-red-800/50 transition-colors cursor-pointer"
                                                        title={lang === 'es' ? 'Eliminar categoría' : 'Delete category'}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>{lang === 'es' ? 'Eliminar' : 'Delete'}</span>
                                                    </button>
                                                </div>
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
                categoryToEdit={categoryToEdit}
                onClose={() => {
                    setIsModalOpen(false);
                    setCategoryToEdit(null);
                }}
                onSuccess={handleModalSuccess}
            />

            {/* Delete Confirmation Modal */}
            {categoryToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-red-50/50 dark:bg-red-950/20">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {lang === 'es' ? 'Eliminar Categoría' : 'Delete Category'}
                                </h2>
                            </div>
                            <button
                                onClick={() => {
                                    if (!isDeleting) {
                                        setCategoryToDelete(null);
                                        setDeleteError(null);
                                    }
                                }}
                                disabled={isDeleting}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            {deleteError && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-200 dark:border-red-900/50">
                                    {deleteError}
                                </div>
                            )}

                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                {lang === 'es' ? (
                                    <>¿Estás seguro de que deseas eliminar la categoría <strong className="text-gray-900 dark:text-white font-semibold">"{categoryToDelete.name}"</strong>?</>
                                ) : (
                                    <>Are you sure you want to delete category <strong className="text-gray-900 dark:text-white font-semibold">"{categoryToDelete.name}"</strong>?</>
                                )}
                            </p>

                            {((categoryToDelete.item_categories?.[0]?.count ?? 0) > 0) && (
                                <div className="mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                    <div>
                                        {lang === 'es' ? (
                                            <>Esta categoría tiene <strong className="font-semibold">{categoryToDelete.item_categories[0].count} artículo(s)</strong>. Al eliminarla, los artículos permanecerán intactos en el inventario pero quedarán desvinculados de esta categoría.</>
                                        ) : (
                                            <>This category has <strong className="font-semibold">{categoryToDelete.item_categories[0].count} item(s)</strong>. Deleting it will unlink the items without deleting them.</>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCategoryToDelete(null);
                                        setDeleteError(null);
                                    }}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {lang === 'es' ? 'Cancelar' : 'Cancel'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    disabled={isDeleting}
                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm shadow-red-500/20 hover:shadow transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {isDeleting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    <span>{lang === 'es' ? 'Eliminar' : 'Delete'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
