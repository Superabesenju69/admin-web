import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import ItemForm from "@/components/ItemForm";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const resolvedParams = await params;

    const { data: item, error } = await supabase
        .from('items')
        .select(`
            *,
            item_categories(category_id),
            recipes!recipes_parent_item_id_fkey(child_item_id, quantity)
        `)
        .eq('id', resolvedParams.id)
        .single();

    if (error || !item) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <ItemForm initialData={item} />
        </div>
    );
}
