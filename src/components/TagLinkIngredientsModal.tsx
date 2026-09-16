import React, { useState, useEffect, useMemo } from 'react';
import { Tag, X, Search, CheckSquare, Square, Save, AlertCircle } from 'lucide-react';
import { TagItem } from '../utils/tagUtils';

interface TagLinkIngredientsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tag: TagItem | null;
    allIngredients: any[];
    onSaveBatch: (tagName: string, selectedIngredientIds: string[]) => Promise<void>;
    lang?: string;
    currencySymbol?: string;
}

export default function TagLinkIngredientsModal({
    isOpen,
    onClose,
    tag,
    allIngredients = [],
    onSaveBatch,
    lang = 'es',
    currencySymbol = 'C$'
}: TagLinkIngredientsModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (tag && isOpen) {
            const currentTagLower = tag.name.toLowerCase();
            const initialSelected = new Set<string>();
            allIngredients.forEach(ing => {
                if ((ing.tags || []).some((t: string) => t.trim().toLowerCase() === currentTagLower)) {
                    initialSelected.add(ing.id);
                }
            });
            setSelectedIds(initialSelected);
            setSearchQuery('');
            setError(null);
        }
    }, [tag, isOpen, allIngredients]);

    const filteredIngredients = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return allIngredients;
        return allIngredients.filter(ing => 
            ing.name.toLowerCase().includes(q) || 
            (ing.sku && ing.sku.toLowerCase().includes(q))
        );
    }, [allIngredients, searchQuery]);

    if (!isOpen || !tag) return null;

    const toggleIngredient = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAllFiltered = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            filteredIngredients.forEach(i => next.add(i.id));
            return next;
        });
    };

    const deselectAllFiltered = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            filteredIngredients.forEach(i => next.delete(i.id));
            return next;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await onSaveBatch(tag.name, Array.from(selectedIds));
            onClose();
        } catch (err: any) {
            setError(err?.message || (lang === 'es' ? 'Error al guardar los ingredientes vinculados' : 'Error saving linked ingredients'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
                            style={{ backgroundColor: tag.color || '#3b82f6' }}
                        >
                            <Tag className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                                    {lang === 'es' ? 'Vincular Ingredientes a' : 'Link Ingredients to'}
                                </h3>
                                <span 
                                    className="px-2.5 py-0.5 rounded-lg text-xs font-bold text-white"
                                    style={{ backgroundColor: tag.color || '#3b82f6' }}
                                >
                                    {tag.name}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {lang === 'es' 
                                    ? 'Marca los ingredientes que se ofrecerán como extras en los productos con esta etiqueta.' 
                                    : 'Check ingredients that will appear as extras on items with this tag.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter and Quick Actions Bar */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={lang === 'es' ? 'Buscar ingrediente por nombre o código...' : 'Search ingredient by name or SKU...'}
                            className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <button
                            type="button"
                            onClick={selectAllFiltered}
                            className="px-2.5 py-1 text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 rounded-lg font-semibold transition-colors cursor-pointer"
                        >
                            {lang === 'es' ? 'Marcar todos' : 'Select all'}
                        </button>
                        <button
                            type="button"
                            onClick={deselectAllFiltered}
                            className="px-2.5 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
                        >
                            {lang === 'es' ? 'Desmarcar todos' : 'Deselect all'}
                        </button>
                        <span className="text-gray-400 font-bold ml-1">
                            ({selectedIds.size} {lang === 'es' ? 'seleccionados' : 'selected'})
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="mx-6 mt-3 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium border border-red-200 dark:border-red-900/50 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Ingredient List */}
                <div className="flex-1 overflow-y-auto p-6 divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredIngredients.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
                            {lang === 'es' ? 'No se encontraron ingredientes en el catálogo.' : 'No ingredients found in catalog.'}
                        </div>
                    ) : (
                        filteredIngredients.map(ing => {
                            const isChecked = selectedIds.has(ing.id);
                            return (
                                <div
                                    key={ing.id}
                                    onClick={() => toggleIngredient(ing.id)}
                                    className={`py-3 px-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                                        isChecked 
                                            ? 'bg-primary-50/50 dark:bg-primary-950/20' 
                                            : 'hover:bg-gray-50 dark:hover:bg-slate-800/40'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="text-primary-600 dark:text-primary-400">
                                            {isChecked ? (
                                                <CheckSquare className="w-5 h-5 fill-primary-600 text-white dark:fill-primary-500" />
                                            ) : (
                                                <Square className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                                            )}
                                        </div>

                                        {ing.image_url ? (
                                            <img src={ing.image_url} alt={ing.name} className="w-9 h-9 rounded-lg object-cover border border-gray-100 dark:border-slate-800" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center text-xs">
                                                {ing.name.charAt(0)}
                                            </div>
                                        )}

                                        <div>
                                            <p className={`text-sm font-bold ${isChecked ? 'text-primary-900 dark:text-primary-200' : 'text-gray-900 dark:text-gray-100'}`}>
                                                {ing.name}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {lang === 'es' ? 'Stock:' : 'Stock:'} {ing.stock_level ?? 0} {ing.unit_of_measure || 'each'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-xs font-bold px-2 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-gray-200">
                                            +{currencySymbol}{Number(ing.base_price || 0).toFixed(2)}
                                        </span>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            {lang === 'es' ? 'Precio de Extra' : 'Extra Price'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/30">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedIds.size} {lang === 'es' ? 'ingredientes vinculados a esta etiqueta' : 'ingredients linked to this tag'}
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                            {lang === 'es' ? 'Cancelar' : 'Cancel'}
                        </button>
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleSave}
                            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                        >
                            <Save className="w-4 h-4" />
                            <span>{isSaving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : (lang === 'es' ? 'Guardar Selección' : 'Save Selection')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
