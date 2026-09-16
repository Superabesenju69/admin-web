import React, { useState, useRef, useEffect } from 'react';
import { Tag, X, Plus, Sparkles, Check, Info } from 'lucide-react';
import { TagItem, DEFAULT_TAG_COLORS } from '../utils/tagUtils';

interface TagInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
    availableTags: TagItem[];
    allIngredients?: any[];
    lang?: string;
    isProduct?: boolean;
    currencySymbol?: string;
}

export default function TagInput({
    value = [],
    onChange,
    availableTags = [],
    allIngredients = [],
    lang = 'es',
    isProduct = true,
    currencySymbol = 'C$'
}: TagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const safeValue = Array.isArray(value) ? value : [];

    // Filter available tags that are not yet selected and match the input
    const trimmedInput = inputValue.trim().toLowerCase();
    const suggestions = availableTags.filter(t => {
        const isAlreadySelected = safeValue.some(v => v.toLowerCase() === t.name.toLowerCase());
        if (isAlreadySelected) return false;
        if (!trimmedInput) return true;
        return t.name.toLowerCase().includes(trimmedInput) || (t.description && t.description.toLowerCase().includes(trimmedInput));
    });

    const exactMatch = availableTags.find(t => t.name.toLowerCase() === trimmedInput);
    const isNewTag = trimmedInput.length > 0 && !exactMatch && !safeValue.some(v => v.toLowerCase() === trimmedInput);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addTag = (tagName: string) => {
        const clean = tagName.trim();
        if (!clean) return;
        if (safeValue.some(t => t.toLowerCase() === clean.toLowerCase())) return;
        onChange([...safeValue, clean]);
        setInputValue('');
        setIsOpen(false);
        inputRef.current?.focus();
    };

    const removeTag = (tagToRemove: string) => {
        onChange(safeValue.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase()));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (suggestions.length > 0 && trimmedInput) {
                addTag(suggestions[0].name);
            } else if (trimmedInput) {
                addTag(inputValue);
            }
        } else if (e.key === 'Backspace' && !inputValue && safeValue.length > 0) {
            removeTag(safeValue[safeValue.length - 1]);
        }
    };

    // Calculate which ingredients will be active as extras in the POS for this item
    const linkedExtras = React.useMemo(() => {
        if (!isProduct || safeValue.length === 0) return [];
        const activeTagSet = new Set(safeValue.map(t => t.toLowerCase()));
        return allIngredients.filter(ing => {
            return (ing.tags || []).some((t: string) => activeTagSet.has(t.toLowerCase()));
        });
    }, [isProduct, safeValue, allIngredients]);

    const getTagColor = (tagName: string) => {
        const found = availableTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        return found?.color || DEFAULT_TAG_COLORS[0];
    };

    return (
        <div className="space-y-3" ref={containerRef}>
            <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {lang === 'es' ? 'Etiquetas de Extras y Categorización' : 'Extras & Categorization Tags'}
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {isProduct 
                        ? (lang === 'es' ? 'Vincula ingredientes que se cobrarán como extras en el POS' : 'Links ingredients charged as extras in POS')
                        : (lang === 'es' ? 'Define a qué productos se ofrece este ingrediente como extra' : 'Defines which products offer this ingredient as extra')}
                </span>
            </div>

            {/* Input Box with Pills */}
            <div 
                onClick={() => inputRef.current?.focus()}
                className="min-h-[46px] p-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent flex flex-wrap items-center gap-1.5 cursor-text transition-all"
            >
                {/* Selected Tag Badges */}
                {safeValue.map(tagName => {
                    const tagColor = getTagColor(tagName);
                    const tagObj = availableTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
                    const count = tagObj?.assignedIngredients?.length ?? 0;

                    return (
                        <span
                            key={tagName}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-xs animate-in fade-in zoom-in duration-150"
                            style={{ backgroundColor: tagColor }}
                        >
                            <Tag className="w-3 h-3 opacity-80" />
                            <span>{tagName}</span>
                            {count > 0 && isProduct && (
                                <span className="text-[10px] bg-black/20 px-1.5 py-0.2 rounded-full font-medium">
                                    {count} {lang === 'es' ? 'extras' : 'extras'}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeTag(tagName);
                                }}
                                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/20 transition-colors ml-0.5 cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    );
                })}

                {/* Text input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={safeValue.length === 0 ? (lang === 'es' ? 'Escribe o selecciona etiquetas (ej. extras_pizza, carnes)...' : 'Type or select tags (e.g. pizza_extras)...') : ''}
                    className="flex-1 min-w-[140px] px-2 py-1 text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                />
            </div>

            {/* Autocomplete Dropdown */}
            {isOpen && (
                <div className="relative z-50">
                    <div className="absolute top-1 left-0 right-0 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl py-1 text-sm">
                        {suggestions.map((tag) => {
                            const count = tag.assignedIngredients?.length ?? 0;
                            return (
                                <button
                                    key={tag.name}
                                    type="button"
                                    onClick={() => addTag(tag.name)}
                                    className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span 
                                            className="w-3 h-3 rounded-full shrink-0" 
                                            style={{ backgroundColor: tag.color || '#3b82f6' }}
                                        />
                                        <div>
                                            <span className="font-bold text-gray-900 dark:text-gray-100">
                                                {tag.name}
                                            </span>
                                            {tag.description && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs">
                                                    {tag.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {count > 0 && (
                                            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                                                {count} {lang === 'es' ? 'ingredientes' : 'ingredients'}
                                            </span>
                                        )}
                                        <Plus className="w-4 h-4 text-gray-400" />
                                    </div>
                                </button>
                            );
                        })}

                        {/* Create new tag option */}
                        {isNewTag && (
                            <button
                                type="button"
                                onClick={() => addTag(inputValue)}
                                className="w-full px-3 py-2.5 flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-800 font-semibold border-t border-gray-100 dark:border-slate-800 transition-colors cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>{lang === 'es' ? `Crear nueva etiqueta "${inputValue.trim()}"` : `Create new tag "${inputValue.trim()}"`}</span>
                            </button>
                        )}

                        {suggestions.length === 0 && !isNewTag && (
                            <div className="px-3 py-3 text-center text-xs text-gray-400 italic">
                                {lang === 'es' ? 'No hay más etiquetas disponibles' : 'No more tags available'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Live POS Extras Preview (When editing a Menu Product) */}
            {isProduct && safeValue.length > 0 && (
                <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200/80 dark:border-amber-900/40 rounded-xl text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                            {lang === 'es' 
                                ? `Vista Previa: Extras que se ofrecerán en el POS (${linkedExtras.length})`
                                : `Live Preview: Extras that will appear in POS (${linkedExtras.length})`}
                        </span>
                    </div>

                    {linkedExtras.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {linkedExtras.map((ing: any) => (
                                <span
                                    key={ing.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 text-slate-800 dark:text-slate-200 font-medium shadow-2xs"
                                >
                                    <span>{ing.name}</span>
                                    <span className="font-bold text-amber-700 dark:text-amber-400">
                                        (+{currencySymbol}{Number(ing.base_price || 0).toFixed(2)})
                                    </span>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-amber-800/80 dark:text-amber-400/80 pt-0.5">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            <span>
                                {lang === 'es'
                                    ? 'Aún no hay ingredientes asignados a estas etiquetas. Puedes asignarlos desde "Gestión de Etiquetas".'
                                    : 'No ingredients are assigned to these tags yet. You can link them in "Tags Management".'}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
