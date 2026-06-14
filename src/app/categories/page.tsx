import { createClient } from "@/utils/supabase/server";
import CategoriesClient from "./CategoriesClient";

export default async function CategoriesDashboard() {
    const supabase = await createClient();

    // Fetch all categories from the database, sorted by display_order
    const { data: categories, error } = await supabase
        .from("categories")
        .select("*, item_categories(count)")
        .order("display_order");

    return <CategoriesClient categories={categories} error={error} />;
}
