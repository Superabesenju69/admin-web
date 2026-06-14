"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { CategoryFormModal } from "@/components/CategoryFormModal";

const itemSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    type: z.enum(["ingredient", "product", "combo"]),
    base_price: z.coerce.number().min(0, "Price cannot be negative"),
    track_inventory: z.boolean().default(true),
    stock_level: z.coerce.number().min(0, "Stock cannot be negative").default(0),
    category_id: z.string().optional(),
    station_id: z.string().optional(),
    recipe_items: z.array(z.object({
        item_id: z.string().min(1, "Select an item"),
        quantity: z.coerce.number().min(0.01, "Quantity > 0")
    })).default([]),
});

type ItemFormValues = z.infer<typeof itemSchema>;

export default function ItemForm({ initialData }: { initialData?: any }) {
    const router = useRouter();
    const supabase = createClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [categories, setCategories] = useState<any[]>([]);
    const [availableIngredients, setAvailableIngredients] = useState<any[]>([]);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [stations, setStations] = useState<any[]>([]);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    const loadCategories = async () => {
        const { data: catData } = await supabase.from('categories').select('*').order('display_order');
        if (catData) setCategories(catData);
    };

    useEffect(() => {
        async function loadData() {
            await loadCategories();
            const { data: ingData } = await supabase.from('items').select('*').eq('type', 'ingredient').order('name');
            if (ingData) setAvailableIngredients(ingData);
            const { data: prodData } = await supabase.from('items').select('*').in('type', ['product', 'combo']).order('name');
            if (prodData) setAvailableProducts(prodData);
            const { data: stData } = await supabase.from('kitchen_stations').select('*').order('display_order');
            if (stData) setStations(stData);
        }
        loadData();
    }, [supabase]);

    const {
        control,
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ItemFormValues>({
        resolver: zodResolver(itemSchema) as any,
        defaultValues: initialData ? {
            name: initialData.name,
            type: initialData.type,
            base_price: initialData.base_price,
            track_inventory: initialData.track_inventory,
            stock_level: initialData.stock_level,
            category_id: initialData.item_categories?.[0]?.category_id || "",
            station_id: initialData.station_id || "",
            recipe_items: initialData.recipes?.map((r: any) => ({
                item_id: r.child_item_id,
                quantity: r.quantity
            })) || [],
        } : {
            type: "ingredient",
            base_price: 0,
            track_inventory: true,
            stock_level: 0,
            station_id: "",
            category_id: "",
            recipe_items: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "recipe_items"
    });

    const watchType = watch("type");
    const watchTrackInventory = watch("track_inventory");

    const onSubmit = async (data: ItemFormValues) => {
        setIsSubmitting(true);
        setError(null);

        try {
            let itemId = initialData?.id;

            if (itemId) {
                // Update
                const { error: updateError } = await supabase
                    .from("items")
                    .update({
                        name: data.name,
                        type: data.type,
                        base_price: data.base_price,
                        track_inventory: data.track_inventory,
                        stock_level: data.stock_level,
                        station_id: data.station_id || null,
                    })
                    .eq('id', itemId);
                if (updateError) throw updateError;
            } else {
                // Insert
                const { data: newItemData, error: insertError } = await supabase
                    .from("items")
                    .insert([{
                        name: data.name,
                        type: data.type,
                        base_price: data.base_price,
                        track_inventory: data.track_inventory,
                        stock_level: data.stock_level,
                        station_id: data.station_id || null,
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
                    const recipeInserts = data.recipe_items.map(ri => ({
                        parent_item_id: itemId,
                        child_item_id: ri.item_id,
                        quantity: ri.quantity,
                        unit: 'piece'
                    }));
                    const { error: recipeError } = await supabase.from("recipes").insert(recipeInserts);
                    if (recipeError) throw recipeError;
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

    const isRecipeBuilderVisible = watchType === "product" || watchType === "combo";
    const availableOptions = watchType === "combo" ? availableProducts : availableIngredients;

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="mb-8">
                <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{initialData ? 'Edit Item' : 'Create New Item'}</h1>
                <p className="text-gray-500 mt-2">{initialData ? 'Update item details, categories, and recipes.' : 'Add a new ingredient, product, or combo to your database.'}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                        <input
                            {...register("name")}
                            type="text"
                            placeholder="e.g. Tomato, Pizza Margarita, Lunch Combo"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900"
                        />
                        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Item Type</label>
                            <select
                                {...register("type")}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900"
                            >
                                <option value="ingredient">Ingredient</option>
                                <option value="product">Product</option>
                                <option value="combo">Combo</option>
                            </select>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">Category (Optional)</label>
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryModalOpen(true)}
                                    className="text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors"
                                >
                                    + New Category
                                </button>
                            </div>
                            <select
                                {...register("category_id")}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900"
                            >
                                <option value="">-- No Category --</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Kitchen Station — only for products & combos */}
                        {(watchType === 'product' || watchType === 'combo') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Kitchen Station
                                    <span className="ml-2 text-xs text-gray-400 font-normal">(where tickets for this item are routed)</span>
                                </label>
                                <select
                                    {...register("station_id")}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900"
                                >
                                    <option value="">-- No Station --</option>
                                    {stations.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                {stations.length === 0 && (
                                    <p className="mt-1 text-xs text-amber-600">No stations yet. Create stations in Dashboard → Kitchen tab.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Base Price ($)</label>
                        <input
                            {...register("base_price")}
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full max-w-xs px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                        />
                        {errors.base_price && <p className="mt-1 text-sm text-red-500">{errors.base_price.message}</p>}
                    </div>

                    <hr className="border-gray-100" />

                    {/* Inventory Settings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Inventory Tracking</h3>

                        <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                                {...register("track_inventory")}
                                type="checkbox"
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <div>
                                <span className="block font-medium text-gray-900">Track Inventory</span>
                                <span className="block text-sm text-gray-500">Enable this for physical items that run out of stock.</span>
                            </div>
                        </label>

                        {watchTrackInventory && (
                            <div className="pl-4 border-l-2 border-blue-500">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Initial Stock Level</label>
                                <input
                                    {...register("stock_level")}
                                    type="number"
                                    step="0.01"
                                    className="w-full max-w-xs px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                                />
                                {errors.stock_level && <p className="mt-1 text-sm text-red-500">{errors.stock_level.message}</p>}
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
                                        <h3 className="text-lg font-medium text-gray-900">Recipe / Combo Contents</h3>
                                        <p className="text-sm text-gray-500">Select what {watchType === 'combo' ? 'products' : 'ingredients'} make up this item.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => append({ item_id: "", quantity: 1 })}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 font-medium text-sm rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add {watchType === 'combo' ? 'Product' : 'Ingredient'}
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {fields.length === 0 && (
                                        <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm">
                                            No items added to this recipe yet.
                                        </div>
                                    )}
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex gap-3 items-start">
                                            <div className="flex-1">
                                                <select
                                                    {...register(`recipe_items.${index}.item_id` as const)}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                                >
                                                    <option value="">-- Choose Item --</option>
                                                    {availableOptions.map(ai => (
                                                        <option key={ai.id} value={ai.id}>{ai.name} (${ai.base_price})</option>
                                                    ))}
                                                </select>
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
                                                    placeholder="Qty"
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent"
                                                title="Remove item"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {isSubmitting ? "Saving..." : "Save Item"}
                    </button>
                </div>
            </form>

            <CategoryFormModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onSuccess={() => loadCategories()}
            />
        </div>
    );
}
