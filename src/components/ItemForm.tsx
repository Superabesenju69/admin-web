"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import Select from "react-select";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/utils/supabase/client";
import { 
    ArrowLeft, 
    Save, 
    Plus, 
    Trash2, 
    UploadCloud, 
    CheckCircle2, 
    AlertCircle, 
    X, 
    FileImage, 
    RefreshCw, 
    Link as LinkIcon,
    Layers,
    Maximize2,
    Grid,
    Copy,
    Sparkles,
    Check,
    ChevronDown
} from "lucide-react";
import Link from "next/link";
import TagInput from "./TagInput";
import { fetchTagsWithItems, TagItem } from "../utils/tagUtils";
import { CategoryFormModal } from "@/components/CategoryFormModal";
import { 
    encodeRecipeVariation, 
    decodeRecipeVariation, 
    getCombinationKey 
} from "@/utils/recipeUtils";

interface ImageDropzoneProps {
    value?: string;
    onChange: (url: string) => void;
    lang: 'en' | 'es';
}

function ImageDropzone({ value, onChange, lang }: ImageDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [showManualUrl, setShowManualUrl] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadFile = async (file: File) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            setUploadError(lang === 'es' ? 'Formato no soportado. Usa PNG, JPG, WEBP, GIF o SVG.' : 'Unsupported format. Use PNG, JPG, WEBP, GIF, or SVG.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setUploadError(lang === 'es' ? 'El archivo supera el límite de 5MB.' : 'File size exceeds 5MB limit.');
            return;
        }

        setUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'items');

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            if (data.url) {
                onChange(data.url);
            }
        } catch (err: any) {
            console.error('Error uploading image:', err);
            setUploadError(err.message || (lang === 'es' ? 'Error al subir la imagen' : 'Failed to upload image'));
        } finally {
            setUploading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleUploadFile(files[0]);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleUploadFile(files[0]);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {lang === 'es' ? 'Imagen del Producto' : 'Product Image'}
                </label>
                <button
                    type="button"
                    onClick={() => setShowManualUrl(!showManualUrl)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                    <LinkIcon className="w-3 h-3" />
                    {showManualUrl
                        ? (lang === 'es' ? 'Usar Arrastrar y Soltar' : 'Use Drag & Drop')
                        : (lang === 'es' ? 'Pegar URL' : 'Paste URL')}
                </button>
            </div>

            {showManualUrl ? (
                <div className="relative">
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="https://example.com/imagen.png"
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-gray-100 text-sm bg-white dark:bg-slate-900"
                    />
                    {value && (
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                            title={lang === 'es' ? 'Limpiar URL' : 'Clear URL'}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ) : value ? (
                <div className="relative group rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/70 dark:bg-slate-950/70 p-3.5 flex items-center gap-4 transition-all">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <img
                            src={value}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLElement).style.opacity = '0.3';
                            }}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{lang === 'es' ? 'Imagen asignada' : 'Image assigned'}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs font-mono mb-2">
                            {value}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 shadow-xs transition active:scale-95 cursor-pointer"
                            >
                                <RefreshCw className={`w-3 h-3 ${uploading ? 'animate-spin' : ''}`} />
                                <span>{lang === 'es' ? 'Cambiar' : 'Change'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 transition active:scale-95 cursor-pointer"
                            >
                                <Trash2 className="w-3 h-3" />
                                <span>{lang === 'es' ? 'Eliminar' : 'Remove'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    onDragEnter={handleDragOver}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 p-6 flex flex-col items-center justify-center text-center cursor-pointer select-none group ${
                        isDragging
                            ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/30 scale-[1.01] ring-4 ring-primary-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-primary-400 dark:hover:border-primary-600 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                >
                    {uploading ? (
                        <div className="flex flex-col items-center py-2">
                            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mb-2" />
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {lang === 'es' ? 'Subiendo imagen a la nube...' : 'Uploading image to cloud...'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                {lang === 'es' ? 'Por favor espera un momento' : 'Please wait a moment'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="w-11 h-11 rounded-2xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform shadow-xs">
                                <UploadCloud className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                                {lang === 'es' ? 'Arrastra y suelta tu imagen aquí' : 'Drag & drop your image here'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                {lang === 'es' ? 'o haz clic para seleccionar archivo' : 'or click to browse files'}
                            </p>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                                <FileImage className="w-3 h-3" />
                                <span>PNG, JPG, WEBP, GIF, SVG (máx. 5MB)</span>
                            </div>
                        </>
                    )}
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                className="hidden"
            />

            {uploadError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-900/50 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                </div>
            )}
        </div>
    );
}

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
        type_name: z.string().nullable().optional(),
        size_name: z.string().nullable().optional()
    })).default([]),
});

type ItemFormValues = z.infer<typeof itemSchema>;

export interface VariationOption {
    name: string;
    price: number;
}

function isMissingColumnError(err: any, colName: string): boolean {
    if (!err) return false;
    const code = String(err.code || '');
    const msg = String(err.message || '').toLowerCase();
    const details = String(err.details || '').toLowerCase();
    const target = colName.toLowerCase();
    return (
        code === '42703' ||
        code === 'PGRST204' ||
        code === 'PGRST200' ||
        msg.includes(target) ||
        details.includes(target) ||
        msg.includes('schema cache') ||
        msg.includes('could not find the')
    );
}

let itemsSupportsCombinationPricesColumn: boolean | null = null;
let recipesSupportsTypeColumn: boolean | null = null;

export default function ItemForm({ initialData, preset }: { initialData?: any, preset?: 'menu' | 'ingredient' }) {
    const router = useRouter();
    const supabase = createClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lang, setLang] = useState<'en'|'es'>('es');

    const [restaurantSettings, setRestaurantSettings] = useState<any>(null);

    // Tipos & Tamaños state
    const [tipos, setTipos] = useState<VariationOption[]>([]);
    const [tamanos, setTamanos] = useState<VariationOption[]>([]);
    const [combinationPrices, setCombinationPrices] = useState<Record<string, number>>({});
    const [newTipoName, setNewTipoName] = useState("");
    const [newTamanoName, setNewTamanoName] = useState("");

    // Selected recipe slice (2D matrix coordinates)
    const [selectedRecipeType, setSelectedRecipeType] = useState<string | null>(null);
    const [selectedRecipeSize, setSelectedRecipeSize] = useState<string | null>(null);

    // Copy Recipe Dropdown State
    const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('pos_language');
        if (saved === 'en' || saved === 'es') setLang(saved);

        supabase.from('restaurant_settings').select('*').limit(1).then(({ data }: any) => {
            if (data && data[0]) setRestaurantSettings(data[0]);
        });
    }, []);

    const [categories, setCategories] = useState<any[]>([]);
    const [availableIngredients, setAvailableIngredients] = useState<any[]>([]);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [stations, setStations] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [availableTags, setAvailableTags] = useState<TagItem[]>([]);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    const loadCategories = async () => {
        const { data: catData } = await supabase.from('categories').select('*').order('display_order');
        if (catData) setCategories(catData);
    };

    // Extract initial Tipos, Tamaños, CombinationPrices, and OtherOptions
    const parseInitialOptionsAndRecipes = (data: any) => {
        const rawOptions = data?.options || [];
        let parsedTipos: VariationOption[] = [];
        let parsedTamanos: VariationOption[] = [];
        let parsedComboPrices: Record<string, number> = {};
        const otherOptions: any[] = [];

        rawOptions.forEach((opt: any) => {
            const optName = (opt.name || '').trim().toLowerCase();
            if (optName === 'tipo') {
                parsedTipos = (opt.choices || []).map((c: any) => ({
                    name: typeof c === 'object' ? c.name : String(c),
                    price: typeof c === 'object' ? (c.price_modifier || 0) : 0
                })).filter((t: VariationOption) => t.name);
            } else if (optName === 'tamaño' || optName === 'size' || optName === 'tamano') {
                parsedTamanos = (opt.choices || []).map((c: any) => ({
                    name: typeof c === 'object' ? c.name : String(c),
                    price: typeof c === 'object' ? (c.price_modifier || 0) : 0
                })).filter((s: VariationOption) => s.name);
            } else if (optName === '__combination_prices') {
                parsedComboPrices = { ...parsedComboPrices, ...(opt.prices || {}) };
            } else {
                otherOptions.push({
                    name: opt.name,
                    choices: (opt.choices || []).map((c: any) => {
                        if (typeof c === 'object') {
                            return { name: c.name || '', price_modifier: c.price_modifier || 0 };
                        }
                        return { name: String(c), price_modifier: 0 };
                    }),
                    hide_in_combo: opt.hide_in_combo || false,
                });
            }
        });

        if (data?.combination_prices && typeof data.combination_prices === 'object') {
            parsedComboPrices = { ...parsedComboPrices, ...data.combination_prices };
        }

        const decodedRecipes = (data?.recipes || []).map((r: any) => {
            const dec = decodeRecipeVariation(r);
            return {
                item_id: r.child_item_id,
                quantity: r.quantity,
                type_name: dec.type_name,
                size_name: dec.size_name
            };
        });

        return {
            tipos: parsedTipos,
            tamanos: parsedTamanos,
            combinationPrices: parsedComboPrices,
            otherOptions,
            decodedRecipes
        };
    };

    const initialParsed = initialData ? parseInitialOptionsAndRecipes(initialData) : null;

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
            options: initialParsed?.otherOptions || [],
            recipe_items: initialParsed?.decodedRecipes || [],
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
            options: [],
            recipe_items: [],
        },
    });

    // Initialize state if initialData is provided
    useEffect(() => {
        if (initialParsed) {
            setTipos(initialParsed.tipos);
            setTamanos(initialParsed.tamanos);
            setCombinationPrices(initialParsed.combinationPrices);
        }
    }, []);

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

            try {
                const { tags: loadedTags } = await fetchTagsWithItems(supabase);
                if (loadedTags) setAvailableTags(loadedTags);
            } catch (tagErr) {
                console.warn('Error loading tags in ItemForm:', tagErr);
            }

            if (initialData) {
                const parsed = parseInitialOptionsAndRecipes(initialData);
                setTipos(parsed.tipos);
                setTamanos(parsed.tamanos);
                setCombinationPrices(parsed.combinationPrices);

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
                    options: parsed.otherOptions,
                    recipe_items: parsed.decodedRecipes,
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
    const watchBasePrice = watch("base_price") || 0;

    // Helper functions for Tipos & Tamaños
    const addTipo = () => {
        const trimmed = newTipoName.trim();
        if (!trimmed) return;
        if (tipos.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
            alert(lang === 'es' ? 'Este tipo ya existe.' : 'This type already exists.');
            return;
        }
        setTipos([...tipos, { name: trimmed, price: 0 }]);
        setNewTipoName("");
    };

    const removeTipo = (index: number) => {
        const removed = tipos[index];
        setTipos(tipos.filter((_, i) => i !== index));
        // Clean combination prices
        const updated = { ...combinationPrices };
        Object.keys(updated).forEach(k => {
            if (k.startsWith(`${removed.name}__`)) delete updated[k];
        });
        setCombinationPrices(updated);
        // Reset selected recipe type if removed
        if (selectedRecipeType === removed.name) {
            setSelectedRecipeType(null);
        }
    };

    const addTamano = () => {
        const trimmed = newTamanoName.trim();
        if (!trimmed) return;
        if (tamanos.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
            alert(lang === 'es' ? 'Este tamaño ya existe.' : 'This size already exists.');
            return;
        }
        setTamanos([...tamanos, { name: trimmed, price: 0 }]);
        setNewTamanoName("");
    };

    const removeTamano = (index: number) => {
        const removed = tamanos[index];
        setTamanos(tamanos.filter((_, i) => i !== index));
        // Clean combination prices
        const updated = { ...combinationPrices };
        Object.keys(updated).forEach(k => {
            if (k.endsWith(`__${removed.name}`)) delete updated[k];
        });
        setCombinationPrices(updated);
        // Reset selected recipe size if removed
        if (selectedRecipeSize === removed.name) {
            setSelectedRecipeSize(null);
        }
    };

    const updateCombinationPrice = (tipo: string, tamano: string, price: number) => {
        const key = getCombinationKey(tipo, tamano);
        setCombinationPrices(prev => ({
            ...prev,
            [key]: price
        }));
    };

    const fillAllCombinationPricesWithBase = () => {
        const updated = { ...combinationPrices };
        const base = Number(watchBasePrice) || 0;
        tipos.forEach(t => {
            tamanos.forEach(s => {
                const key = getCombinationKey(t.name, s.name);
                if (updated[key] === undefined || updated[key] === null || updated[key] === 0) {
                    updated[key] = base;
                }
            });
        });
        setCombinationPrices(updated);
    };

    // Recipe Cloning / Copying
    const copyRecipeFrom = (fromType: string | null, fromSize: string | null) => {
        const currentRecipeItems = watch('recipe_items') || [];
        const sourceItems = currentRecipeItems.filter((r: any) => 
            (r.type_name || null) === fromType && (r.size_name || null) === fromSize
        );

        if (sourceItems.length === 0) {
            alert(lang === 'es' ? 'La variación seleccionada no contiene ingredientes para copiar.' : 'The selected variation has no ingredients to copy.');
            return;
        }

        // Keep items from other combinations, replace items in current active combination
        const otherItems = currentRecipeItems.filter((r: any) => 
            !((r.type_name || null) === selectedRecipeType && (r.size_name || null) === selectedRecipeSize)
        );

        const clonedItems = sourceItems.map((r: any) => ({
            item_id: r.item_id,
            quantity: r.quantity,
            type_name: selectedRecipeType,
            size_name: selectedRecipeSize
        }));

        reset({
            ...watch(),
            recipe_items: [...otherItems, ...clonedItems]
        });

        setIsCopyMenuOpen(false);
    };

    // Calculate variations that currently have ingredients defined
    const recipeVariationsWithItems = (() => {
        const currentRecipeItems = watch('recipe_items') || [];
        const map = new Map<string, { type_name: string | null; size_name: string | null; count: number }>();
        
        currentRecipeItems.forEach((r: any) => {
            const key = `${r.type_name || '__base__'}:::${r.size_name || '__base__'}`;
            if (!map.has(key)) {
                map.set(key, {
                    type_name: r.type_name || null,
                    size_name: r.size_name || null,
                    count: 0
                });
            }
            map.get(key)!.count++;
        });

        return Array.from(map.values());
    })();

    const onSubmit = async (data: ItemFormValues) => {
        setIsSubmitting(true);
        setError(null);

        const parsedTags = data.tags
            ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
            : [];

        // Build full options array incorporating Tipos, Tamaños, and other options
        const finalOptions: any[] = [];

        if (tipos.length > 0) {
            finalOptions.push({
                name: "Tipo",
                choices: tipos.map(t => ({
                    name: t.name,
                    price_modifier: tamanos.length > 0 ? 0 : (t.price || 0)
                })),
                hide_in_combo: false
            });
        }

        if (tamanos.length > 0) {
            finalOptions.push({
                name: "Tamaño",
                choices: tamanos.map(s => ({
                    name: s.name,
                    price_modifier: tipos.length > 0 ? 0 : (s.price || 0)
                })),
                hide_in_combo: false
            });
        }

        // Add other custom modifiers
        (data.options || []).forEach(o => {
            if (o.name && o.choices.length > 0) {
                finalOptions.push({
                    name: o.name.trim(),
                    choices: o.choices.map((c: any) => ({
                        name: (c.name || '').trim(),
                        price_modifier: c.price_modifier || 0,
                    })).filter((c: any) => c.name),
                    hide_in_combo: !!o.hide_in_combo
                });
            }
        });

        // Store combination prices in options metadata for guaranteed cross-device persistence
        if (tipos.length > 0 && tamanos.length > 0) {
            finalOptions.push({
                name: "__combination_prices",
                prices: combinationPrices
            });
        }

        try {
            let itemId = initialData?.id;

            const itemBasePayload: any = {
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
                options: finalOptions,
            };

            // Determine whether to attempt using combination_prices column
            const shouldTryComboColumn = itemsSupportsCombinationPricesColumn !== false;
            const itemPayloadWithColumn = shouldTryComboColumn
                ? { ...itemBasePayload, combination_prices: combinationPrices }
                : itemBasePayload;

            if (itemId) {
                // Update item
                let { error: updateError } = await supabase
                    .from("items")
                    .update(itemPayloadWithColumn)
                    .eq('id', itemId);

                // Fallback without combination_prices column if column does not exist
                if (updateError && isMissingColumnError(updateError, 'combination_prices')) {
                    itemsSupportsCombinationPricesColumn = false;
                    const fallback = await supabase
                        .from("items")
                        .update(itemBasePayload)
                        .eq('id', itemId);
                    updateError = fallback.error;
                } else if (!updateError && shouldTryComboColumn) {
                    itemsSupportsCombinationPricesColumn = true;
                }

                if (updateError) throw updateError;
            } else {
                // Insert item
                let { data: newItemData, error: insertError } = await supabase
                    .from("items")
                    .insert([itemPayloadWithColumn])
                    .select()
                    .single();

                // Fallback without combination_prices column if column does not exist
                if (insertError && isMissingColumnError(insertError, 'combination_prices')) {
                    itemsSupportsCombinationPricesColumn = false;
                    const fallback = await supabase
                        .from("items")
                        .insert([itemBasePayload])
                        .select()
                        .single();
                    newItemData = fallback.data;
                    insertError = fallback.error;
                } else if (!insertError && shouldTryComboColumn) {
                    itemsSupportsCombinationPricesColumn = true;
                }

                if (insertError) throw insertError;
                itemId = newItemData.id;
            }

            // Categories
            if (itemId) {
                await supabase.from("item_categories").delete().eq('item_id', itemId);
                if (data.category_id) {
                    await supabase.from("item_categories").insert([{ item_id: itemId, category_id: data.category_id }]);
                }

                // Recipes
                await supabase.from("recipes").delete().eq('parent_item_id', itemId);

                if ((data.type === 'product' || data.type === 'combo') && data.recipe_items.length > 0) {
                    const validRecipeItems = data.recipe_items.filter(ri => ri.item_id && ri.item_id.length > 0);
                    if (validRecipeItems.length > 0) {
                        const tenantId = typeof window !== 'undefined' ? localStorage.getItem('pos_tenant_id') : null;
                        
                        const fullRecipeInserts = validRecipeItems.map((r: any) => {
                            const encoded = encodeRecipeVariation(r.type_name, r.size_name);
                            return {
                                parent_item_id: itemId,
                                child_item_id: r.item_id,
                                quantity: r.quantity,
                                size_name: encoded.size_name,
                                type_name: encoded.type_name,
                                unit: 'piece',
                                ...(tenantId ? { tenant_id: tenantId } : {})
                            };
                        });

                        const shouldTryTypeColumn = recipesSupportsTypeColumn !== false;
                        const initialRecipeInserts = shouldTryTypeColumn
                            ? fullRecipeInserts
                            : fullRecipeInserts.map(({ type_name, ...rest }) => rest);

                        // Attempt insert
                        let { error: recipeError } = await supabase.from("recipes").insert(initialRecipeInserts);

                        // Fallback if type_name column is not in DB yet
                        if (recipeError && isMissingColumnError(recipeError, 'type_name')) {
                            recipesSupportsTypeColumn = false;
                            const fallbackInserts = fullRecipeInserts.map(({ type_name, ...rest }) => rest);
                            const resFallback = await supabase.from("recipes").insert(fallbackInserts);
                            recipeError = resFallback.error;
                        } else if (!recipeError && shouldTryTypeColumn) {
                            recipesSupportsTypeColumn = true;
                        }

                        if (recipeError) throw recipeError;
                    }
                }
            }

            router.push("/");
            router.refresh();
        } catch (err: any) {
            console.error('Error saving item:', err);
            setError(err.message || "An error occurred while saving the item.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isRecipeBuilderVisible = watchType === "product" || watchType === "combo";
    const availableOptions = watchType === "combo" ? availableProducts : availableIngredients;

    // Filter fields for the current (Tipo × Tamaño) variation
    const currentSliceItems = fields.filter(f => 
        (f.type_name || null) === selectedRecipeType && 
        (f.size_name || null) === selectedRecipeSize
    );

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <Link href="/" className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    {lang === 'es' ? 'Volver al Dashboard' : 'Back to Dashboard'}
                </Link>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    {initialData ? (lang === 'es' ? 'Editar Artículo' : 'Edit Item') : (lang === 'es' ? 'Crear Nuevo Artículo' : 'Create New Item')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    {initialData 
                        ? (lang === 'es' ? 'Actualizar detalles, precios por tipo y tamaño, y recetas.' : 'Update item details, prices by type and size, and recipes.') 
                        : (lang === 'es' ? 'Añadir un nuevo producto, combo o ingrediente a tu catálogo.' : 'Add a new product, combo, or ingredient to your catalog.')}
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit as any, (formErrors) => {
                console.error('Form validation errors:', formErrors);
                setError(lang === 'es' ? 'Por favor corrija los errores del formulario antes de guardar.' : 'Please fix validation errors before saving.');
            })} className="space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-200 dark:border-red-900/50 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Basic Info & Image Upload */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {lang === 'es' ? 'Nombre del Artículo' : 'Item Name'}
                                </label>
                                <input
                                    {...register("name")}
                                    type="text"
                                    placeholder={lang === 'es' ? 'ej. Pizza Suprema, Hamburguesa Clásica' : 'e.g. Supreme Pizza, Classic Burger'}
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900 text-sm"
                                />
                                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {lang === 'es' ? 'Tipo de Artículo' : 'Item Type'}
                                </label>
                                <select
                                    {...register("type")}
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 text-sm"
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
                        </div>

                        <div>
                            <Controller
                                control={control}
                                name="image_url"
                                render={({ field }) => (
                                    <ImageDropzone
                                        value={field.value}
                                        onChange={field.onChange}
                                        lang={lang}
                                    />
                                )}
                            />
                            {errors.image_url && <p className="mt-1 text-sm text-red-500">{errors.image_url.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {lang === 'es' ? 'Categoría (Opcional)' : 'Category (Optional)'}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryModalOpen(true)}
                                    className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-semibold hover:text-primary-800 dark:hover:text-primary-300 transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>{lang === 'es' ? 'Nueva Categoría' : 'New Category'}</span>
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
                                                control: (state) => `w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl focus-within:ring-2 focus-within:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 ${state.isFocused ? 'ring-2 ring-primary-500 border-transparent' : ''}`,
                                                menuList: () => "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-xl mt-1 py-1 z-50 overflow-hidden",
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

                        {(watchType === 'product' || watchType === 'combo') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {lang === 'es' ? 'Estación de Cocina' : 'Kitchen Station'}
                                    <span className="ml-2 text-xs text-gray-400 font-normal">
                                        {lang === 'es' ? '(a dónde se envían los tickets)' : '(where tickets are routed)'}
                                    </span>
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
                                                    control: (state) => `w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl focus-within:ring-2 focus-within:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 ${state.isFocused ? 'ring-2 ring-primary-500 border-transparent' : ''}`,
                                                    menuList: () => "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-xl mt-1 py-1 z-50 overflow-hidden",
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
                        )}
                    </div>

                {/* Tags & Extras Autocomplete Section */}
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                    <Controller
                        name="tags"
                        control={control}
                        render={({ field }) => {
                            const currentArray = (field.value || '')
                                .split(',')
                                .map((t: string) => t.trim())
                                .filter(Boolean);
                            return (
                                <TagInput
                                    value={currentArray}
                                    onChange={(newTags) => field.onChange(newTags.join(', '))}
                                    availableTags={availableTags}
                                    allIngredients={availableIngredients}
                                    lang={lang}
                                    isProduct={watchType === 'product' || watchType === 'combo'}
                                    currencySymbol={restaurantSettings?.currency === 'USD' ? '$' : restaurantSettings?.currency || 'C$'}
                                />
                            );
                        }}
                    />
                </div>

                {/* Base Price */}
                <div>
                        <div className="flex items-center justify-between mb-2 max-w-xs">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {lang === 'es' ? `Precio Base (${restaurantSettings?.currency === 'USD' ? '$' : restaurantSettings?.currency || 'C$'})` : `Base Price (${restaurantSettings?.currency === 'USD' ? '$' : restaurantSettings?.currency || 'C$'})`}
                            </label>
                            {(() => {
                                const cs = restaurantSettings?.attendance_settings?.currency_settings || restaurantSettings?.currency_settings;
                                const enableSec = cs?.enable_secondary_currency ?? restaurantSettings?.enable_secondary_currency;
                                const secCode = cs?.secondary_currency || restaurantSettings?.secondary_currency || 'USD';
                                const rate = Number(cs?.exchange_rate || restaurantSettings?.exchange_rate) || 36.80;
                                const priceNum = Number(watchBasePrice) || 0;

                                if (enableSec && rate > 0 && priceNum > 0) {
                                    const converted = (priceNum / rate).toFixed(2);
                                    return (
                                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/40">
                                            ≈ ${converted} {secCode}
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                        <input
                            {...register("base_price")}
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full max-w-xs px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 font-mono font-bold"
                        />
                        {errors.base_price && <p className="mt-1 text-sm text-red-500">{errors.base_price.message}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                            {lang === 'es' ? 'Se utilizará si el artículo no tiene tipos ni tamaños definidos.' : 'Used if no specific types or sizes are configured.'}
                        </p>
                    </div>

                    {/* Options, Tipos & Tamaños Section */}
                    {(watchType === 'product' || watchType === 'combo') && (
                        <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-primary-600" />
                                    <span>{lang === 'es' ? 'Variaciones que Afectan Recetas (Tipo y Tamaño)' : 'Recipe Variations (Type & Size)'}</span>
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {lang === 'es' 
                                        ? 'Tanto Tipo como Tamaño son las únicas variaciones que ramifican recetas independientes en la cocina e inventario.' 
                                        : 'Both Type and Size are the only variations that branch into independent recipes for kitchen & inventory.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* SUBSECTION: TIPOS */}
                                <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                                T
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                                                    {lang === 'es' ? 'Tipos de Producto' : 'Product Types'}
                                                </h4>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    {lang === 'es' ? 'ej. Masa Tradicional, Delgada, Sartén, Integral' : 'e.g. Traditional, Thin Crust, Pan, Whole Wheat'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Add Tipo Input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newTipoName}
                                            onChange={e => setNewTipoName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTipo(); } }}
                                            placeholder={lang === 'es' ? 'Nuevo tipo (ej. Masa Delgada)' : 'New type (e.g. Thin Crust)'}
                                            className="flex-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={addTipo}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>{lang === 'es' ? 'Añadir' : 'Add'}</span>
                                        </button>
                                    </div>

                                    {/* Tipos List */}
                                    {tipos.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic py-2 text-center">
                                            {lang === 'es' ? 'Sin tipos definidos. Opcional.' : 'No types defined. Optional.'}
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {tipos.map((tipo, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200/80 dark:border-slate-700 shadow-xs">
                                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                        {tipo.name}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {tamanos.length === 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[10px] text-gray-400 font-medium">{lang === 'es' ? 'Precio:' : 'Price:'}</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={tipo.price}
                                                                    onChange={e => {
                                                                        const updated = [...tipos];
                                                                        updated[idx].price = parseFloat(e.target.value) || 0;
                                                                        setTipos(updated);
                                                                    }}
                                                                    className="w-20 px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-900 text-center font-bold text-gray-900 dark:text-gray-100"
                                                                />
                                                            </div>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTipo(idx)}
                                                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                                                            title={lang === 'es' ? 'Eliminar tipo' : 'Remove type'}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* SUBSECTION: TAMAÑOS */}
                                <div className="p-5 rounded-2xl border border-purple-100 dark:border-purple-950/60 bg-purple-50/30 dark:bg-purple-950/20 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                                                <Maximize2 className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                                                    {lang === 'es' ? 'Tamaños de Producto' : 'Product Sizes'}
                                                </h4>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    {lang === 'es' ? 'ej. Personal, Mediana, Grande, Familiar' : 'e.g. Personal, Medium, Large, Family'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Add Tamaño Input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newTamanoName}
                                            onChange={e => setNewTamanoName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTamano(); } }}
                                            placeholder={lang === 'es' ? 'Nuevo tamaño (ej. Grande)' : 'New size (e.g. Large)'}
                                            className="flex-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={addTamano}
                                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>{lang === 'es' ? 'Añadir' : 'Add'}</span>
                                        </button>
                                    </div>

                                    {/* Tamaños List */}
                                    {tamanos.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic py-2 text-center">
                                            {lang === 'es' ? 'Sin tamaños definidos. Opcional.' : 'No sizes defined. Optional.'}
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {tamanos.map((tamano, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200/80 dark:border-slate-700 shadow-xs">
                                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                        {tamano.name}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {tipos.length === 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[10px] text-gray-400 font-medium">{lang === 'es' ? 'Precio:' : 'Price:'}</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={tamano.price}
                                                                    onChange={e => {
                                                                        const updated = [...tamanos];
                                                                        updated[idx].price = parseFloat(e.target.value) || 0;
                                                                        setTamanos(updated);
                                                                    }}
                                                                    className="w-20 px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-900 text-center font-bold text-gray-900 dark:text-gray-100"
                                                                />
                                                            </div>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTamano(idx)}
                                                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                                                            title={lang === 'es' ? 'Eliminar tamaño' : 'Remove size'}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SUBSECTION: 2D PRICING MATRIX (When BOTH Tipos & Tamaños exist) */}
                            {tipos.length > 0 && tamanos.length > 0 && (
                                <div className="p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                                                <Grid className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                                <span>{lang === 'es' ? 'Matriz de Precios (Tipo × Tamaño)' : 'Pricing Matrix (Type × Size)'}</span>
                                            </h4>
                                            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                                                {lang === 'es' 
                                                    ? 'Define el precio final exacto de venta para cada combinación de tipo y tamaño.' 
                                                    : 'Define the exact sale price for each combination of type and size.'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={fillAllCombinationPricesWithBase}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer self-start sm:self-auto"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>{lang === 'es' ? `Llenar con Precio Base ($${watchBasePrice})` : `Fill with Base Price ($${watchBasePrice})`}</span>
                                        </button>
                                    </div>

                                    {/* Responsive 2D Price Matrix Table */}
                                    <div className="overflow-x-auto rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs bg-white dark:bg-slate-900">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-emerald-100/50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-900/50">
                                                    <th className="p-3 font-bold text-gray-700 dark:text-gray-300">
                                                        {lang === 'es' ? 'Tipo \\ Tamaño' : 'Type \\ Size'}
                                                    </th>
                                                    {tamanos.map((s, sIdx) => (
                                                        <th key={sIdx} className="p-3 font-bold text-center text-gray-800 dark:text-gray-200">
                                                            {s.name}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                {tipos.map((t, tIdx) => (
                                                    <tr key={tIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                        <td className="p-3 font-bold text-gray-900 dark:text-gray-100 bg-slate-50/40 dark:bg-slate-900/40">
                                                            {t.name}
                                                        </td>
                                                        {tamanos.map((s, sIdx) => {
                                                            const key = getCombinationKey(t.name, s.name);
                                                            const val = combinationPrices[key] !== undefined ? combinationPrices[key] : (Number(watchBasePrice) || 0);
                                                            return (
                                                                <td key={sIdx} className="p-2.5 text-center">
                                                                    <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 focus-within:ring-2 focus-within:ring-emerald-500 shadow-2xs">
                                                                        <span className="text-gray-400 font-mono mr-1">
                                                                            {restaurantSettings?.currency === 'USD' ? '$' : restaurantSettings?.currency || 'C$'}
                                                                        </span>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            value={val}
                                                                            onChange={e => updateCombinationPrice(t.name, s.name, parseFloat(e.target.value) || 0)}
                                                                            className="w-20 bg-transparent text-right font-mono font-bold text-xs text-gray-900 dark:text-gray-100 outline-none"
                                                                        />
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* SUBSECTION: OTHER CUSTOM OPTIONS / MODIFIERS (Término, Notas, etc.) */}
                            <div className="pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {lang === 'es' ? 'Otras Opciones y Modificadores (ej. Término, Extras)' : 'Other Modifiers & Options (e.g. Meat Term, Notes)'}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {lang === 'es' ? 'Opciones que no alteran la receta base de inventario.' : 'Options that do not alter the base inventory recipe.'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => appendOpt({ name: "", choices: [{ name: "", price_modifier: 0 }], hide_in_combo: false })}
                                        className="text-xs text-primary-600 font-bold hover:text-primary-800 transition-colors cursor-pointer"
                                    >
                                        + {lang === 'es' ? 'Añadir Opción' : 'Add Option'}
                                    </button>
                                </div>

                                {optFields.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic py-2">
                                        {lang === 'es' ? 'Sin opciones adicionales.' : 'No additional modifiers defined.'}
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {optFields.map((field, index) => (
                                            <div key={field.id} className="border p-4 rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30">
                                                <div className="flex gap-3 items-start mb-3">
                                                    <div className="flex-1">
                                                        <input
                                                            {...register(`options.${index}.name` as const)}
                                                            type="text"
                                                            placeholder={lang === 'es' ? "Nombre de la Opción (ej. Término de la Carne)" : "Option Name (e.g. Meat Temperature)"}
                                                            className="w-full text-sm font-semibold px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                                                        />
                                                        {errors.options?.[index]?.name && <p className="mt-1 text-xs text-red-500">{errors.options[index]?.name?.message}</p>}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOpt(index)}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors cursor-pointer"
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
                                                                <div className="grid grid-cols-[1fr_120px_32px] gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                                                                    <span>{lang === 'es' ? 'Valor / Elección' : 'Choice Value'}</span>
                                                                    <span>{lang === 'es' ? 'Precio (+/-)' : 'Price (+/-)'}</span>
                                                                    <span></span>
                                                                </div>
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
                                                                            placeholder={lang === 'es' ? 'ej. Término Medio, Bien Cocido' : 'e.g. Medium Rare, Well Done'}
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
                                                                            className="p-1 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => choicesField.onChange([...choices, { name: "", price_modifier: 0 }])}
                                                                    className="text-xs text-primary-600 font-semibold hover:text-primary-800 transition-colors mt-1 cursor-pointer"
                                                                >
                                                                    + {lang === 'es' ? 'Añadir valor' : 'Add choice'}
                                                                </button>
                                                            </div>
                                                        );
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <hr className="border-gray-100 dark:border-slate-800" />

                    {/* Inventory Settings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {lang === 'es' ? 'Control de Inventario' : 'Inventory Tracking'}
                        </h3>

                        <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                            <input
                                {...register("track_inventory")}
                                type="checkbox"
                                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 cursor-pointer"
                            />
                            <div>
                                <span className="block font-medium text-gray-900 dark:text-gray-100">
                                    {lang === 'es' ? 'Rastrear Inventario' : 'Track Inventory'}
                                </span>
                                <span className="block text-sm text-gray-500 dark:text-gray-400">
                                    {lang === 'es' ? 'Habilita esto para artículos físicos que se agotan.' : 'Enable this for physical items that run out of stock.'}
                                </span>
                            </div>
                        </label>

                        {watchTrackInventory && (
                            <div className="pl-4 border-l-2 border-primary-500 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {lang === 'es' ? 'Nivel de Stock Inicial' : 'Initial Stock Level'}
                                        </label>
                                        <input
                                            {...register("stock_level")}
                                            type="number"
                                            step="0.01"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {lang === 'es' ? 'Unidad de Medida' : 'Unit of Measure'}
                                        </label>
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
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {lang === 'es' ? 'Costo por Unidad' : 'Cost per Unit'}
                                        </label>
                                        <input
                                            {...register("cost_per_unit")}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {lang === 'es' ? 'Nivel Par (Punto de reorden)' : 'Par Level (Reorder Point)'}
                                        </label>
                                        <input
                                            {...register("par_level")}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder={lang === 'es' ? "0 = sin alerta" : "0 = no alert"}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RECIPE BUILDER: 2D HIERARCHY MATRIX (Tipo en Eje Izquierdo × Tamaño en Eje Superior) */}
                    {isRecipeBuilderVisible && (
                        <>
                            <hr className="border-gray-100 dark:border-slate-800" />
                            <div className="space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <Grid className="w-5 h-5 text-primary-600" />
                                            <span>{lang === 'es' ? 'Matriz de Recetas (Tipo × Tamaño)' : '2D Recipe Matrix (Type × Size)'}</span>
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {lang === 'es' 
                                                ? 'Selecciona el Tipo a la izquierda y el Tamaño arriba para configurar los ingredientes exactos de cada combinación.' 
                                                : 'Select the Type on the left and Size on top to configure exact ingredients for each variation.'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        {/* Copy Recipe Dropdown */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsCopyMenuOpen(!isCopyMenuOpen)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                                <span>{lang === 'es' ? 'Copiar Receta de...' : 'Copy Recipe from...'}</span>
                                                <ChevronDown className="w-3 h-3 ml-0.5" />
                                            </button>

                                            {isCopyMenuOpen && (
                                                <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
                                                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100 dark:border-slate-800">
                                                        {lang === 'es' ? 'Variaciones con Ingredientes' : 'Available Recipe Sources'}
                                                    </div>
                                                    {recipeVariationsWithItems.length === 0 ? (
                                                        <div className="p-3 text-xs text-gray-400 italic text-center">
                                                            {lang === 'es' ? 'No hay otras recetas aún' : 'No recipes defined yet'}
                                                        </div>
                                                    ) : (
                                                        recipeVariationsWithItems.map((v, vIdx) => {
                                                            const isCurrent = (v.type_name || null) === selectedRecipeType && (v.size_name || null) === selectedRecipeSize;
                                                            return (
                                                                <button
                                                                    key={vIdx}
                                                                    type="button"
                                                                    disabled={isCurrent}
                                                                    onClick={() => copyRecipeFrom(v.type_name, v.size_name)}
                                                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                                                                        isCurrent 
                                                                            ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-slate-800' 
                                                                            : 'hover:bg-amber-50 dark:hover:bg-amber-950/50 text-gray-800 dark:text-gray-200 cursor-pointer'
                                                                    }`}
                                                                >
                                                                    <div className="truncate">
                                                                        <span className="font-bold">
                                                                            {v.type_name ? `[${v.type_name}]` : '[General]'}
                                                                        </span>
                                                                        <span className="text-gray-500 ml-1">
                                                                            {v.size_name ? `× ${v.size_name}` : '× General'}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-gray-500">
                                                                        {v.count} ing.
                                                                    </span>
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Add Ingredient to Current Slice */}
                                        <button
                                            type="button"
                                            onClick={() => append({ 
                                                item_id: "", 
                                                quantity: 1, 
                                                type_name: selectedRecipeType, 
                                                size_name: selectedRecipeSize 
                                            })}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>{lang === 'es' ? (watchType === 'combo' ? 'Añadir Producto' : 'Añadir Ingrediente') : (watchType === 'combo' ? 'Add Product' : 'Add Ingredient')}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* EJE SUPERIOR: BOTONES SELECTORES DE TAMAÑO */}
                                <div className="space-y-1.5 pb-2 border-b border-gray-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <Maximize2 className="w-3.5 h-3.5 text-purple-600" />
                                            <span>{lang === 'es' ? 'Eje Superior: Tamaño' : 'Top Axis: Size'}</span>
                                        </div>
                                        {selectedRecipeSize && (
                                            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold lowercase">
                                                {lang === 'es' ? `tamaño activo: ${selectedRecipeSize}` : `active size: ${selectedRecipeSize}`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto py-1">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRecipeSize(null)}
                                            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                                selectedRecipeSize === null
                                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20 scale-[1.02]'
                                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            <span>🌟</span>
                                            <span>{lang === 'es' ? 'Base General' : 'Base / All Sizes'}</span>
                                        </button>
                                        {tamanos.map((s, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setSelectedRecipeSize(s.name)}
                                                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                                    selectedRecipeSize === s.name
                                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20 scale-[1.02]'
                                                        : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                <span>📏</span>
                                                <span>{s.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 2D CONTAINER: EJE LATERAL IZQUIERDO (TIPOS) + TABLA CENTRAL */}
                                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-start pt-1">
                                    {/* EJE LATERAL IZQUIERDO: SELECTORES DE TIPO */}
                                    <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-gray-200/80 dark:border-slate-800">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                            <span>{lang === 'es' ? 'Eje Lateral: Tipo' : 'Left Axis: Type'}</span>
                                        </div>
                                        <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedRecipeType(null)}
                                                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                                                    selectedRecipeType === null
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <span>🌟</span>
                                                    <span className="truncate">{lang === 'es' ? 'Base / Todos' : 'Base / All'}</span>
                                                </div>
                                                {selectedRecipeType === null && <Check className="w-3.5 h-3.5 shrink-0" />}
                                            </button>

                                            {tipos.map((t, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setSelectedRecipeType(t.name)}
                                                    className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                                                        selectedRecipeType === t.name
                                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                                            : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <span>🍞</span>
                                                        <span className="truncate">{t.name}</span>
                                                    </div>
                                                    {selectedRecipeType === t.name && <Check className="w-3.5 h-3.5 shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* TABLA CENTRAL DE INGREDIENTES PARA LA COMBINACIÓN ACTIVA */}
                                    <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
                                        {/* Status header of current intersection */}
                                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                    {lang === 'es' ? 'Receta para:' : 'Recipe for:'}
                                                </span>
                                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                    {selectedRecipeType ? `Tipo: ${selectedRecipeType}` : (lang === 'es' ? 'Tipo: Base / Todos' : 'Type: Base / All')}
                                                </span>
                                                <span className="text-gray-400 font-bold">×</span>
                                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                    {selectedRecipeSize ? `Tamaño: ${selectedRecipeSize}` : (lang === 'es' ? 'Tamaño: Base General' : 'Size: Base General')}
                                                </span>
                                            </div>
                                            <span className="text-[11px] font-mono font-bold text-gray-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-700">
                                                {currentSliceItems.length} {lang === 'es' ? 'ingredientes' : 'items'}
                                            </span>
                                        </div>

                                        {/* Ingredient rows */}
                                        {currentSliceItems.length === 0 ? (
                                            <div className="p-8 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-center">
                                                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                    {lang === 'es' ? 'Aún no hay ingredientes para esta combinación' : 'No ingredients for this variation yet'}
                                                </p>
                                                <p className="text-xs text-gray-400 mb-4">
                                                    {lang === 'es' 
                                                        ? 'Haz clic en "Añadir Ingrediente" o copia la receta de otra variación con el botón superior.' 
                                                        : 'Click "Add Ingredient" or copy from another variation above.'}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => append({ 
                                                        item_id: "", 
                                                        quantity: 1, 
                                                        type_name: selectedRecipeType, 
                                                        size_name: selectedRecipeSize 
                                                    })}
                                                    className="inline-flex items-center gap-1 px-3.5 py-2 bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 rounded-xl text-xs font-bold hover:bg-primary-100 transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    <span>{lang === 'es' ? 'Añadir Primer Ingrediente' : 'Add First Ingredient'}</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {fields.map((field, index) => {
                                                    const isMatch = (field.type_name || null) === selectedRecipeType && (field.size_name || null) === selectedRecipeSize;
                                                    if (!isMatch) return null;

                                                    return (
                                                        <div key={field.id} className="flex gap-3 items-center">
                                                            <input type="hidden" {...register(`recipe_items.${index}.type_name` as const)} value={field.type_name || ""} />
                                                            <input type="hidden" {...register(`recipe_items.${index}.size_name` as const)} value={field.size_name || ""} />
                                                            
                                                            <div className="flex-1">
                                                                <Controller
                                                                    name={`recipe_items.${index}.item_id` as const}
                                                                    control={control}
                                                                    render={({ field: selectField }) => {
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
                                                                                        label: `${ai.name} (${restaurantSettings?.currency === 'USD' ? '$' : restaurantSettings?.currency || 'C$'}${ai.base_price})`
                                                                                    }))
                                                                                }));
                                                                        })();

                                                                        let currentOption = null;
                                                                        for (const group of groupedOptions) {
                                                                            const found = group.options.find((opt: any) => opt.value === selectField.value);
                                                                            if (found) { currentOption = found; break; }
                                                                        }

                                                                        return (
                                                                            <Select
                                                                                instanceId={`recipe-item-select-${index}`}
                                                                                {...selectField}
                                                                                options={groupedOptions}
                                                                                value={currentOption}
                                                                                onChange={(val: any) => selectField.onChange(val?.value || '')}
                                                                                isClearable
                                                                                placeholder={lang === 'es' ? '-- Elegir Artículo --' : '-- Choose Item --'}
                                                                                unstyled
                                                                                classNames={{
                                                                                    control: (state) => `w-full px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl focus-within:ring-2 focus-within:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 ${state.isFocused ? 'ring-2 ring-primary-500 border-transparent' : ''}`,
                                                                                    menuList: () => "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-xl mt-1 py-1 z-50 overflow-hidden",
                                                                                    option: (state) => `px-4 py-2 cursor-pointer transition-colors ${state.isSelected ? 'bg-primary-500 text-white' : state.isFocused ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white' : 'text-gray-900 dark:text-gray-100 bg-transparent'}`,
                                                                                    singleValue: () => "text-gray-900 dark:text-gray-100 text-sm",
                                                                                    input: () => "text-gray-900 dark:text-gray-100 text-sm",
                                                                                    placeholder: () => "text-gray-400 m-0 text-sm",
                                                                                    groupHeading: () => "px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-slate-800/50"
                                                                                }}
                                                                            />
                                                                        );
                                                                    }}
                                                                />
                                                            </div>

                                                            <div className="w-28">
                                                                <input
                                                                    {...register(`recipe_items.${index}.quantity` as const)}
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0.01"
                                                                    placeholder={lang === 'es' ? "Cant." : "Qty"}
                                                                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-gray-100 text-sm font-mono text-center"
                                                                />
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => remove(index)}
                                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                                                                title={lang === 'es' ? "Quitar ingrediente" : "Remove ingredient"}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-slate-800">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {isSubmitting ? (lang === 'es' ? "Guardando..." : "Saving...") : (lang === 'es' ? "Guardar Artículo" : "Save Item")}
                    </button>
                </div>
            </form>

            <CategoryFormModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onSuccess={() => loadCategories()}
                categoryType={watchType === 'ingredient' ? 'inventory' : 'menu'}
            />
        </div>
    );
}
