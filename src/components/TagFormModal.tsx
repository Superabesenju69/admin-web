import React, { useState, useEffect } from 'react';
import { Tag, X, Check, Palette } from 'lucide-react';
import { TagItem, DEFAULT_TAG_COLORS } from '../utils/tagUtils';

interface TagFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (tagData: { id?: string; name: string; description: string; color: string }) => Promise<void>;
    tagToEdit?: TagItem | null;
    lang?: string;
}

export default function TagFormModal({
    isOpen,
    onClose,
    onSave,
    tagToEdit,
    lang = 'es'
}: TagFormModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(DEFAULT_TAG_COLORS[0]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (tagToEdit) {
            setName(tagToEdit.name || '');
            setDescription(tagToEdit.description || '');
            setColor(tagToEdit.color || DEFAULT_TAG_COLORS[0]);
        } else {
            setName('');
            setDescription('');
            setColor(DEFAULT_TAG_COLORS[0]);
        }
        setError(null);
    }, [tagToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanName = name.trim();
        if (!cleanName) {
            setError(lang === 'es' ? 'El nombre de la etiqueta es obligatorio' : 'Tag name is required');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            await onSave({
                id: tagToEdit?.id,
                name: cleanName,
                description: description.trim(),
                color
            });
            onClose();
        } catch (err: any) {
            setError(err?.message || (lang === 'es' ? 'Error al guardar la etiqueta' : 'Error saving tag'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
                            style={{ backgroundColor: color }}
                        >
                            <Tag className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100">
                                {tagToEdit 
                                    ? (lang === 'es' ? 'Editar Etiqueta' : 'Edit Tag')
                                    : (lang === 'es' ? 'Nueva Etiqueta' : 'New Tag')}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {lang === 'es' ? 'Agrupa ingredientes para ofrecerlos como extras en el POS' : 'Groups ingredients to offer as extras in POS'}
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

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium border border-red-200 dark:border-red-900/50">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                            {lang === 'es' ? 'Nombre de la Etiqueta' : 'Tag Name'} *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={lang === 'es' ? 'ej. extras_pizza, aderezos, carnes_extra' : 'e.g. pizza_extras, sauces'}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                            {lang === 'es' ? 'Descripción (Opcional)' : 'Description (Optional)'}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={lang === 'es' ? 'ej. Ingredientes adicionales para pizzas medianas y familiares' : 'e.g. Extra ingredients for pizzas'}
                            rows={2}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5" />
                            <span>{lang === 'es' ? 'Color Distintivo' : 'Badge Color'}</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {DEFAULT_TAG_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-xs"
                                    style={{ backgroundColor: c }}
                                >
                                    {color === c && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                            {lang === 'es' ? 'Cancelar' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : (lang === 'es' ? 'Guardar Etiqueta' : 'Save Tag')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
