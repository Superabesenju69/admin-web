/**
 * recipeUtils.ts
 * Utilities for encoding/decoding 2D recipe matrix variations (Tipo × Tamaño)
 * and resolving pricing combinations.
 */

export interface RecipeVariation {
    type_name: string | null;
    size_name: string | null;
}

/**
 * Encodes a (type_name, size_name) pair into DB storage fields.
 * If the database has both type_name and size_name columns, both are stored.
 * In size_name, we also encode composite format `${type_name}:::${size_name}`
 * to ensure 100% backward/cross-compatibility regardless of DB column availability.
 */
export function encodeRecipeVariation(
    typeName?: string | null,
    sizeName?: string | null
): { type_name: string | null; size_name: string | null } {
    const t = typeName?.trim() || null;
    const s = sizeName?.trim() || null;

    if (t && s) {
        return { type_name: t, size_name: `${t}:::${s}` };
    } else if (t && !s) {
        return { type_name: t, size_name: `[tipo]${t}` };
    } else if (!t && s) {
        return { type_name: null, size_name: s };
    } else {
        return { type_name: null, size_name: null };
    }
}

/**
 * Decodes a raw recipe record from DB into explicit { type_name, size_name }.
 */
export function decodeRecipeVariation(recipe: {
    type_name?: string | null;
    size_name?: string | null;
}): RecipeVariation {
    if (recipe.type_name) {
        let cleanSize = recipe.size_name || null;
        if (cleanSize) {
            if (cleanSize.includes(':::')) {
                cleanSize = cleanSize.split(':::')[1] || null;
            } else if (cleanSize.startsWith('[tipo]')) {
                cleanSize = null;
            }
        }
        return { type_name: recipe.type_name, size_name: cleanSize };
    }

    const raw = recipe.size_name?.trim() || null;
    if (!raw) {
        return { type_name: null, size_name: null };
    }

    if (raw.includes(':::')) {
        const [t, s] = raw.split(':::');
        return { type_name: t?.trim() || null, size_name: s?.trim() || null };
    }

    if (raw.startsWith('[tipo]')) {
        return { type_name: raw.replace('[tipo]', '').trim() || null, size_name: null };
    }

    return { type_name: null, size_name: raw };
}

/**
 * Generates a consistent key for pricing combinations
 */
export function getCombinationKey(tipo: string, tamano: string): string {
    return `${tipo.trim()}__${tamano.trim()}`;
}
