import React from 'react';
import { Sparkles, Play, FileSpreadsheet, DollarSign, Package, ShoppingCart, Clock, Trash2, Power, Settings } from 'lucide-react';

interface AIAssistantTabProps {
    lang: 'es' | 'en';
    onRunPrompt: (promptText: string) => void;
}

export default function AIAssistantTab({ lang, onRunPrompt }: AIAssistantTabProps) {
    const isEs = lang === 'es';

    const categories = [
        {
            id: 'excel',
            icon: FileSpreadsheet,
            color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
            title: isEs ? '📊 Informes y Documentos Excel' : '📊 Reports & Excel Documents',
            desc: isEs ? 'Genera y descarga hojas de cálculo de Excel (.xlsx) al instante.' : 'Generate and download Excel (.xlsx) spreadsheets instantly.',
            prompts: [
                { text: isEs ? 'Crear un excel con los gastos operativos de este mes' : 'Create an excel with this month\'s operational expenses', tag: isEs ? 'Gastos' : 'Expenses' },
                { text: isEs ? 'Descargar reporte excel de ventas e IVA de la semana' : 'Download weekly sales and VAT excel report', tag: isEs ? 'Ventas & IVA' : 'Sales & VAT' },
                { text: isEs ? 'Exportar nómina y cargas sociales a excel' : 'Export payroll and social charges to excel', tag: isEs ? 'Nómina' : 'Payroll' },
                { text: isEs ? 'Generar excel de inventario valorado' : 'Generate valued inventory excel', tag: isEs ? 'Inventario' : 'Inventory' },
                { text: isEs ? 'Crear excel del Estado de Resultados PnL' : 'Create P&L Income Statement excel', tag: isEs ? 'Finanzas P&L' : 'P&L Finance' },
            ]
        },
        {
            id: 'costing',
            icon: DollarSign,
            color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            badgeBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
            title: isEs ? '🍲 Rentabilidad de Recetas y Costos' : '🍲 Recipe Costing & Profitability',
            desc: isEs ? 'Calcula el costo real por plato (COGS), márgenes y precios recomendados.' : 'Calculate real dish cost (COGS), profit margins, and recommended prices.',
            prompts: [
                { text: isEs ? '¿Cuál es mi plato más rentable?' : 'What is my most profitable dish?', tag: isEs ? 'Rentabilidad' : 'Profitability' },
                { text: isEs ? 'Analizar costos de platillos del menú' : 'Analyze menu dish costs', tag: isEs ? 'Análisis Menú' : 'Menu Costing' },
                { text: isEs ? '¿Cuánto me cuesta preparar la Pizza Hawaiana y cuál es el precio recomendado?' : 'How much does Hawaiian Pizza cost and what is the target price?', tag: isEs ? 'Costo Plato' : 'Dish Cost' },
            ]
        },
        {
            id: 'inventory',
            icon: Package,
            color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            badgeBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
            title: isEs ? '📦 Gestión de Inventario y Stock' : '📦 Stock & Inventory Management',
            desc: isEs ? 'Ajusta inventario, ingresa compras o mermas con instrucciones simples.' : 'Adjust inventory, restock purchases, or report spoilage effortlessly.',
            prompts: [
                { text: isEs ? 'Agregar 20 kg de queso mozzarella a C$ 120 por kg' : 'Add 20 kg of mozzarella cheese at C$ 120 per kg', tag: isEs ? 'Restock' : 'Restock' },
                { text: isEs ? 'Reportar 5 kg de merma de carne por vencimiento' : 'Report 5 kg of meat spoilage due to expiration', tag: isEs ? 'Merma' : 'Spoilage' },
                { text: isEs ? 'Ajustar stock de cebolla a 15 unidades' : 'Set onion stock level to 15 units', tag: isEs ? 'Ajuste Stock' : 'Stock Adjustment' },
                { text: isEs ? 'Crear nuevo ingrediente Salsa BBQ costo C$ 45' : 'Add new ingredient BBQ Sauce cost C$ 45', tag: isEs ? 'Nuevo Insumo' : 'New Ingredient' },
            ]
        },
        {
            id: 'po',
            icon: ShoppingCart,
            color: 'from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
            badgeBg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
            title: isEs ? '📋 Orden de Compra a Proveedores' : '📋 Supplier Purchase Orders',
            desc: isEs ? 'Detecta insumos con stock bajo y genera borradores de compras.' : 'Detect low stock items and draft automated purchase orders.',
            prompts: [
                { text: isEs ? 'Generar orden de compra para insumos con stock bajo' : 'Generate purchase order for low stock items', tag: isEs ? 'Orden Compra' : 'Purchase Order' },
                { text: isEs ? 'Crear borrador de pedido sugerido a proveedores' : 'Draft recommended order for suppliers', tag: isEs ? 'Proveedores' : 'Suppliers' },
            ]
        },
        {
            id: 'staffing',
            icon: Clock,
            color: 'from-sky-500/10 to-cyan-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
            badgeBg: 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300',
            title: isEs ? '⏰ Horas Pico y Proyección de Personal' : '⏰ Peak Hours & Staffing Projection',
            desc: isEs ? 'Predice turnos de mayor venta y número sugerido de meseros y cocineros.' : 'Predict peak sales shifts and recommended server/cook staffing.',
            prompts: [
                { text: isEs ? '¿Cuántos meseros y cocineros necesito para este viernes?' : 'How many servers and cooks do I need for this Friday?', tag: isEs ? 'Personal' : 'Staffing' },
                { text: isEs ? '¿Cuáles son las 3 horas de mayor venta en la semana?' : 'What are the top 3 peak sales hours of the week?', tag: isEs ? 'Horas Pico' : 'Peak Hours' },
            ]
        },
        {
            id: 'waste',
            icon: Trash2,
            color: 'from-rose-500/10 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
            badgeBg: 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300',
            title: isEs ? '🗑️ Minimizador de Desperdicios' : '🗑️ Waste Minimizer & Slow Stock',
            desc: isEs ? 'Identifica insumos estancados y sugiere promociones para rotarlos.' : 'Identify slow stock and suggest promotional discounts.',
            prompts: [
                { text: isEs ? '¿Qué insumos están estancados en bodega?' : 'Which ingredients are slow-moving in stock?', tag: isEs ? 'Insumos Lentos' : 'Slow Stock' },
                { text: isEs ? 'Identificar insumos en riesgo de desperdicio' : 'Identify ingredients at risk of spoilage', tag: isEs ? 'Desperdicio' : 'Waste Risk' },
            ]
        },
        {
            id: 'toggle',
            icon: Power,
            color: 'from-teal-500/10 to-emerald-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
            badgeBg: 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300',
            title: isEs ? '⚡ Disponibilidad Instantánea de Menú' : '⚡ Instant Menu Availability',
            desc: isEs ? 'Desactiva o activa platos agotados en los terminales POS al instante.' : 'Instantly disable or enable out-of-stock items in POS terminals.',
            prompts: [
                { text: isEs ? 'Desactivar plato Pizza Hawaiana por falta de queso' : 'Disable Hawaiian Pizza due to missing cheese', tag: isEs ? 'Agotado' : 'Out of Stock' },
                { text: isEs ? 'Activar nuevamente Hamburguesa Doble' : 'Re-enable Double Burger', tag: isEs ? 'Disponible' : 'Available' },
            ]
        },
        {
            id: 'setup',
            icon: Settings,
            color: 'from-slate-500/10 to-gray-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
            badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300',
            title: isEs ? '🏛️ Configuración de Cocina, Impresoras y Mesas' : '🏛️ Kitchen, Printers & Tables Setup',
            desc: isEs ? 'Agrega estaciones, impresoras de comandas o mesas desde lenguaje natural.' : 'Add stations, receipt/kitchen printers, or layout tables effortlessly.',
            prompts: [
                { text: isEs ? 'Registrar estación de cocina Parrilla' : 'Add kitchen station Grill', tag: isEs ? 'Estación' : 'Station' },
                { text: isEs ? 'Configurar impresora de cocina IP 192.168.1.150' : 'Setup kitchen printer IP 192.168.1.150', tag: isEs ? 'Impresora' : 'Printer' },
                { text: isEs ? 'Agregar Mesa VIP 5 para salón principal' : 'Add Table VIP 5 for main hall', tag: isEs ? 'Mesas' : 'Tables' },
            ]
        }
    ];

    return (
        <div className="max-w-7xl mx-auto px-10 py-10 space-y-8">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent p-8 rounded-3xl border border-teal-500/20 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-teal-500/15 text-teal-700 dark:text-teal-300 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide uppercase mb-3">
                            <Sparkles className="w-4 h-4 animate-spin text-teal-500" />
                            {isEs ? 'Inteligencia Artificial para Restaurantes' : 'Restaurant AI Intelligence Engine'}
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                            🤖 {isEs ? 'Centro de Capacidades del Asistente IA' : 'AI Assistant Capability Hub'}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium text-sm max-w-2xl">
                            {isEs
                                ? 'Consulta todas las acciones inteligentes que el asistente puede ejecutar. Presiona Cmd + K en cualquier momento o haz clic en "Probar este comando" en cualquier tarjeta.'
                                : 'Explore all intelligent actions the assistant can perform. Press Cmd + K anytime or click "Try this command" on any card.'}
                        </p>
                    </div>

                    <div className="shrink-0 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm text-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                            {isEs ? 'Atajo de Teclado' : 'Keyboard Shortcut'}
                        </span>
                        <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-slate-800 rounded-xl text-gray-900 dark:text-white font-mono font-black text-sm border border-gray-200 dark:border-slate-700">
                            <span>⌘</span>
                            <span>+</span>
                            <span>K</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map((cat) => {
                    const IconComp = cat.icon;
                    return (
                        <div
                            key={cat.id}
                            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
                        >
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${cat.color} border`}>
                                        <IconComp className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                                            {cat.title}
                                        </h3>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                                            {cat.desc}
                                        </p>
                                    </div>
                                </div>

                                {/* Prompts list */}
                                <div className="space-y-2.5 mt-5">
                                    {cat.prompts.map((prompt, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 group hover:border-teal-500/40 transition-colors"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${cat.badgeBg} mb-1`}>
                                                    {prompt.tag}
                                                </span>
                                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                                                    "{prompt.text}"
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => onRunPrompt(prompt.text)}
                                                className="px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
                                                title={isEs ? 'Ejecutar este comando' : 'Run this command'}
                                            >
                                                <Play className="w-3.5 h-3.5 fill-current" />
                                                <span>{isEs ? 'Probar' : 'Try'}</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
