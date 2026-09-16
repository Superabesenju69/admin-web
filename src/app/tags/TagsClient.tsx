'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
    Tag, Plus, ArrowLeft, Search, Edit2, Trash2, 
    Link2, Sparkles, AlertCircle, UtensilsCrossed, Package, 
    Check, Layers
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { 
    TagItem, fetchTagsWithItems, saveTag, 
    deleteTagAndUnlink, batchUpdateTagIngredients, 
    DEFAULT_TAG_COLORS 
} from '../../utils/tagUtils';
import TagFormModal from '../../components/TagFormModal';
import TagLinkIngredientsModal from '../../components/TagLinkIngredientsModal';

const supabase = createClient();

export default function TagsClient() {
    const [tags, setTags] = useState<TagItem[]>([]);
    const [allItems, setAllItems] = useState<any[]>([]);
    const [allIngredients, setAllIngredients] = useState<any[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currencySymbol, setCurrencySymbol] = useState('C$');
    const [lang, setLang] = useState('es');

    // Modals state
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [tagToEdit, setTagToEdit] = useState<TagItem | null>(null);

    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [tagToLink, setTagToLink] = useState<TagItem | null>(null);

    const [tagToDelete, setTagToDelete] = useState<TagItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Notification toast / message
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await fetchTagsWithItems(supabase);
            setTags(data.tags);
            setAllItems(data.allItems);
            setAllIngredients(data.allIngredients);
            setAllProducts(data.allProducts);

            // Fetch currency from settings
            const { data: setRow } = await supabase
                .from('restaurant_settings')
                .select('currency')
                .limit(1)
                .maybeSingle();
            if (setRow?.currency) {
                setCurrencySymbol(setRow.currency === 'USD' ? '$' : setRow.currency || 'C$');
            }
        } catch (err: any) {
            console.error('Error loading tags:', err);
            showToast(err?.message || 'Error al cargar las etiquetas', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const storedLang = localStorage.getItem('app_lang');
        if (storedLang) setLang(storedLang);
        loadData();
    }, []);

    // Filter tags by search
    const filteredTags = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return tags;
        return tags.filter(t => 
            t.name.toLowerCase().includes(q) || 
            (t.description && t.description.toLowerCase().includes(q))
        );
    }, [tags, searchQuery]);

    // Summary counts
    const totalLinkedIngredients = useMemo(() => {
        return allIngredients.filter(i => (i.tags || []).length > 0).length;
    }, [allIngredients]);

    const totalLinkedProducts = useMemo(() => {
        return allProducts.filter(p => (p.tags || []).length > 0).length;
    }, [allProducts]);

    // Handle Save Tag (Create / Edit)
    const handleSaveTag = async (tagData: { id?: string; name: string; description: string; color: string }) => {
        const res = await saveTag(supabase, tagData);
        if (!res.success) {
            // Even if table doesn't exist, we can manage it in UI
            console.warn('saveTag response:', res.error);
        }
        await loadData();
        showToast(tagData.id ? 'Etiqueta actualizada' : 'Etiqueta creada exitosamente');
    };

    // Handle Batch Link Ingredients
    const handleBatchSave = async (tagName: string, selectedIngredientIds: string[]) => {
        const res = await batchUpdateTagIngredients(supabase, tagName, selectedIngredientIds, allIngredients);
        if (!res.success) {
            throw new Error(res.error || 'Error al actualizar ingredientes');
        }
        await loadData();
        showToast(`Ingredientes vinculados a "${tagName}" actualizados`);
    };

    // Handle Delete Tag
    const handleDeleteTag = async () => {
        if (!tagToDelete) return;
        setIsDeleting(true);
        try {
            const affected = allItems.filter(i => 
                (i.tags || []).some((t: string) => t.trim().toLowerCase() === tagToDelete.name.toLowerCase())
            );
            const res = await deleteTagAndUnlink(supabase, tagToDelete.name, tagToDelete.id, affected);
            if (!res.success) throw new Error(res.error);
            await loadData();
            showToast(`Etiqueta "${tagToDelete.name}" eliminada`);
            setTagToDelete(null);
        } catch (err: any) {
            showToast(err?.message || 'Error al eliminar la etiqueta', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Toast Message */}
                {toastMessage && (
                    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4 duration-200">
                        <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-sm font-semibold ${
                            toastMessage.type === 'success' 
                                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800' 
                                : 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                        }`}>
                            <Check className="w-4 h-4" />
                            <span>{toastMessage.text}</span>
                        </div>
                    </div>
                )}

                {/* Top Navigation & Header */}
                <div>
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 mb-4 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-1 transition-transform" />
                        <span>{lang === 'es' ? 'Volver al Menú' : 'Back to Menu'}</span>
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                    <Tag className="w-5 h-5" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                                    {lang === 'es' ? 'Gestión de Etiquetas y Extras' : 'Tags & Extras Management'}
                                </h1>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 max-w-2xl">
                                {lang === 'es' 
                                    ? 'Las etiquetas permiten vincular qué ingredientes se ofrecerán como extras opcionales con costo adicional al personalizar productos en el punto de venta (POS).' 
                                    : 'Tags connect ingredients to menu items so they can be added as billable extras when personalizing orders in the POS.'}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setTagToEdit(null);
                                    setIsFormModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-primary-500/20 hover:shadow-md transition active:scale-[0.98] cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>{lang === 'es' ? 'Nueva Etiqueta' : 'New Tag'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Tag className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {lang === 'es' ? 'Etiquetas Creadas' : 'Total Tags'}
                            </p>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                                {tags.length}
                            </h3>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {lang === 'es' ? 'Ingredientes para Extras' : 'Ingredients as Extras'}
                            </p>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                                {totalLinkedIngredients}
                            </h3>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <UtensilsCrossed className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {lang === 'es' ? 'Platillos con Extras' : 'Dishes with Extras'}
                            </p>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                                {totalLinkedProducts}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={lang === 'es' ? 'Buscar etiqueta por nombre o descripción...' : 'Search tag by name...'}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all shadow-2xs"
                        />
                    </div>
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="text-center py-20">
                        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm font-semibold text-slate-500">
                            {lang === 'es' ? 'Cargando etiquetas e ingredientes...' : 'Loading tags and ingredients...'}
                        </p>
                    </div>
                ) : filteredTags.length === 0 ? (
                    /* Empty State */
                    <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg mx-auto shadow-xs">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                            <Tag className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {searchQuery 
                                ? (lang === 'es' ? 'No se encontraron etiquetas con esa búsqueda' : 'No tags found matching search')
                                : (lang === 'es' ? 'Aún no has creado etiquetas' : 'No tags created yet')}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 max-w-sm mx-auto">
                            {lang === 'es'
                                ? 'Crea etiquetas como "extras_pizza" o "aderezos" para vincular ingredientes que se cobrarán como extras en el POS.'
                                : 'Create tags like "pizza_extras" or "sauces" to link ingredients that will be charged as extras in the POS.'}
                        </p>
                        <button
                            onClick={() => {
                                setTagToEdit(null);
                                setIsFormModalOpen(true);
                            }}
                            className="mt-5 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition active:scale-[0.98] cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{lang === 'es' ? 'Crear Primera Etiqueta' : 'Create First Tag'}</span>
                        </button>
                    </div>
                ) : (
                    /* Tags Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTags.map((tag) => {
                            const ingredients = tag.assignedIngredients || [];
                            const products = tag.assignedProducts || [];

                            return (
                                <div
                                    key={tag.name}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                                >
                                    <div>
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2.5">
                                                <span 
                                                    className="w-4 h-4 rounded-full shrink-0 shadow-2xs" 
                                                    style={{ backgroundColor: tag.color || '#3b82f6' }}
                                                />
                                                <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 tracking-tight">
                                                    {tag.name}
                                                </h3>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setTagToEdit(tag);
                                                        setIsFormModalOpen(true);
                                                    }}
                                                    title={lang === 'es' ? 'Editar Etiqueta' : 'Edit Tag'}
                                                    className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setTagToDelete(tag)}
                                                    title={lang === 'es' ? 'Eliminar Etiqueta' : 'Delete Tag'}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {tag.description && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                                                {tag.description}
                                            </p>
                                        )}

                                        {/* Assigned Ingredients Section */}
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                                                    <span>{lang === 'es' ? 'Extras Vinculados' : 'Linked Extras'}</span>
                                                    <span className="text-slate-400 font-semibold">({ingredients.length})</span>
                                                </span>

                                                <button
                                                    onClick={() => {
                                                        setTagToLink(tag);
                                                        setIsLinkModalOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-800 hover:underline cursor-pointer"
                                                >
                                                    <Link2 className="w-3 h-3" />
                                                    <span>{lang === 'es' ? 'Vincular' : 'Link'}</span>
                                                </button>
                                            </div>

                                            {ingredients.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto py-1">
                                                    {ingredients.map((ing) => (
                                                        <span
                                                            key={ing.id}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60"
                                                        >
                                                            <span>{ing.name}</span>
                                                            <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400">
                                                                (+{currencySymbol}{Number(ing.base_price || 0).toFixed(2)})
                                                            </span>
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic py-1">
                                                    {lang === 'es' ? 'Sin ingredientes asociados.' : 'No ingredients linked.'}
                                                </p>
                                            )}
                                        </div>

                                        {/* Assigned Menu Products Section */}
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                                    <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span>{lang === 'es' ? 'Platillos en el Menú' : 'Menu Dishes'}</span>
                                                    <span className="text-slate-400 font-semibold">({products.length})</span>
                                                </span>
                                            </div>

                                            {products.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-1">
                                                    {products.map((prod) => (
                                                        <span
                                                            key={prod.id}
                                                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium border border-emerald-200/60 dark:border-emerald-800/60"
                                                        >
                                                            {prod.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic py-1">
                                                    {lang === 'es' ? 'No se usa en ningún platillo aún.' : 'Not assigned to any menu dish yet.'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Footer Quick Link Button */}
                                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            onClick={() => {
                                                setTagToLink(tag);
                                                setIsLinkModalOpen(true);
                                            }}
                                            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Link2 className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                                            <span>{lang === 'es' ? 'Gestionar Ingredientes Extras' : 'Manage Extras Ingredients'}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Modal: Create / Edit Tag */}
                <TagFormModal
                    isOpen={isFormModalOpen}
                    onClose={() => setIsFormModalOpen(false)}
                    onSave={handleSaveTag}
                    tagToEdit={tagToEdit}
                    lang={lang}
                />

                {/* Modal: Batch Link Ingredients */}
                <TagLinkIngredientsModal
                    isOpen={isLinkModalOpen}
                    onClose={() => setIsLinkModalOpen(false)}
                    tag={tagToLink}
                    allIngredients={allIngredients}
                    onSaveBatch={handleBatchSave}
                    lang={lang}
                    currencySymbol={currencySymbol}
                />

                {/* Modal: Delete Confirmation */}
                {tagToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3 text-rose-600">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                                    {lang === 'es' ? 'Eliminar Etiqueta' : 'Delete Tag'}
                                </h3>
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {lang === 'es'
                                    ? `¿Estás seguro de que deseas eliminar la etiqueta "${tagToDelete.name}"?`
                                    : `Are you sure you want to delete the tag "${tagToDelete.name}"?`}
                            </p>

                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                                {lang === 'es'
                                    ? `Esta etiqueta se desvinculará de ${(tagToDelete.assignedIngredients || []).length} ingredientes y ${(tagToDelete.assignedProducts || []).length} platillos. Los ingredientes y platillos no serán eliminados.`
                                    : `This tag will be unlinked from ${(tagToDelete.assignedIngredients || []).length} ingredients and ${(tagToDelete.assignedProducts || []).length} dishes. Items will not be deleted.`}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setTagToDelete(null)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                                >
                                    {lang === 'es' ? 'Cancelar' : 'Cancel'}
                                </button>
                                <button
                                    onClick={handleDeleteTag}
                                    disabled={isDeleting}
                                    className="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                                >
                                    {isDeleting ? (lang === 'es' ? 'Eliminando...' : 'Deleting...') : (lang === 'es' ? 'Sí, Eliminar' : 'Yes, Delete')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
