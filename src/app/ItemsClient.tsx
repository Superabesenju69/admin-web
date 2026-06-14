"use client";

import { useState } from "react";
import { Package, Utensils, Beaker } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";

type ItemTypeFilter = "all" | "ingredient" | "product" | "combo";

export default function ItemsClient({ items, error }: any) {
    const [activeTab, setActiveTab] = useState<ItemTypeFilter>("all");

    if (error) {
        return (
            <div className="p-8 text-red-500">
                <h1>Error loading items:</h1>
                <p>{error.message}</p>
            </div>
        );
    }

    const filteredItems = items?.filter((item: any) =>
        activeTab === "all" ? true : item.type === activeTab
    ) || [];

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <div className="max-w-6xl mx-auto p-8">
                <header className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Items Management</h1>
                        <p className="text-gray-500 mt-2">Manage your ingredients, products, and combos.</p>
                    </div>
                    <Link href="/items/new" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors text-sm">
                        + New Item
                    </Link>
                </header>

                {/* Custom Tabs */}
                <div className="mb-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {[
                            { id: "all", label: "All Items" },
                            { id: "ingredient", label: "Ingredients" },
                            { id: "product", label: "Products" },
                            { id: "combo", label: "Combos" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as ItemTypeFilter)}
                                className={`
                  whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                  ${activeTab === tab.id
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                    }
                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-500">Item Name</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-500">Type</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-500">Base Price</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-500">Inventory Status</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItems.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                                                {getTypeIcon(item.type)}
                                                <span className="capitalize">{item.type}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            ${item.base_price.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.track_inventory ? (
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${item.stock_level > 20 ? 'bg-green-500' : 'bg-amber-500'}`} />
                                                    <span className="text-sm font-medium text-gray-700">{item.stock_level} units</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">Not tracked</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/items/${item.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                                                Edit
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            No items found for {activeTab === "all" ? "your database" : `the type "${activeTab}"`}.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper functions for UI
function getTypeColor(type: string) {
    switch (type) {
        case 'ingredient': return 'bg-amber-50 text-amber-700';
        case 'product': return 'bg-blue-50 text-blue-700';
        case 'combo': return 'bg-purple-50 text-purple-700';
        default: return 'bg-gray-50 text-gray-700';
    }
}

function getTypeIcon(type: string) {
    switch (type) {
        case 'ingredient': return <Beaker className="w-3.5 h-3.5" />;
        case 'product': return <Utensils className="w-3.5 h-3.5" />;
        case 'combo': return <Package className="w-3.5 h-3.5" />;
        default: return null;
    }
}
