"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/utils/supabase/client";
import { Save, X } from "lucide-react";

const categorySchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    display_order: z.coerce.number().min(0, "Order must be 0 or greater").default(0),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    categoryType?: 'menu' | 'inventory';
}

export function CategoryFormModal({ isOpen, onClose, onSuccess, categoryType = 'menu' }: CategoryFormModalProps) {
    const router = useRouter();
    const supabase = createClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lang, setLang] = useState<'en'|'es'>('es');

    useEffect(() => {
        const saved = localStorage.getItem('pos_language');
        if (saved === 'en' || saved === 'es') setLang(saved);
    }, []);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema) as any,
        defaultValues: {
            display_order: 0,
        },
    });

    if (!isOpen) return null;

    const onSubmit = async (data: CategoryFormValues) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const { error: supabaseError } = await supabase
                .from("categories")
                .insert([
                    {
                        name: data.name,
                        display_order: data.display_order,
                        type: categoryType,
                    },
                ]);

            if (supabaseError) throw supabaseError;

            reset();
            router.refresh();
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || (lang === 'es' ? 'Ocurrió un error al guardar la categoría. El nombre ya podría existir.' : 'An error occurred while saving the category. Name might already exist.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{lang === 'es' ? 'Nueva Categoría' : 'New Category'}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit as any)} className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">{lang === 'es' ? 'Nombre de Categoría' : 'Category Name'}</label>
                            <input
                                {...register("name")}
                                type="text"
                                placeholder={lang === 'es' ? "ej. Entradas, Especiales" : "e.g. Appetizers, Specials"}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-gray-100"
                                autoFocus
                            />
                            {errors.name && <p className="mt-1.5 text-sm text-red-500">{errors.name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ">{lang === 'es' ? 'Orden de Pantalla' : 'Display Order'}</label>
                            <input
                                {...register("display_order")}
                                type="number"
                                min="0"
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-gray-100"
                                placeholder="0"
                            />
                            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Los números más bajos aparecen primero en el POS.' : 'Lower numbers appear first in the POS.'}</p>
                            {errors.display_order && <p className="mt-1.5 text-sm text-red-500">{errors.display_order.message}</p>}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {lang === 'es' ? 'Cancelar' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {lang === 'es' ? 'Crear Categoría' : 'Create Category'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
