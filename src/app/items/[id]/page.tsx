import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import ItemForm from "@/components/ItemForm";

export const dynamic = 'force-dynamic';

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const resolvedParams = await params;

    const { data: item, error } = await supabase
        .from('items')
        .select(`
            *,
            item_categories(category_id),
            recipes!recipes_parent_item_id_fkey(child_item_id, quantity, size_name)
        `)
        .eq('id', resolvedParams.id)
        .single();

    if (error || !item) {
        notFound();
    }

    return (
        <div className="h-screen flex bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
            <Header />
            <main className="flex-1 overflow-y-auto w-full p-8">
                <ItemForm initialData={item} />
            </main>
        </div>
    );
}
