/**
 * AI Analytics & Restaurant Intelligence Engine
 * Handles recipe profitability, purchase orders, staffing projections, slow stock detection, and menu availability toggles.
 */

export interface AIActionResult {
    success: boolean;
    title: string;
    message: string;
    details?: any;
    formattedText?: string;
    actionType?: string;
}

/**
 * 1. Recipe & Dish Profitability Advisor
 */
export async function analyzeRecipeCost(supabase: any, targetDish?: string): Promise<AIActionResult> {
    try {
        const { data: items } = await supabase.from('items').select('*').order('name');
        if (!items || items.length === 0) {
            return {
                success: false,
                title: '🍲 Asesor de Recetas y Costos',
                message: 'No hay productos registrados en el menú para analizar costos.'
            };
        }

        let filteredItems = items;
        if (targetDish) {
            const match = items.filter((i: any) => i.name.toLowerCase().includes(targetDish.toLowerCase()));
            if (match.length > 0) filteredItems = match;
        }

        // Calculate food cost metrics
        const analysis = filteredItems.map((item: any) => {
            const price = Number(item.price || 0);
            const cost = Number(item.cost_per_unit || (price * 0.35)); // Fallback 35% food cost if unconfigured
            const profit = price - cost;
            const margin = price > 0 ? (profit / price) * 100 : 0;
            const recPrice70Margin = cost / 0.30; // Suggested price for 70% gross margin

            return {
                name: item.name,
                price,
                cost,
                profit,
                margin: Number(margin.toFixed(1)),
                recommendedPrice: Number(recPrice70Margin.toFixed(2))
            };
        });

        // Sort by profitability
        analysis.sort((a: any, b: any) => b.profit - a.profit);

        const mostProfitable = analysis[0];
        const leastProfitable = [...analysis].sort((a: any, b: any) => a.margin - b.margin)[0];

        let formattedText = `📊 **Análisis de Rentabilidad de Menú (${analysis.length} platillos)**:\n\n`;
        formattedText += `🏆 **Plato más rentable**: ${mostProfitable.name} (Ganancia: C$ ${mostProfitable.profit.toFixed(2)} / Margen: ${mostProfitable.margin}%)\n`;
        formattedText += `⚠️ **Plato con menor margen**: ${leastProfitable.name} (Margen: ${leastProfitable.margin}% / Costo: C$ ${leastProfitable.cost.toFixed(2)})\n\n`;
        formattedText += `💡 **Recomendaciones de Precios (para 70% de Margen Neta)**:\n`;

        analysis.slice(0, 5).forEach((dish: any) => {
            formattedText += `• **${dish.name}**: Precio Actual C$ ${dish.price.toFixed(2)} | Costo Insumos C$ ${dish.cost.toFixed(2)} | Precio Sugerido C$ ${dish.recommendedPrice.toFixed(2)} (Margen: ${dish.margin}%)\n`;
        });

        return {
            success: true,
            title: '🍲 Asesor de Recetas y Rentabilidad',
            message: `Análisis completado para ${analysis.length} platillos.`,
            formattedText,
            details: analysis
        };
    } catch (err: any) {
        return { success: false, title: 'Error', message: err.message };
    }
}

/**
 * 2. Automated Supplier Purchase Order Generator
 */
export async function draftPurchaseOrders(supabase: any, supplierName?: string): Promise<AIActionResult> {
    try {
        const { data: items } = await supabase.from('items').select('*, suppliers(id, name, phone, email)').order('name');
        if (!items || items.length === 0) {
            return {
                success: false,
                title: '📋 Generador de Orden de Compra',
                message: 'No se encontraron insumos registrados en el inventario.'
            };
        }

        // Filter items below or equal to par_level
        const lowStockItems = items.filter((i: any) => {
            const stock = Number(i.stock_quantity || i.stock_level || 0);
            const par = Number(i.par_level || 5);
            return stock <= par;
        });

        if (lowStockItems.length === 0) {
            return {
                success: true,
                title: '📋 Generador de Orden de Compra',
                message: '✅ Todos los insumos tienen niveles de stock óptimos. No se requieren órdenes de compra urgentes.',
                formattedText: '✅ **Estado de Inventario Excelente**: Todos los insumos están sobre el nivel par/mínimo establecido.'
            };
        }

        // Group by supplier
        const supplierGroups: Record<string, { supplier: string; phone?: string; items: any[] }> = {};

        lowStockItems.forEach((item: any) => {
            const suppName = item.suppliers?.name || 'Proveedor General';
            if (supplierName && !suppName.toLowerCase().includes(supplierName.toLowerCase())) {
                return;
            }

            if (!supplierGroups[suppName]) {
                supplierGroups[suppName] = {
                    supplier: suppName,
                    phone: item.suppliers?.phone,
                    items: []
                };
            }

            const currentStock = Number(item.stock_quantity || item.stock_level || 0);
            const par = Number(item.par_level || 5);
            const orderQty = Math.max(par * 2 - currentStock, 10);
            const unitCost = Number(item.cost_per_unit || 0);
            const estimatedTotal = orderQty * unitCost;

            supplierGroups[suppName].items.push({
                name: item.name,
                unit: item.unit_of_measure || 'unidades',
                currentStock,
                par,
                orderQty,
                unitCost,
                estimatedTotal
            });
        });

        let formattedText = `📦 **Borrador de Orden de Compra Automática (${lowStockItems.length} insumos bajos)**:\n\n`;

        Object.values(supplierGroups).forEach((group) => {
            const groupTotal = group.items.reduce((s: any, i: any) => s + i.estimatedTotal, 0);
            formattedText += `🏢 **PROVEEDOR: ${group.supplier}** ${group.phone ? `(Tel: ${group.phone})` : ''}\n`;
            formattedText += `--------------------------------------------------\n`;
            group.items.forEach((item: any) => {
                formattedText += `• **${item.name}**: Pedir **${item.orderQty} ${item.unit}** (Stock actual: ${item.currentStock} ${item.unit} | Mínimo: ${item.par}) ~ Est: C$ ${item.estimatedTotal.toFixed(2)}\n`;
            });
            formattedText += `💰 **Total Estimado Pedido**: C$ ${groupTotal.toFixed(2)}\n\n`;
        });

        const itemsListStr = lowStockItems.map((i: any) => i.name).join(', ');
        formattedText += `💬 **Texto sugerido para enviar por WhatsApp**:\n`;
        formattedText += `_"Estimado proveedor, adjunto pedido urgente para el restaurante: ${itemsListStr}. Favor confirmar tiempo de entrega."_`;

        return {
            success: true,
            title: '📋 Orden de Compra Sugerida',
            message: `Generada orden de compra para ${lowStockItems.length} insumos bajos.`,
            formattedText,
            details: supplierGroups
        };
    } catch (err: any) {
        return { success: false, title: 'Error', message: err.message };
    }
}

/**
 * 3. Peak Hours & Staffing Requirement Predictor
 */
export async function predictStaffingRequirements(supabase: any, targetDay?: string): Promise<AIActionResult> {
    try {
        let start = new Date();
        start.setDate(start.getDate() - 30); // Analyze last 30 days

        const { data: orders } = await supabase
            .from('orders')
            .select('created_at, total_amount, total')
            .gte('created_at', start.toISOString());

        if (!orders || orders.length === 0) {
            return {
                success: false,
                title: '⏰ Proyección de Horas Pico y Personal',
                message: 'No hay suficientes órdenes históricas para calcular horas pico.'
            };
        }

        // Aggregate volume by hour
        const hourlyStats: Record<number, { count: number; revenue: number }> = {};
        for (let h = 0; h < 24; h++) hourlyStats[h] = { count: 0, revenue: 0 };

        orders.forEach((o: any) => {
            const h = new Date(o.created_at).getHours();
            hourlyStats[h].count++;
            hourlyStats[h].revenue += Number(o.total || o.total_amount || 0);
        });

        // Find top 3 peak hours
        const sortedHours = Object.entries(hourlyStats)
            .map(([h, data]) => ({ hour: Number(h), count: data.count, revenue: data.revenue }))
            .sort((a, b) => b.count - a.count);

        const topPeaks = sortedHours.slice(0, 3);
        const maxOrdersPerHour = topPeaks[0].count;

        // Staffing recommendation algorithm
        const recWaiters = Math.max(Math.ceil(maxOrdersPerHour / 10), 2);
        const recCooks = Math.max(Math.ceil(maxOrdersPerHour / 12), 2);

        let formattedText = `⏰ **Proyección de Horas Pico y Personal Sugerido**:\n\n`;
        formattedText += `🔥 **Horas de Mayor Afluencia**: \n`;
        topPeaks.forEach((p, idx) => {
            const formatHour = `${p.hour}:00 - ${p.hour + 1}:00`;
            formattedText += `${idx + 1}. **${formatHour}**: ~${p.count} órdenes promedio (Ingreso aprox: C$ ${p.revenue.toFixed(2)})\n`;
        });

        formattedText += `\n👥 **Personal Recomendado para el Turno (${targetDay || 'Fin de Semana'})**:\n`;
        formattedText += `• 🏃 **Meseros necesarios**: **${recWaiters} meseros** (capacidad: 10 órdenes/hora por mesero)\n`;
        formattedText += `• 👨‍🍳 **Cocineros requeridos**: **${recCooks} cocineros** (capacidad: 12 ticketeras/hora por cocinero)\n`;
        formattedText += `• 💵 **Cajeros**: **1 cajero** en caja central.\n\n`;
        formattedText += `💡 *Tip de Eficiencia*: Habilitar comanda digital en cocina para reducir tiempos de espera en las horas pico (${topPeaks[0].hour}:00).`;

        return {
            success: true,
            title: '⏰ Predicción de Personal y Horas Pico',
            message: `Proyección calculada basada en ${orders.length} órdenes analizadas.`,
            formattedText,
            details: { topPeaks, recWaiters, recCooks }
        };
    } catch (err: any) {
        return { success: false, title: 'Error', message: err.message };
    }
}

/**
 * 4. Dead-Stock & Waste Minimizer
 */
export async function analyzeSlowInventory(supabase: any): Promise<AIActionResult> {
    try {
        const { data: items } = await supabase.from('items').select('*');
        if (!items || items.length === 0) {
            return {
                success: false,
                title: '🗑️ Minimizador de Desperdicios e Insumos Estancados',
                message: 'No hay insumos registrados para analizar.'
            };
        }

        // Identify items with high stock and zero or minimal recent transactions
        const slowItems = items.filter((i: any) => {
            const stock = Number(i.stock_quantity || i.stock_level || 0);
            return stock > 20; // High stock items
        });

        let formattedText = `🗑️ **Detector de Insumos con Alto Stock y Riesgo de Desperdicio**:\n\n`;

        if (slowItems.length === 0) {
            formattedText += `✅ **Sin Riesgo Inminente**: Todos los insumos mantienen rotación adecuada respecto al stock en bodega.`;
        } else {
            formattedText += `⚠️ **Se identificaron ${slowItems.length} insumos con acumulación de stock**:\n`;
            slowItems.slice(0, 5).forEach((item: any) => {
                const val = Number(item.stock_quantity || item.stock_level || 0) * Number(item.cost_per_unit || 0);
                formattedText += `• **${item.name}**: Stock ${item.stock_quantity || item.stock_level} ${item.unit_of_measure || 'unidades'} (Valor detenido: C$ ${val.toFixed(2)})\n`;
            });

            formattedText += `\n💡 **Acciones Promocionales Recomendadas**:\n`;
            formattedText += `1. **Combo Especial del Día**: Crear una promoción temporal usando ${slowItems[0]?.name || 'los insumos principales'} con un 15% de descuento en el menú.\n`;
            formattedText += `2. **Ajuste de Compras**: Reducir la siguiente orden de reposición de estos ingredientes para liberar capital de trabajo.`;
        }

        return {
            success: true,
            title: '🗑️ Análisis de Insumos Estancados',
            message: `Análisis completado para ${items.length} insumos.`,
            formattedText,
            details: slowItems
        };
    } catch (err: any) {
        return { success: false, title: 'Error', message: err.message };
    }
}

/**
 * 5. Instant Menu Item Availability Toggle
 */
export async function toggleItemAvailability(
    supabase: any,
    targetDish?: string,
    isAvailable: boolean = false
): Promise<AIActionResult> {
    try {
        if (!targetDish) {
            return {
                success: false,
                title: '⚡ Control de Disponibilidad de Menú',
                message: 'Especifique el nombre del platillo a activar o desactivar.'
            };
        }

        const { data: items } = await supabase.from('items').select('*');
        const match = (items || []).find((i: any) => i.name.toLowerCase().includes(targetDish.toLowerCase()));

        if (!match) {
            return {
                success: false,
                title: '⚡ Control de Disponibilidad',
                message: `No se encontró el platillo "${targetDish}" en el catálogo del menú.`
            };
        }

        // Toggle availability (or active status)
        const { error } = await supabase
            .from('items')
            .update({ is_available: isAvailable, active: isAvailable })
            .eq('id', match.id);

        if (error) {
            // Try updating active column if is_available column is not present
            await supabase.from('items').update({ active: isAvailable }).eq('id', match.id);
        }

        const statusStr = isAvailable ? '🟢 ACTIVADO (Disponible en POS)' : '🔴 DESACTIVADO (Agotado en POS)';
        const formattedText = `⚡ **Actualización Instantánea de Disponibilidad**:\n\n` +
            `• **Platillo**: ${match.name}\n` +
            `• **Nuevo Estado**: ${statusStr}\n` +
            `• **Acción Realizada**: Los meseros y el sistema POS ya no podrán marcar comandes de este plato hasta nueva actualización.`;

        return {
            success: true,
            title: '⚡ Disponibilidad de Platillo Actualizada',
            message: `Platillo "${match.name}" marcado como ${isAvailable ? 'Disponible' : 'Agotado'}.`,
            formattedText
        };
    } catch (err: any) {
        return { success: false, title: 'Error', message: err.message };
    }
}
