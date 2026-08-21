import { createClient } from "@/utils/supabase/server";
import CategoriesClient from "./CategoriesClient";

export const dynamic = 'force-dynamic';

export default async function CategoriesDashboard({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient();
    const resolvedParams = await searchParams;
    const categoryType = typeof resolvedParams.type === 'string' ? resolvedParams.type : 'menu';

    // Fetch all categories from the database, sorted by display_order
    const { data: categories, error } = await supabase
        .from("categories")
        .select("*, item_categories(count)")
        .eq("type", categoryType)
        .order("display_order");

    return <CategoriesClient categories={categories} error={error} categoryType={categoryType} />;
}
