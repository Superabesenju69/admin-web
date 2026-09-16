import { SupabaseClient } from '@supabase/supabase-js';

export interface TagItem {
    id?: string;
    name: string;
    description?: string;
    color?: string;
    created_at?: string;
    assignedIngredients?: any[];
    assignedProducts?: any[];
}

export const DEFAULT_TAG_COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#f97316', // Orange
];

/**
 * Fetches all registered tags from tags table and restaurant_settings fallback,
 * merges any distinct tags found in items, and attaches assigned ingredients and products.
 */
export async function fetchTagsWithItems(supabase: SupabaseClient): Promise<{
    tags: TagItem[];
    allItems: any[];
    allIngredients: any[];
    allProducts: any[];
}> {
    const tagMap = new Map<string, TagItem>();

    // 1. Fetch tags table (gracefully handle if table does not exist)
    try {
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .order('name');
        if (!error && data) {
            data.forEach((t: any, idx: number) => {
                const cleanName = (t.name || '').trim();
                if (cleanName) {
                    tagMap.set(cleanName.toLowerCase(), {
                        id: t.id,
                        name: cleanName,
                        description: t.description || '',
                        color: t.color || DEFAULT_TAG_COLORS[idx % DEFAULT_TAG_COLORS.length],
                        created_at: t.created_at,
                        assignedIngredients: [],
                        assignedProducts: []
                    });
                }
            });
        }
    } catch {
        // Table doesn't exist yet, fallback will handle
    }

    // 2. Fetch custom_tags from restaurant_settings (fallback persistence)
    try {
        const { data: setRow } = await supabase
            .from('restaurant_settings')
            .select('attendance_settings')
            .limit(1)
            .maybeSingle();

        const customTags: any[] = setRow?.attendance_settings?.custom_tags || [];
        customTags.forEach((ct: any, idx: number) => {
            const cleanName = (ct.name || '').trim();
            if (!cleanName) return;
            const key = cleanName.toLowerCase();
            if (!tagMap.has(key)) {
                tagMap.set(key, {
                    id: ct.id,
                    name: cleanName,
                    description: ct.description || '',
                    color: ct.color || DEFAULT_TAG_COLORS[idx % DEFAULT_TAG_COLORS.length],
                    created_at: ct.updated_at || ct.created_at,
                    assignedIngredients: [],
                    assignedProducts: []
                });
            } else {
                const existing = tagMap.get(key)!;
                if (!existing.description && ct.description) existing.description = ct.description;
                if (ct.color) existing.color = ct.color;
                if (!existing.id && ct.id) existing.id = ct.id;
            }
        });
    } catch (settingsErr) {
        console.warn('Error reading custom_tags from settings:', settingsErr);
    }

    // 3. Fetch items to associate with tags
    const { data: itemsData } = await supabase
        .from('items')
        .select('id, name, type, tags, base_price, cost_per_unit, unit_of_measure, stock_level, image_url')
        .order('name');

    const allItems = itemsData || [];
    const allIngredients = allItems.filter(i => i.type === 'ingredient');
    const allProducts = allItems.filter(i => i.type === 'product' || i.type === 'combo');

    // 4. Merge any distinct tags found in items
    let colorIndex = tagMap.size;
    allItems.forEach(item => {
        (item.tags || []).forEach((rawTag: string) => {
            const clean = (rawTag || '').trim();
            if (!clean) return;
            const key = clean.toLowerCase();
            if (!tagMap.has(key)) {
                tagMap.set(key, {
                    name: clean,
                    description: '',
                    color: DEFAULT_TAG_COLORS[colorIndex % DEFAULT_TAG_COLORS.length],
                    assignedIngredients: [],
                    assignedProducts: []
                });
                colorIndex++;
            }
        });
    });

    // 5. Populate assigned ingredients and products
    allItems.forEach(item => {
        (item.tags || []).forEach((rawTag: string) => {
            const clean = (rawTag || '').trim();
            if (!clean) return;
            const key = clean.toLowerCase();
            const tagObj = tagMap.get(key);
            if (tagObj) {
                if (item.type === 'ingredient') {
                    if (!tagObj.assignedIngredients!.some(i => i.id === item.id)) {
                        tagObj.assignedIngredients!.push(item);
                    }
                } else {
                    if (!tagObj.assignedProducts!.some(p => p.id === item.id)) {
                        tagObj.assignedProducts!.push(item);
                    }
                }
            }
        });
    });

    const tags = Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    return {
        tags,
        allItems,
        allIngredients,
        allProducts
    };
}

/**
 * Creates or updates a tag record in Supabase (tags table + restaurant_settings fallback).
 */
export async function saveTag(
    supabase: SupabaseClient,
    tag: { id?: string; name: string; description?: string; color?: string }
): Promise<{ success: boolean; data?: any; error?: any }> {
    const cleanName = tag.name.trim();
    if (!cleanName) return { success: false, error: 'El nombre de la etiqueta es requerido' };

    let tableSaved = false;

    // 1. Attempt to save to public.tags table
    try {
        if (tag.id) {
            const { data, error } = await supabase
                .from('tags')
                .update({
                    name: cleanName,
                    description: tag.description?.trim() || '',
                    color: tag.color || DEFAULT_TAG_COLORS[0],
                    updated_at: new Date().toISOString()
                })
                .eq('id', tag.id)
                .select()
                .single();

            if (!error && data) {
                tableSaved = true;
            }
        } else {
            const { data, error } = await supabase
                .from('tags')
                .insert([{
                    name: cleanName,
                    description: tag.description?.trim() || '',
                    color: tag.color || DEFAULT_TAG_COLORS[0]
                }])
                .select()
                .single();

            if (!error && data) {
                tableSaved = true;
            }
        }
    } catch {
        // Table not available, fallback will persist
    }

    // 2. Always persist into restaurant_settings.attendance_settings.custom_tags
    try {
        const { data: current } = await supabase
            .from('restaurant_settings')
            .select('id, attendance_settings')
            .limit(1)
            .maybeSingle();

        if (current) {
            const prevTags: any[] = current.attendance_settings?.custom_tags || [];
            const cleanLower = cleanName.toLowerCase();
            const existingIdx = prevTags.findIndex((t: any) => 
                (t.name || '').trim().toLowerCase() === cleanLower || (tag.id && t.id === tag.id)
            );

            const tagRecord = {
                id: tag.id || `tag_${Date.now()}`,
                name: cleanName,
                description: tag.description?.trim() || '',
                color: tag.color || DEFAULT_TAG_COLORS[0],
                updated_at: new Date().toISOString()
            };

            const nextTags = [...prevTags];
            if (existingIdx !== -1) {
                nextTags[existingIdx] = { ...nextTags[existingIdx], ...tagRecord };
            } else {
                nextTags.push(tagRecord);
            }

            const updatedSettings = {
                ...(current.attendance_settings || {}),
                custom_tags: nextTags
            };

            await supabase
                .from('restaurant_settings')
                .update({ attendance_settings: updatedSettings })
                .eq('id', current.id);
        }
        return { success: true };
    } catch (settingsErr: any) {
        if (tableSaved) return { success: true };
        console.error('Error saving tag to settings fallback:', settingsErr);
        return { success: false, error: settingsErr?.message || 'Error al guardar la etiqueta' };
    }
}

/**
 * Deletes a tag from the tags table and settings fallback, and removes it from all items' tags arrays.
 */
export async function deleteTagAndUnlink(
    supabase: SupabaseClient,
    tagName: string,
    tagId?: string,
    affectedItems: any[] = []
): Promise<{ success: boolean; error?: any }> {
    const targetTagLower = tagName.trim().toLowerCase();

    // 1. Try to delete from tags table
    if (tagId) {
        try {
            await supabase.from('tags').delete().eq('id', tagId);
        } catch (e) {
            console.warn('Could not delete from tags table:', e);
        }
    }

    // 2. Remove from restaurant_settings.attendance_settings.custom_tags
    try {
        const { data: current } = await supabase
            .from('restaurant_settings')
            .select('id, attendance_settings')
            .limit(1)
            .maybeSingle();

        if (current && current.attendance_settings?.custom_tags) {
            const nextCustomTags = current.attendance_settings.custom_tags.filter(
                (t: any) => (t.name || '').trim().toLowerCase() !== targetTagLower && (!tagId || t.id !== tagId)
            );

            await supabase
                .from('restaurant_settings')
                .update({
                    attendance_settings: {
                        ...current.attendance_settings,
                        custom_tags: nextCustomTags
                    }
                })
                .eq('id', current.id);
        }
    } catch (settingsErr) {
        console.warn('Error removing tag from settings:', settingsErr);
    }

    // 3. Remove tag from items
    try {
        for (const item of affectedItems) {
            const currentTags: string[] = item.tags || [];
            const newTags = currentTags.filter(t => t.trim().toLowerCase() !== targetTagLower);
            if (newTags.length !== currentTags.length) {
                await supabase
                    .from('items')
                    .update({ tags: newTags })
                    .eq('id', item.id);
            }
        }
        return { success: true };
    } catch (err: any) {
        console.error('Error unlinking tag from items:', err);
        return { success: false, error: err?.message };
    }
}

/**
 * Batch updates which ingredients belong to a tag.
 */
export async function batchUpdateTagIngredients(
    supabase: SupabaseClient,
    tagName: string,
    selectedIngredientIds: string[],
    allIngredients: any[]
): Promise<{ success: boolean; error?: any }> {
    const cleanTag = tagName.trim();
    const tagLower = cleanTag.toLowerCase();
    const selectedSet = new Set(selectedIngredientIds);

    try {
        const updatePromises = allIngredients.map(async (ing) => {
            const currentTags: string[] = ing.tags || [];
            const hasTag = currentTags.some(t => t.trim().toLowerCase() === tagLower);
            const shouldHave = selectedSet.has(ing.id);

            if (shouldHave && !hasTag) {
                const newTags = [...currentTags, cleanTag];
                return supabase.from('items').update({ tags: newTags }).eq('id', ing.id);
            } else if (!shouldHave && hasTag) {
                const newTags = currentTags.filter(t => t.trim().toLowerCase() !== tagLower);
                return supabase.from('items').update({ tags: newTags }).eq('id', ing.id);
            }
            return Promise.resolve(null);
        });

        await Promise.all(updatePromises);
        return { success: true };
    } catch (err: any) {
        console.error('Error in batchUpdateTagIngredients:', err);
        return { success: false, error: err?.message };
    }
}
