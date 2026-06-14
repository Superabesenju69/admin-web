"use client";

import { Folder, ArrowUpDown } from "lucide-react";
import { Header } from "@/components/Header";
import { CategoryFormModal } from "@/components/CategoryFormModal";
import { useState } from "react";

export default function CategoriesClient({ categories, error }: any) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (error) {
        return (
            <div className="p-8 text-red-500">
                <h1>Error loading categories:</h1>
                <p>{error.message}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="p-8 max-w-6xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Menu Categories</h1>
                        <p className="text-gray-500 mt-2">Organize your items into groups for the POS and Menus.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors text-sm"
                    >
                        + New Category
                    </button>
                </header>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-500 w-16"></th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-500">Category Name</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-500">Items Count</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {categories?.map((category: any) => (
                                    <tr key={category.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                                            <ArrowUpDown className="w-4 h-4" />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                                                <Folder className="w-4 h-4" />
                                            </div>
                                            {category.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <span className="inline-flex items-center justify-center bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                                {category.item_categories[0]?.count || 0} items
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors opacity-0 group-hover:opacity-100">
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {categories?.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                            No categories found. Create one to organize your menu!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <CategoryFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}
