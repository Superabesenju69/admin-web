import ItemForm from "@/components/ItemForm";
import { Header } from "@/components/Header";

export const dynamic = 'force-dynamic';

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
    const resolvedParams = await searchParams;

    return (
        <div className="h-screen flex bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
            <Header />
            <main className="flex-1 overflow-y-auto w-full p-8">
                <ItemForm preset={resolvedParams.preset as 'menu' | 'ingredient'} />
            </main>
        </div>
    );
}
