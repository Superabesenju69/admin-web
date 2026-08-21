"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import Select from "react-select";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { CategoryFormModal } from "@/components/CategoryFormModal";

const itemSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    image_url: z.string().optional(),
    type: z.enum(["ingredient", "product", "combo"]),
    base_price: z.coerce.number().min(0, "Price cannot be negative"),
    track_inventory: z.boolean().default(true),
    stock_level: z.coerce.number().min(0, "Stock cannot be negative").default(0),
    category_id: z.string().optional(),
    station_id: z.string().optional(),
    supplier_id: z.string().optional(),
    cost_per_unit: z.coerce.number().min(0).default(0),
    unit_of_measure: z.string().default('each'),
    par_level: z.coerce.number().min(0).default(0),
    sku: z.string().optional(),
    tags: z.string().optional(),
    options: z.array(z.object({
        name: z.string().min(1, "Option name is required"),
        choices: z.array(z.object({
            name: z.string().min(1, "Choice name is required"),
            price_modifier: z.coerce.number().default(0),
        })).min(1, "At least one choice is required"),
        hide_in_combo: z.boolean().default(false).optional(),
    })).default([]),
    recipe_items: z.array(z.object({
        item_id: z.string(),
        quantity: z.coerce.number().min(0.01, "Quantity > 0"),
        size_name: z.string().nullable().optional()
    })).default([]),
});

type ItemFormValues = z.infer<typeof itemSchema>;

export default function ItemForm({ initialData, preset }: { initialData?: any, preset?: 'menu' | 'ingredient' }) {
    const router = useRouter();
    const supabase = createClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lang, setLang] = useState<'en'|'es'>('es');

    useEffect(() => {
        const saved = localStorage.getItem('pos_language');
        if (saved === 'en' || saved === 'es') setLang(saved);
    }, []);

    const [categories, setCategories] = useState<any[]>([]);
    const [availableIngredients, setAvailableIngredients] = useState<any[]>([]);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [stations, setStations] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [selectedRecipeSize, setSelectedRecipeSize] = useState<string | null>(null);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    const loadCategories = async () => {
        const { data: catData } = await supabase.from('categories').select('*').order('display_order');
        if (catData) setCategories(catData);
    };

    const {
        control,
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm<ItemFormValues>({
        resolver: zodResolver(itemSchema) as any,
        defaultValues: initialData ? {
            name: initialData.name,
            image_url: initialData.image_url || "",
            type: initialData.type,
            base_price: initialData.base_price,
            track_inventory: initialData.track_inventory,
            stock_level: initialData.stock_level,
            category_id: initialData.item_categories?.[0]?.category_id || "",
            station_id: initialData.station_id || "",
            supplier_id: initialData.supplier_id || "",
            cost_per_unit: initialData.cost_per_unit || 0,
            unit_of_measure: initialData.unit_of_measure || 'each',
            par_level: initialData.par_level || 0,
            sku: initialData.sku || "",
            tags: initialData.tags?.join(", ") || "",
            options: (initialData.options || []).map((opt: any) => ({
                name: opt.name,
                choices: (opt.choices || []).map((c: any) => {
                    if (typeof c === 'object') {
                        return { name: c.name || '', price_modifier: c.price_modifier || 0 };
                    }
                    return { name: String(c), price_modifier: 0 };
                }),
                hide_in_combo: opt.hide_in_combo || false,
            })),
            recipe_items: initialData.recipes?.map((r: any) => ({
                item_id: r.child_item_id,
                quantity: r.quantity,
                size_name: r.size_name || null
            })) || [],
        } : {
            image_url: "",
            type: preset === 'menu' ? "product" : preset === 'ingredient' ? "ingredient" : "ingredient",
            base_price: 0,
            track_inventory: true,
            stock_level: 0,
            station_id: "",
            category_id: "",
            supplier_id: "",
            cost_per_unit: 0,
            unit_of_measure: 'each',
            par_level: 0,
            sku: "",
            tags: "",
            options: [] as { name: string; choices: { name: string; price_modifier: number }[]; hide_in_combo: boolean }[],
            recipe_items: [],
        },
    });

    useEffect(() => {
        async function loadData() {
            await loadCategories();
            const { data: ingData } = await supabase.from('items').select('*, item_categories(category_id)').eq('type', 'ingredient').order('name');
            if (ingData) setAvailableIngredients(ingData);
            const { data: prodData } = await supabase.from('items').select('*, item_categories(category_id)').in('type', ['product', 'combo']).order('name');
            if (prodData) setAvailableProducts(prodData);
            const { data: stData } = await supabase.from('kitchen_stations').select('*').order('display_order');
            if (stData) setStations(stData);
            const { data: supData } = await supabase.from('suppliers').select('*').order('name');
            if (supData) setSuppliers(supData);

            if (initialData) {
                reset({
                    name: initialData.name,
                    image_url: initialData.image_url || "",
                    type: initialData.type,
                    base_price: initialData.base_price,
                    track_inventory: initialData.track_inventory,
                    stock_level: initialData.stock_level,
                    category_id: initialData.item_categories?.[0]?.category_id || "",
                    station_id: initialData.station_id || "",
                    supplier_id: initialData.supplier_id || "",
                    cost_per_unit: initialData.cost_per_unit || 0,
                    unit_of_measure: initialData.unit_of_measure || 'each',
                    par_level: initialData.par_level || 0,
                    sku: initialData.sku || "",
                    tags: initialData.tags?.join(", ") || "",
                    options: (initialData.options || []).map((opt: any) => ({
                        name: opt.name,
                        choices: (opt.choices || []).map((c: any) => {
                            if (typeof c === 'object') {
                                return { name: c.name || '', price_modifier: c.price_modifier || 0 };
                            }
                            return { name: String(c), price_modifier: 0 };
                        }),
                        hide_in_combo: opt.hide_in_combo || false,
                    })),
                    recipe_items: initialData.recipes?.map((r: any) => ({
                        item_id: r.child_item_id,
                        quantity: r.quantity,
                        size_name: r.size_name || null
                    })) || [],
                });
            }
        }
        loadData();
    }, [supabase, initialData, reset]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "recipe_items"
    });

    const { fields: optFields, append: appendOpt, remove: removeOpt } = useFieldArray({
        control,
        name: "options"
    });

    const watchType = watch("type");
    const watchTrackInventory = watch("track_inventory");

    const onSubmit = async (data: ItemFormValues) => {
        setIsSubmitting(true);
        setError(null);

        // Parse tags
        const parsedTags = data.tags
            ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
            : [];

        // Build structured options
        const parsedOptions = data.options.map(o => ({
            name: o.name.trim(),
            choices: o.choices.map((c: any) => ({
                name: (c.name || '').trim(),
                price_modifier: c.price_modifier || 0,
            })).filter((c: any) => c.name),
            hide_in_combo: !!o.hide_in_combo,
        }));

        try {
            let itemId = initialData?.id;

            if (itemId) {
                // Update
                const { error: updateError } = await supabase
                    .from("items")
                    .update({
                        name: data.name,
                        image_url: data.image_url || null,
                        type: data.type,
                        base_price: data.base_price,
                        track_inventory: data.track_inventory,
                        stock_level: data.stock_level,
                        station_id: data.station_id || null,
                        supplier_id: data.supplier_id || null,
                        cost_per_unit: data.cost_per_unit || 0,
                        unit_of_measure: data.unit_of_measure || 'each',
                        par_level: data.par_level || 0,
                        sku: data.sku || null,
                        tags: parsedTags,
                        options: parsedOptions,
                    })
                    .eq('id', itemId);
                if (updateError) throw updateError;
            } else {
                // Insert
                const { data: newItemData, error: insertError } = await supabase
                    .from("items")
                    .insert([{
                        name: data.name,
                        image_url: data.image_url || null,
                        type: data.type,
                        base_price: data.base_price,
                        track_inventory: data.track_inventory,
                        stock_level: data.stock_level,
                        station_id: data.station_id || null,
                        supplier_id: data.supplier_id || null,
                        cost_per_unit: data.cost_per_unit || 0,
                        unit_of_measure: data.unit_of_measure || 'each',
                        par_level: data.par_level || 0,
                        sku: data.sku || null,
                        tags: parsedTags,
                        options: parsedOptions,
                    }])
                    .select()
                    .single();
                if (insertError) throw insertError;
                itemId = newItemData.id;
            }

            // Category logic
            if (itemId) {
                // Delete existing category links
                await supabase.from("item_categories").delete().eq('item_id', itemId);
                if (data.category_id) {
                    await supabase.from("item_categories").insert([{ item_id: itemId, category_id: data.category_id }]);
                }

                // Recipe logic
                await supabase.from("recipes").delete().eq('parent_item_id', itemId);

                if ((data.type === 'product' || data.type === 'combo') && data.recipe_items.length > 0) {
                    const validRecipeItems = data.recipe_items.filter(ri => ri.item_id && ri.item_id.length > 0);
                    if (validRecipeItems.length > 0) {
                        const tenantId = typeof window !== 'undefined' ? localStorage.getItem('pos_tenant_id') : null;
                        const recipeInserts = validRecipeItems.map((r: any) => ({
                            parent_item_id: itemId,
                            child_item_id: r.item_id,
                            quantity: r.quantity,
                            size_name: r.size_name || null,
                            unit: 'piece',
                            ...(tenantId ? { tenant_id: tenantId } : {})
                        }));
                        const { error: recipeError } = await supabase.from("recipes").insert(recipeInserts);
                        if (recipeError) throw recipeError;
                    }
                }
            }

            router.push("/");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "An error occurred while saving the item.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyFromBaseRecipe = () => {
        if (selectedRecipeSize === null) return;
        const currentRecipeItems = watch('recipe_items') || [];
        const baseItems = currentRecipeItems.filter((r: any) => (r.size_name || null) === null);
        if (baseItems.length === 0) {
            alert(lang === 'es' ? 'Primero añade ingredientes a la Receta Base antes de copiar.' : 'Add ingredients to the Base Recipe first before copying.');
            return;
        }
        const otherItems = currentRecipeItems.filter((r: any) => (r.size_name || null) !== selectedRecipeSize);
        const clonedItems = baseItems.map((r: any) => ({
            item_id: r.item_id,
            quantity: r.quantity,
            size_name: selectedRecipeSize
        }));
        reset({
            ...watch(),
            recipe_items: [...otherItems, ...clonedItems]
        });
    };

    const isRecipeBuilderVisible = watchType === "product" || watchType === "combo";
    const availableOptions = watchType === "combo" ? availableProducts : availableIngredients;

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="mb-8">
                <Link href="/" className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    {lang === 'es' ? 'Volver al Dashboard' : 'Back to Dashboard'}
                </Link>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{initialData ? (lang === 'es' ? 'Editar Artículo' : 'Edit Item') : (lang === 'es' ? 'Crear Nuevo Artículo' : 'Create New Item')}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{initialData ? (lang === 'es' ? 'Actualizar detalles del artículo, categorías y recetas.' : 'Update item details, categories, and recipes.') : (lang === 'es' ? 'Añadir un nuevo ingrediente, producto o combo a tu base de datos.' : 'Add a new ingredient, product, or combo to your database.')}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit as any, (formErrors) => {
                console.error('Form validation errors:', formErrors);
                setError(lang === 'es' ? 'Por favor corrija los errores del formulario antes de guardar.' : 'Please fix validation errors before saving.');
            })} className="space-y-8 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-gray-100">
                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'es' ? 'Nombre del Artículo' : 'Item Name'}</label>
                            <input
                                {...register("name")}
                                type="text"
                                placeholder={lang === 'es' ? 'ej. Tomate, Pizza Margarita, Combo Estudiantil' : 'e.g. Tomato, Pizza Margarita, Lunch Combo'}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-gray-100"
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'es' ? 'URL de Imagen (Opcional)' : 'Image URL (Optional)'}</label>
                            <input
                                {...register("image_url")}
                                type="text"
                                placeholder="https://example.com/image.png"
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-gray-100"
                            />
                            {errors.image_url && <p className="mt-1 text-sm text-red-500">{errors.image_url.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'es' ? 'Tipo de Artículo' : 'Item Type'}</label>
                            <select
                                {...register("type")}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                            >
                                {(!preset || preset === 'ingredient' || initialData?.type === 'ingredient') && (
                                    <option value="ingredient">{lang === 'es' ? 'Ingrediente' : 'Ingredient'}</option>
                                )}
                                {(!preset || preset === 'menu' || initialData?.type === 'product' || initialData?.type === 'combo') && (
                                    <>
                                        <option value="product">{lang === 'es' ? 'Producto' : 'Product'}</option>
                                        <option value="combo">{lang === 'es' ? 'Combo' : 'Combo'}</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">{lang === 'es' ? 'Categoría (Opcional)' : 'Category (Optional)'}</label>
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryModalOpen(true)}
                                    className="text-xs text-primary-600 font-medium hover:text-primary-800 transition-colors"
                                >
                                    + {lang === 'es' ? 'Nueva Categoría' : 'New Category'}
                                </button>
                            </div>
                            <Controller
                                name="category_id"
                                control={control}
                                render={({ field }) => {
                                    const options = categories
                                        .filter(c => watchType === 'ingredient' ? c.type === 'inventory' : c.type === 'menu')
                                        .map(c => ({ value: c.id, label: c.name }));
                                    return (
                                        <Select
                                            instanceId="category-select"
                                            {...field}
                                            options={options}
                                            value={options.find(opt => opt.value === field.value) || null}
                                            onChange={(val: any) => field.onChange(val?.value || '')}
                                            isClearable
                                            placeholder={lang === 'es' ? '-- Sin Categoría --' : '-- No Category --'}
                                            unstyled
                                            classNames={{
                                                control: (state) => `w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 ${state.isFocused ? 'ring-2 ring-primary-500 border-transparent' : ''}`,
                                                menuList: () => "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl mt-1 py-1 z-50 overflow-hidden",
                                                option: (state) => `px-4 py-2 cursor-pointer transition-colors ${state.isSelected ? 'bg-primary-500 text-white' : state.isFocused ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white' : 'text-gray-900 dark:text-gray-100 bg-transparent'}`,
                                                singleValue: () => "text-gray-900 dark:text-gray-100",
                                                input: () => "text-gray-900 dark:text-gray-100",
                                                placeholder: () => "text-gray-400 m-0"
                                            }}
                                        />
                                    );
                                }}
                            />
                        </div>

                        {/* Kitchen Station — only for products & combos */}
                        {(watchType === 'product' || watchType === 'combo') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {lang === 'es' ? 'Estación de Cocina' : 'Kitchen Station'}
                                    <span className="ml-2 text-xs text-gray-400 font-normal">{lang === 'es' ? '(a dónde se envían los tickets de este artículo)' : '(where tickets for this item are routed)'}</span>
                                </label>
                                <Controller
                                    name="station_id"
                                    control={control}
                                    render={({ field }) => {
                                        const options = stations.map(s => ({ value: s.id, label: s.name }));
                                        return (
                                            <Select
                                                instanceId="station-select"
                                                {...field}
                                                options={options}
                                                value={options.find(opt => opt.value === field.value) || null}
                                                onChange={(val: any) => field.onChange(val?.value || '')}
                                                isClearable
                                                placeholder={lang === 'es' ? '-- Sin Estación --' : '-- No Station --'}
                                                unstyled
                                                classNames={{
                                                    control: (state) => `w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 ${state.isFocused ? 'ring-2 ring-primary-500 border-transparent' : ''}`,
                                                    menuList: () => "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl mt-1 py-1 z-50 overflow-hidden",
                                                    option: (state) => `px-4 py-2 cursor-pointer transition-colors ${state.isSelected ? 'bg-primary-500 text-white' : state.isFocused ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white' : 'text-gray-900 dark:text-gray-100 bg-transparent'}`,
                                                    singleValue: () => "text-gray-900 dark:text-gray-100",
                                                    input: () => "text-gray-900 dark:text-gray-100",
                                                    placeholder: () => "text-gray-400 m-0"
                                                }}
                                            />
                                        );
                                    }}
                                />
                                {stations.length === 0 && (
                                    <p className="mt-1 text-xs text-amber-600">{lang === 'es' ? 'Aún sin estaciones. Crea estaciones en el Panel → pestaña Cocina.' : 'No stations yet. Create stations in Dashboard → Kitchen tab.'}</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'es' ? 'Precio Base ($)' : 'Base Price ($)'}</label>
                        <input
                            {...register("base_price")}
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full max-w-xs px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                        />
                        {errors.base_price && <p className="mt-1 text-sm text-red-500">{errors.base_price.message}</p>}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{lang === 'es' ? 'Personalización' : 'Customization'}</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {watchType === 'ingredient' ? (lang === 'es' ? 'Etiquetas (Tags) (empareja estas con los productos)' : 'Tags (match these to products)') : (lang === 'es' ? 'Etiquetas (Separadas por comas)' : 'Tags (Comma separated)')}
                            </label>
                            <input
                                {...register("tags")}
                                type="text"
                                placeholder={lang === 'es' ? "ej. bebidas, postres, hamburguesas" : "e.g. burgers, hotdogs, drinks"}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                {watchType === 'ingredient' ? (lang === 'es' ? 'Los ingredientes mapeados con estas etiquetas aparecerán como extras.' : 'Ingredients mapping to these tags will appear as extras on matching products.') : (lang === 'es' ? 'Los extras se agruparán según estas etiquetas en el POS.' : 'Extras will be grouped by these tags in the POS.')}
                            </p>
                        </div>

                        {(watchType === 'product' || watchType === 'combo') && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{lang === 'es' ? 'Opciones y Variaciones (ej. Tamaño, Término)' : 'Required Options / Sizes (e.g. Size, Meat Term)'}</label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Define tamaños o variantes. Cada tamaño podrá tener su propia receta de ingredientes exacta.' : 'Define sizes or variants. Each size can have its own exact ingredient recipe below.'}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => appendOpt({ name: "", choices: [{ name: "", price_modifier: 0 }], hide_in_combo: false })}
                                        className="text-xs text-primary-600 font-medium hover:text-primary-800 transition-colors"
                                    >
                                        + {lang === 'es' ? 'Añadir Opción' : 'Add Option'}
                                    </button>
                                </div>
                                {optFields.length === 0 && (
                                    <p className="text-sm text-gray-400 italic">{lang === 'es' ? 'Sin opciones definidas (ej. Tamaño, Término).' : 'No options defined (e.g. Size, Meat Term).'}</p>
                                )}
                                <div className="space-y-4">
                                    {optFields.map((field, index) => (
                                        <div key={field.id} className="border p-4 rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30">
                                            <div className="flex gap-3 items-start mb-3">
                                                <div className="flex-1">
                                                    <input
                                                        {...register(`options.${index}.name` as const)}
                                                        type="text"
                                                        placeholder={lang === 'es' ? "Nombre de la Opción (ej. Tamaño)" : "Option Name (e.g. Size)"}
                                                        className="w-full text-sm font-semibold px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                                                    />
                                                    {errors.options?.[index]?.name && <p className="mt-1 text-xs text-red-500">{errors.options[index]?.name?.message}</p>}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeOpt(index)}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Choices Mini-Table */}
                                            <Controller
                                                name={`options.${index}.choices` as const}
                                                control={control}
                                                render={({ field: choicesField }) => {
                                                    const choices = choicesField.value || [];
                                                    return (
                                                        <div className="space-y-2">
                                                            {/* Header */}
                                                            <div className="grid grid-cols-[1fr_120px_32px] gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                                                                <span>{lang === 'es' ? 'Opción / Tamaño' : 'Choice / Size'}</span>
                                                                <span>{lang === 'es' ? 'Precio (+/-)' : 'Price (+/-)'}</span>
                                                                <span></span>
                                                            </div>
                                                            {/* Rows */}
                                                            {choices.map((choice: any, cIdx: number) => (
                                                                <div key={cIdx} className="grid grid-cols-[1fr_120px_32px] gap-2 items-center">
                                                                    <input
                                                                        type="text"
                                                                        value={choice.name}
                                                                        onChange={e => {
                                                                            const updated = [...choices];
                                                                            updated[cIdx] = { ...updated[cIdx], name: e.target.value };
                                                                            choicesField.onChange(updated);
                                                                        }}
                                                                        placeholder={lang === 'es' ? 'ej. Mediana, Grande' : 'e.g. Medium, Large'}
                                                                        className="text-sm px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={choice.price_modifier}
                                                                        onChange={e => {
                                                                            const updated = [...choices];
                                                                            updated[cIdx] = { ...updated[cIdx], price_modifier: parseFloat(e.target.value) || 0 };
                                                                            choicesField.onChange(updated);
                                                                        }}
                                                                        placeholder="0.00"
                                                                        className="text-sm px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800 text-center"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = choices.filter((_: any, i: number) => i !== cIdx);
                                                                            choicesField.onChange(updated);
                                                                        }}
                                                                        className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {/* Add Choice Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => choicesField.onChange([...choices, { name: "", price_modifier: 0 }])}
                                                                className="text-xs text-primary-600 font-semibold hover:text-primary-800 transition-colors mt-1"
                                                            >
                                                                + {lang === 'es' ? 'Añadir valor' : 'Add choice'}
                                                            </button>
                                                            {errors.options?.[index]?.choices && <p className="text-xs text-red-500">{(errors.options[index]?.choices as any)?.message || (errors.options[index]?.choices as any)?.root?.message || 'Error en opciones'}</p>}
                                                        </div>
                                                    );
                                                }}
                                            />

                                            {/* Checkboxes Row */}
                                            <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        {...register(`options.${index}.hide_in_combo` as const)}
                                                        type="checkbox"
                                                        id={`hide_combo_${index}`}
                                                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 cursor-pointer"
                                                    />
                                                    <label htmlFor={`hide_combo_${index}`} className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                                                        {lang === 'es' ? '🔒 Ocultar en Combo' : '🔒 Hide in Combo'}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <hr className="border-gray-100" />

                    {/* Inventory Settings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{lang === 'es' ? 'Control de Inventario' : 'Inventory Tracking'}</h3>

                        <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-slate-800 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                                {...register("track_inventory")}
                                type="checkbox"
                                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 cursor-pointer"
                            />
                            <div>
                                <span className="block font-medium text-gray-900 dark:text-gray-100">{lang === 'es' ? 'Rastrear Inventario' : 'Track Inventory'}</span>
                                <span className="block text-sm text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Habilita esto para artículos físicos que se agotan.' : 'Enable this for physical items that run out of stock.'}</span>
                            </div>
                        </label>

                        {watchTrackInventory && (
                            <div className="pl-4 border-l-2 border-primary-500 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'es' ? 'Nivel de Stock Inicial' : 'Initial Stock Level'}</label>
                                        <input
                                            {...register("stock_level")}
                                            type="number"
                                            step="0.01"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                                        />
                                        {errors.stock_level && <p className="mt-1 text-sm text-red-500">{errors.stock_level.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'es' ? 'Unidad de Medida' : 'Unit of Measure'}</label>
                                        <select
                                            {...register("unit_of_measure")}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                                        >
                                            {[
                                                { group: lang === 'es' ? 'Peso' : 'Weight', units: ['lb', 'kg', 'oz', 'g', 'mg', 'ton'] },
                                                { group: lang === 'es' ? 'Volumen' : 'Volume', units: ['gallon', 'liter', 'ml', 'fl oz', 'quart', 'pint', 'cup'] },
                                                { group: lang === 'es' ? 'Conteo / Unidades' : 'Count', units: ['each', 'dozen', 'case', 'box', 'bag', 'pack', 'bundle', 'pallet', 'roll', 'sheet'] },
                                                { group: lang === 'es' ? 'Longitud' : 'Length', units: ['ft', 'm', 'in', 'cm', 'yd'] },
                                            ].map(g => (
                                                <optgroup key={g.group} label={g.group}>
                                                    {g.units.map(u => <option key={u} value={u}>{u}</option>)}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                         <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'es' ? 'Costo por Unidad' : 'Cost per Unit'}</label>
                                         <input
                                             {...register("cost_per_unit")}
                                             type="number"
                                             step="0.01"
                                             min="0"
                                             placeholder="0.00"
                                             className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                                         />
                                     </div>
                                     <div>
                                         <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'es' ? 'Nivel Par (Punto de reorden)' : 'Par Level (Reorder Point)'}</label>
                                         <input
                                             {...register("par_level")}
                                             type="number"
                                             step="0.01"
                                             min="0"
                                             placeholder={lang === 'es' ? "0 = sin alerta" : "0 = no alert"}
                                             className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                                         />
                                         <p className="mt-1 text-xs text-gray-500">{lang === 'es' ? 'Alerta cuando el stock cae bajo este nivel' : 'Alert when stock falls below this level'}</p>
                                     </div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'es' ? 'Proveedor' : 'Supplier'}</label>
                                         <select
                                             {...register("supplier_id")}
                                             className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                                         >
                                             <option value="">{lang === 'es' ? '-- Sin Proveedor --' : '-- No Supplier --'}</option>
                                             {suppliers.map(s => (
                                                 <option key={s.id} value={s.id}>{s.name}</option>
                                             ))}
                                         </select>
                                         {suppliers.length === 0 && (
                                             <p className="mt-1 text-xs text-amber-600">{lang === 'es' ? 'Aún sin proveedores. Añádelos en Inventario → Proveedores.' : 'No suppliers yet. Add them from the Inventory → Suppliers tab.'}</p>
                                         )}
                                     </div>
                                     <div>
                                         <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'es' ? 'SKU / Código de Barras (opcional)' : 'SKU / Barcode (optional)'}</label>
                                         <input
                                             {...register("sku")}
                                             type="text"
                                             placeholder="e.g. TOM-001"
                                             className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 font-mono"
                                         />
                                     </div>
                                 </div>
                             </div>
                         )}
                     </div>

                     {/* Recipe/Combo Builder */}
                     {isRecipeBuilderVisible && (
                         <>
                             <hr className="border-gray-100" />
                             <div className="space-y-4">
                                 <div className="flex items-center justify-between">
                                     <div>
                                         <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{lang === 'es' ? 'Contenidos de Receta / Combo' : 'Recipe / Combo Contents'}</h3>
                                         <p className="text-sm text-gray-500 dark:text-gray-400">{lang === 'es' ? `Selecciona qué ${watchType === 'combo' ? 'productos' : 'ingredientes'} componen este artículo.` : `Select what ${watchType === 'combo' ? 'products' : 'ingredients'} make up this item.`}</p>
                                     </div>
                                     <button
                                         type="button"
                                         onClick={() => append({ item_id: "", quantity: 1, size_name: selectedRecipeSize })}
                                         className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 font-medium text-sm rounded-lg hover:bg-primary-100 transition-colors"
                                     >
                                         <Plus className="w-4 h-4" />
                                         {lang === 'es' ? (watchType === 'combo' ? 'Añadir Producto' : 'Añadir Ingrediente') : (watchType === 'combo' ? 'Add Product' : 'Add Ingredient')}
                                     </button>
                                 </div>

                                 {(() => {
                                      const options = watch('options') || [];
                                      const sizeOption = options.find((o: any) => 
                                          o.name.toLowerCase().includes('size') || 
                                          o.name.toLowerCase().includes('tamaño') || 
                                          o.name.toLowerCase().includes('porcion') || 
                                          o.name.toLowerCase().includes('porción')
                                      ) || options[0];
                                      
                                      const sizeChoices = sizeOption ? sizeOption.choices.map((c: any) => c.name).filter(Boolean) : [];
                                      const sizes = sizeChoices.length > 0 ? [null, ...sizeChoices] : [null];

                                      if (sizes.length > 1) {
                                          return (
                                              <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                                                  <div className="flex gap-2 overflow-x-auto py-1">
                                                      {sizes.map((s, idx) => (
                                                          <button
                                                              key={idx}
                                                              type="button"
                                                              onClick={() => setSelectedRecipeSize(s)}
                                                              className={`px-3.5 py-1.5 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                                                                  selectedRecipeSize === s 
                                                                      ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20 scale-[1.02]' 
                                                                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                                                              }`}
                                                          >
                                                              {s === null ? (lang === 'es' ? '🌟 Receta Base / General' : '🌟 Base / Default Recipe') : `📏 ${s}`}
                                                          </button>
                                                      ))}
                                                  </div>
                                                  {selectedRecipeSize !== null && (
                                                      <button
                                                          type="button"
                                                          onClick={copyFromBaseRecipe}
                                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                                          title={lang === 'es' ? 'Copiar ingredientes de la receta base a este tamaño' : 'Copy ingredients from base recipe to this size'}
                                                      >
                                                          📋 {lang === 'es' ? 'Copiar de Receta Base' : 'Copy from Base Recipe'}
                                                      </button>
                                                  )}
                                              </div>
                                          );
                                      }
                                      return null;
                                  })()}

                                 <div className="space-y-3">
                                     {fields.filter(f => (f.size_name || null) === selectedRecipeSize).length === 0 && (
                                         <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 dark:text-gray-400 text-sm">
                                             {lang === 'es' ? 'Aún no has añadido elementos a esta receta.' : 'No items added to this recipe yet.'}
                                         </div>
                                     )}
                                     {fields.map((field, index) => {
                                         if ((field.size_name || null) !== selectedRecipeSize) return null;
                                         return (
                                         <div key={field.id} className="flex gap-3 items-start">
                                             <input type="hidden" {...register(`recipe_items.${index}.size_name` as const)} value={field.size_name || ""} />
                                             <div className="flex-1">
                                                 <Controller
                                                     name={`recipe_items.${index}.item_id` as const}
                                                     control={control}
                                                     render={({ field }) => {
                                                         const groupedOptions = (() => {
                                                             const grouped = availableOptions.reduce((acc, item) => {
                                                                 const catId = item.item_categories?.[0]?.category_id;
                                                                 const catName = categories.find(c => c.id === catId)?.name || (lang === 'es' ? 'Sin Categoría' : 'Uncategorized');
                                                                 if (!acc[catName]) acc[catName] = [];
                                                                 acc[catName].push(item);
                                                                 return acc;
                                                             }, {} as Record<string, any[]>);
                                                             return Object.entries(grouped)
                                                                 .sort(([a], [b]) => (a === 'Uncategorized' || a === 'Sin Categoría') ? 1 : (b === 'Uncategorized' || b === 'Sin Categoría') ? -1 : a.localeCompare(b))
                                                                 .map(([catName, items]) => ({
                                                                     label: catName,
                                                                     options: (items as any[]).map((ai: any) => ({
                                                                         value: ai.id,
                                                                         label: `${ai.name} ($${ai.base_price})`
                                                                     }))
                                                                 }));
                                                         })();

                                                         let currentOption = null;
                                                         for (const group of groupedOptions) {
                                                             const found = group.options.find((opt: any) => opt.value === field.value);
                                                             if (found) { currentOption = found; break; }
                                                         }

                                                         return (
                                                             <Select
                                                                 instanceId={`recipe-item-select-${index}`}
                                                                 {...field}
                                                                 options={groupedOptions}
                                                                 value={currentOption}
                                                                 onChange={(val: any) => field.onChange(val?.value || '')}
                                                                 isClearable
                                                                 placeholder={lang === 'es' ? '-- Elegir Artículo --' : '-- Choose Item --'}
                                                                 unstyled
                                                                 classNames={{
                                                                     control: (state) => `w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 ${state.isFocused ? 'ring-2 ring-primary-500 border-transparent' : ''}`,
                                                                     menuList: () => "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl mt-1 py-1 z-50 overflow-hidden",
                                                                     option: (state) => `px-4 py-2 cursor-pointer transition-colors ${state.isSelected ? 'bg-primary-500 text-white' : state.isFocused ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white' : 'text-gray-900 dark:text-gray-100 bg-transparent'}`,
                                                                     singleValue: () => "text-gray-900 dark:text-gray-100",
                                                                     input: () => "text-gray-900 dark:text-gray-100",
                                                                     placeholder: () => "text-gray-400 m-0",
                                                                     groupHeading: () => "px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-slate-800/50"
                                                                 }}
                                                             />
                                                         );
                                                     }}
                                                 />
                                                {errors.recipe_items?.[index]?.item_id && (
                                                    <p className="mt-1 text-xs text-red-500">{errors.recipe_items[index]?.item_id?.message}</p>
                                                )}
                                            </div>
                                            <div className="w-32">
                                                <input
                                                    {...register(`recipe_items.${index}.quantity` as const)}
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    placeholder={lang === 'es' ? "Cant." : "Qty"}
                                                    className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-gray-100"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent"
                                                title={lang === 'es' ? "Quitar artículo" : "Remove item"}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    );
                                })}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {isSubmitting ? (lang === 'es' ? "Guardando..." : "Saving...") : (lang === 'es' ? "Guardar Artículo" : "Save Item")}
                    </button>
                </div>
            </form >

            <CategoryFormModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onSuccess={() => loadCategories()}
                categoryType={watchType === 'ingredient' ? 'inventory' : 'menu'}
            />
        </div >
    );
}
