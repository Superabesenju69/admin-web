import ItemForm from "@/components/ItemForm";
import { Header } from "@/components/Header";

export default function NewItemPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="p-8">
                <ItemForm />
            </main>
        </div>
    );
}
