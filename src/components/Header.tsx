"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

export function Header() {
    const pathname = usePathname();
    const [lang, setLang] = useState<'en'|'es'>('es');

    useEffect(() => {
        const saved = localStorage.getItem('pos_language');
        if (saved === 'en' || saved === 'es') setLang(saved);
    }, []);

    return (
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col shrink-0 h-screen relative z-20 shadow-sm">
            <div className="h-20 flex items-center px-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center shadow-sm">
                        <span className="text-white font-black text-sm">OS</span>
                    </div>
                    <div>
                        <h1 className="font-extrabold text-gray-900 dark:text-gray-100 text-lg leading-tight">Restaurant</h1>
                        <p className="text-xs font-semibold text-gray-400">{lang === 'es' ? 'Panel de Control' : 'Admin Panel'}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
                <Link
                    href="/"
                    className="flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-2xl transition-all text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-100"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {lang === 'es' ? 'Volver al Dashboard' : 'Back to Dashboard'}
                </Link>
            </div>
        </aside>
    );
}
