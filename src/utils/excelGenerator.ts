import * as XLSX from 'xlsx';

export async function generateExcelReport(
    supabase: any,
    reportType: string,
    dateRange: string = 'month'
): Promise<{ success: boolean; filename: string; message: string }> {
    let start = new Date();
    start.setHours(0, 0, 0, 0);

    if (dateRange === 'today') {
        // Today
    } else if (dateRange === 'week') {
        start.setDate(start.getDate() - 7);
    } else if (dateRange === 'month') {
        start.setMonth(start.getMonth() - 1);
    } else if (dateRange === 'all') {
        start = new Date('2020-01-01');
    }

    const startIso = start.toISOString();
    const startDateStr = start.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const wb = XLSX.utils.book_new();
    let filename = `Reporte_Restaurante_${todayStr}.xlsx`;

    try {
        if (reportType === 'expenses') {
            // 💸 GASTOS OPERATIVOS
            filename = `Gastos_Operativos_${todayStr}.xlsx`;
            const { data: expenses } = await supabase
                .from('expenses')
                .select('*')
                .gte('expense_date', startDateStr)
                .order('expense_date', { ascending: false });

            const rows = (expenses || []).map((e: any) => ({
                'Fecha': e.expense_date,
                'Categoría': translateCategory(e.category),
                'Descripción': e.description,
                'Proveedor / Emisor': e.supplier || '—',
                'Método de Pago': translatePayment(e.payment_method),
                'Monto (C$)': Number(e.amount || 0)
            }));

            const total = rows.reduce((sum: number, r: any) => sum + r['Monto (C$)'], 0);
            rows.push({
                'Fecha': 'TOTAL CONSOLIDADO',
                'Categoría': '',
                'Descripción': '',
                'Proveedor / Emisor': '',
                'Método de Pago': '',
                'Monto (C$)': total
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, 'Gastos Operativos');

        } else if (reportType === 'sales') {
            // 📈 VENTAS E IVA
            filename = `Reporte_Ventas_E_IVA_${todayStr}.xlsx`;
            const { data: orders } = await supabase
                .from('orders')
                .select('*, usuarios(nombre, apellido)')
                .gte('created_at', startIso)
                .order('created_at', { ascending: false });

            const rows = (orders || []).map((o: any) => {
                const total = Number(o.total || o.total_amount || 0);
                const subtotal = total / 1.15;
                const iva = total - subtotal;
                return {
                    'ID Órden': o.id ? o.id.substring(0, 8) : '—',
                    'Fecha y Hora': new Date(o.created_at).toLocaleString('es-NI'),
                    'Mesero / Atendido por': o.usuarios ? `${o.usuarios.nombre} ${o.usuarios.apellido}` : '—',
                    'Estado': o.status,
                    'Método de Pago': o.payment_method || 'Efectivo',
                    'Subtotal Neto (C$)': Number(subtotal.toFixed(2)),
                    'IVA Generado (15%) (C$)': Number(iva.toFixed(2)),
                    'Total Facturado (C$)': Number(total.toFixed(2))
                };
            });

            const totalSales = rows.reduce((s: number, r: any) => s + r['Total Facturado (C$)'], 0);
            const totalIVA = rows.reduce((s: number, r: any) => s + r['IVA Generado (15%) (C$)'], 0);
            const totalSub = rows.reduce((s: number, r: any) => s + r['Subtotal Neto (C$)'], 0);

            rows.push({
                'ID Órden': 'TOTALES',
                'Fecha y Hora': '',
                'Mesero / Atendido por': '',
                'Estado': '',
                'Método de Pago': '',
                'Subtotal Neto (C$)': Number(totalSub.toFixed(2)),
                'IVA Generado (15%) (C$)': Number(totalIVA.toFixed(2)),
                'Total Facturado (C$)': Number(totalSales.toFixed(2))
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, 'Ventas e IVA');

        } else if (reportType === 'payroll') {
            // 👥 NÓMINA Y CARGAS SOCIALES
            filename = `Reporte_Nomina_Y_Cargas_${todayStr}.xlsx`;
            const { data: employees } = await supabase.from('usuarios').select('*').order('nombre');

            const rows = (employees || []).map((emp: any) => {
                const isLaboral = (emp.contract_type || 'laboral') === 'laboral';
                const rate = Number(emp.hourly_rate || 60);
                const monthlyBase = rate * 160;

                const inssPatronal = isLaboral ? monthlyBase * 0.215 : 0;
                const inatec = isLaboral ? monthlyBase * 0.02 : 0;
                const aguinaldo = isLaboral ? monthlyBase * 0.0833 : 0;
                const vacaciones = isLaboral ? monthlyBase * 0.0833 : 0;
                const totalEmployerCost = monthlyBase + inssPatronal + inatec + aguinaldo + vacaciones;

                return {
                    'Empleado': `${emp.nombre || ''} ${emp.apellido || ''}`.trim() || emp.username,
                    'Rol': emp.role,
                    'Tipo de Contrato': isLaboral ? 'Laboral (INSS 21.5%)' : 'Servicios Profesionales (IR 10%)',
                    'Tarifa Hora (C$)': rate,
                    'Salario Base Mensual (C$)': Number(monthlyBase.toFixed(2)),
                    'INSS Patronal 21.5% (C$)': Number(inssPatronal.toFixed(2)),
                    'INATEC 2% (C$)': Number(inatec.toFixed(2)),
                    'Provisión Aguinaldo 8.33% (C$)': Number(aguinaldo.toFixed(2)),
                    'Provisión Vacaciones 8.33% (C$)': Number(vacaciones.toFixed(2)),
                    'Costo Total Empleador (C$)': Number(totalEmployerCost.toFixed(2))
                };
            });

            const totalCostSum = rows.reduce((s: number, r: any) => s + r['Costo Total Empleador (C$)'], 0);
            const totalBaseSum = rows.reduce((s: number, r: any) => s + r['Salario Base Mensual (C$)'], 0);

            rows.push({
                'Empleado': 'TOTALES NÓMINA',
                'Rol': '',
                'Tipo de Contrato': '',
                'Tarifa Hora (C$)': 0,
                'Salario Base Mensual (C$)': Number(totalBaseSum.toFixed(2)),
                'INSS Patronal 21.5% (C$)': 0,
                'INATEC 2% (C$)': 0,
                'Provisión Aguinaldo 8.33% (C$)': 0,
                'Provisión Vacaciones 8.33% (C$)': 0,
                'Costo Total Empleador (C$)': Number(totalCostSum.toFixed(2))
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, 'Cargas Patronales Nómina');

        } else if (reportType === 'inventory') {
            // 📦 INVENTARIO Y STOCK
            filename = `Inventario_Valorado_${todayStr}.xlsx`;
            const { data: items } = await supabase.from('items').select('*, suppliers(name)').order('name');

            const rows = (items || []).map((i: any) => {
                const stock = Number(i.stock_quantity || i.stock_level || 0);
                const cost = Number(i.cost_per_unit || 0);
                const totalValue = stock * cost;

                return {
                    'SKU / Código': i.sku || '—',
                    'Producto / Insumo': i.name,
                    'Tipo': i.type || 'product',
                    'Stock Actual': stock,
                    'Unidad de Medida': i.unit_of_measure || 'unidades',
                    'Costo por Unidad (C$)': cost,
                    'Nivel Par / Mínimo': Number(i.par_level || 0),
                    'Valor Total Stock (C$)': Number(totalValue.toFixed(2)),
                    'Proveedor': i.suppliers?.name || '—'
                };
            });

            const totalStockValue = rows.reduce((s: number, r: any) => s + r['Valor Total Stock (C$)'], 0);
            rows.push({
                'SKU / Código': 'VALORACIÓN TOTAL',
                'Producto / Insumo': '',
                'Tipo': '',
                'Stock Actual': 0,
                'Unidad de Medida': '',
                'Costo por Unidad (C$)': 0,
                'Nivel Par / Mínimo': 0,
                'Valor Total Stock (C$)': Number(totalStockValue.toFixed(2)),
                'Proveedor': ''
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, 'Inventario Valorado');

        } else {
            // 📊 ESTADO DE RESULTADOS COMPLETO (P&L)
            filename = `Estado_Resultados_PNL_${todayStr}.xlsx`;

            const [expRes, ordRes, empRes, invRes] = await Promise.all([
                supabase.from('expenses').select('*').gte('expense_date', startDateStr),
                supabase.from('orders').select('*').gte('created_at', startIso).eq('status', 'completed'),
                supabase.from('usuarios').select('*'),
                supabase.from('inventory_logs').select('*, items(cost_per_unit)').gte('created_at', startIso)
            ]);

            const expenses = expRes.data || [];
            const orders = ordRes.data || [];
            const employees = empRes.data || [];
            const inventoryLogs = invRes.data || [];

            const totalSales = orders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
            const totalOpExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
            const totalInventoryCost = inventoryLogs.reduce((sum: number, log: any) => {
                if (log.change_type === 'usage' || log.change_type === 'waste' || log.change_type === 'deduction') {
                    const qty = Math.abs(Number(log.quantity_removed || log.quantity_changed || 0));
                    const cost = Number(log.items?.cost_per_unit || 0);
                    return sum + (qty * cost);
                }
                return sum;
            }, 0);

            const totalGrossPayroll = employees.reduce((sum: number, emp: any) => sum + (Number(emp.hourly_rate || 60) * 160), 0);
            const totalPayrollLiabilities = employees.reduce((sum: number, emp: any) => {
                const isLaboral = (emp.contract_type || 'laboral') === 'laboral';
                const base = Number(emp.hourly_rate || 60) * 160;
                return sum + (isLaboral ? base * 1.3816 : base);
            }, 0);

            const totalLiabilities = totalOpExpenses + totalInventoryCost + totalPayrollLiabilities;
            const netProfit = totalSales - totalLiabilities;
            const margin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

            const pnlSummary = [
                { 'Concepto Financiero': '1. Ventas e Ingresos Operativos Totales', 'Monto (C$)': Number(totalSales.toFixed(2)) },
                { 'Concepto Financiero': '2. Gastos Operativos Manuales (Agua, Luz, Alquiler, etc.)', 'Monto (C$)': Number(totalOpExpenses.toFixed(2)) },
                { 'Concepto Financiero': '3. Costo de Inventario Consumido (COGS)', 'Monto (C$)': Number(totalInventoryCost.toFixed(2)) },
                { 'Concepto Financiero': '4. Nómina y Cargas Sociales Patronales', 'Monto (C$)': Number(totalPayrollLiabilities.toFixed(2)) },
                { 'Concepto Financiero': 'PASIVOS Y GASTOS TOTALES (2 + 3 + 4)', 'Monto (C$)': Number(totalLiabilities.toFixed(2)) },
                { 'Concepto Financiero': 'GANANCIA NETA DEL PERÍODO (Utilidad Neta)', 'Monto (C$)': Number(netProfit.toFixed(2)) },
                { 'Concepto Financiero': 'MARGEN DE UTILIDAD (%)', 'Monto (C$)': `${margin.toFixed(2)}%` },
            ];

            const ws1 = XLSX.utils.json_to_sheet(pnlSummary);
            XLSX.utils.book_append_sheet(wb, ws1, 'Resumen P&L');

            // Sheet 2: Gastos
            const expRows = expenses.map((e: any) => ({
                'Fecha': e.expense_date,
                'Categoría': translateCategory(e.category),
                'Descripción': e.description,
                'Monto (C$)': Number(e.amount || 0)
            }));
            const ws2 = XLSX.utils.json_to_sheet(expRows);
            XLSX.utils.book_append_sheet(wb, ws2, 'Detalle de Gastos');
        }

        // Trigger file download in browser environment
        XLSX.writeFile(wb, filename);

        return {
            success: true,
            filename,
            message: `Documento Excel "${filename}" generado y descargado con éxito.`
        };
    } catch (err: any) {
        console.error('Excel generation error:', err);
        return {
            success: false,
            filename: '',
            message: `Error al generar Excel: ${err.message || 'Error desconocido'}`
        };
    }
}

function translateCategory(cat: string): string {
    const map: Record<string, string> = {
        utilities: 'Servicios Públicos (Agua/Luz/Internet)',
        rent: 'Alquiler / Local',
        transport: 'Transporte y Viáticos',
        maintenance: 'Mantenimiento y Reparaciones',
        marketing: 'Publicidad y Mercadeo',
        taxes: 'Impuestos y Tasas',
        other: 'Otros Gastos'
    };
    return map[cat] || cat;
}

function translatePayment(pay: string): string {
    const map: Record<string, string> = {
        cash: 'Efectivo',
        card: 'Tarjeta',
        bank_deposit: 'Transferencia Bancaria'
    };
    return map[pay] || pay;
}
