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

interface CategoryItem {
    id: string;
    name: string;
    display_order: number;
    type?: string;
    item_categories?: any[];
}

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (savedCategory?: any) => void;
    categoryType?: 'menu' | 'inventory';
    categoryToEdit?: CategoryItem | null;
}

export function CategoryFormModal({ isOpen, onClose, onSuccess, categoryType = 'menu', categoryToEdit }: CategoryFormModalProps) {
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
            name: "",
            display_order: 0,
        },
    });

    useEffect(() => {
        if (isOpen) {
            if (categoryToEdit) {
                reset({
                    name: categoryToEdit.name || "",
                    display_order: categoryToEdit.display_order ?? 0,
                });
            } else {
                reset({
                    name: "",
                    display_order: 0,
                });
            }
            setError(null);
        }
    }, [isOpen, categoryToEdit, reset]);

    if (!isOpen) return null;

    const onSubmit = async (data: CategoryFormValues) => {
        setIsSubmitting(true);
        setError(null);

        try {
            if (categoryToEdit) {
                const { data: updated, error: supabaseError } = await supabase
                    .from("categories")
                    .update({
                        name: data.name.trim(),
                        display_order: Number(data.display_order),
                    })
                    .eq("id", categoryToEdit.id)
                    .select("*, item_categories(count)")
                    .single();

                if (supabaseError) throw supabaseError;

                router.refresh();
                if (onSuccess) onSuccess(updated || { ...categoryToEdit, ...data });
                onClose();
            } else {
                const { data: created, error: supabaseError } = await supabase
                    .from("categories")
                    .insert([
                        {
                            name: data.name.trim(),
                            display_order: Number(data.display_order),
                            type: categoryType,
                        },
                    ])
                    .select("*, item_categories(count)")
                    .single();

                if (supabaseError) throw supabaseError;

                reset();
                router.refresh();
                if (onSuccess) onSuccess(created || { name: data.name.trim(), display_order: Number(data.display_order), type: categoryType });
                onClose();
            }
        } catch (err: any) {
            console.error("Error saving category:", err);
            setError(err.message || (lang === 'es' ? 'Ocurrió un error al guardar la categoría. El nombre ya podría existir.' : 'An error occurred while saving the category. Name might already exist.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/80 dark:bg-slate-800/60">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {categoryToEdit
                            ? (lang === 'es' ? 'Editar Categoría' : 'Edit Category')
                            : (lang === 'es' ? 'Nueva Categoría' : 'New Category')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit as any)} className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-200 dark:border-red-900/50">
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{lang === 'es' ? 'Nombre de Categoría' : 'Category Name'}</label>
                            <input
                                {...register("name")}
                                type="text"
                                placeholder={lang === 'es' ? "ej. Entradas, Especiales" : "e.g. Appetizers, Specials"}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900 text-sm"
                                autoFocus
                            />
                            {errors.name && <p className="mt-1.5 text-sm text-red-500">{errors.name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{lang === 'es' ? 'Orden de Pantalla' : 'Display Order'}</label>
                            <input
                                {...register("display_order")}
                                type="number"
                                min="0"
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900 text-sm"
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
                            className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                            {lang === 'es' ? 'Cancelar' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-primary-500/20 hover:shadow transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {categoryToEdit
                                ? (lang === 'es' ? 'Guardar Cambios' : 'Save Changes')
                                : (lang === 'es' ? 'Crear Categoría' : 'Create Category')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
