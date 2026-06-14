"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, FolderTree } from "lucide-react";

export function Header() {
    const pathname = usePathname();

    const routes = [
        {
            href: "/",
            label: "Items",
            icon: Package,
            active: pathname === "/" || pathname?.startsWith("/items"),
        },
        {
            href: "/categories",
            label: "Categories",
            icon: FolderTree,
            active: pathname?.startsWith("/categories"),
        },
    ];

    return (
        <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 w-full mb-8">
            <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8 h-full">
                    <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        <span className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center">
                            R
                        </span>
                        Restaurant OS
                    </div>

                    <nav className="flex items-center gap-2 h-full">
                        {routes.map((route) => {
                            const Icon = route.icon;
                            return (
                                <Link
                                    key={route.href}
                                    href={route.href}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors h-[40px] ${route.active
                                            ? "bg-blue-50 text-blue-700"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {route.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-xs font-medium text-gray-600">
                        A
                    </div>
                </div>
            </div>
        </div>
    );
}
