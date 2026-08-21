import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt } = body;

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid prompt parameter' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ 
                error: 'Gemini API Key is not configured on the server. Please add GEMINI_API_KEY to your .env.local file.' 
            }, { status: 500 });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: `Analyze this user request: "${prompt}"`
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        action: {
                            type: "STRING",
                            enum: [
                                "ADD_INGREDIENT", 
                                "ADD_STATION", 
                                "ADD_PRINTER", 
                                "ADD_TABLE", 
                                "MODIFY_STOCK", 
                                "GENERATE_EXCEL",
                                "ANALYZE_RECIPE_COST",
                                "DRAFT_PURCHASE_ORDER",
                                "PREDICT_STAFFING",
                                "ANALYZE_SLOW_STOCK",
                                "TOGGLE_ITEM_AVAILABILITY",
                                "UNKNOWN"
                            ]
                        },
                        data: {
                            type: "OBJECT",
                            properties: {
                                name: { type: "STRING" },
                                cost_per_unit: { type: "NUMBER" },
                                stock_level: { type: "NUMBER" },
                                unit_of_measure: { type: "STRING" },
                                ip_address: { type: "STRING" },
                                display_order: { type: "NUMBER" },
                                type: { type: "STRING", enum: ["receipt", "kitchen"] },
                                item_name: { type: "STRING", description: "Name of the existing ingredient to modify stock for" },
                                quantity: { type: "NUMBER", description: "Quantity of stock to add, remove, or set" },
                                change_type: { type: "STRING", enum: ["restock", "waste", "adjustment"], description: "Type of change: restock (ingreso/compra), waste (desperdicio/merma), or adjustment (ajuste manual)" },
                                purchase_cost: { type: "NUMBER", description: "Purchase cost per unit (only for restock)" },
                                batch_number: { type: "STRING", description: "Batch or lot number if mentioned (only for restock)" },
                                note: { type: "STRING", description: "Any reason, note, or comment mentioned" },
                                report_type: { type: "STRING", enum: ["expenses", "sales", "payroll", "inventory", "pnl"], description: "Type of report requested when action is GENERATE_EXCEL (expenses=gastos, sales=ventas/iva, payroll=nomina, inventory=inventario, pnl=estado de resultados)" },
                                date_range: { type: "STRING", enum: ["today", "week", "month", "all"], description: "Date range for report (today=hoy, week=semana, month=mes, all=todo)" },
                                supplier_name: { type: "STRING", description: "Supplier/vendor name if specified for purchase orders" },
                                target_dish: { type: "STRING", description: "Target dish or item name for recipe costing analysis or item availability toggle" },
                                is_available: { type: "BOOLEAN", description: "Target availability status (true=enable/available, false=disable/out-of-stock)" },
                                target_day: { type: "STRING", description: "Target day of week for staffing prediction (e.g. viernes, fin de semana)" },
                                message: { 
                                    type: "STRING", 
                                    description: "Use this to explain errors, request clarification, or guide the user if the command is UNKNOWN." 
                                }
                            }
                        }
                    },
                    required: ["action", "data"]
                }
            },
            systemInstruction: {
                parts: [
                    {
                        text: `You are a smart command parser for a restaurant management POS dashboard. Your job is to translate user instructions (written in Spanish or English) into a structured JSON command object.

Translate prompts into one of these actions:
- ADD_INGREDIENT: when the user asks to add, create, register, or track a new ingredient in inventory.
- ADD_STATION: when the user wants to add, register, or create a new kitchen station (estación).
- ADD_PRINTER: when the user wants to add, register, or setup a new printer (impresora).
- ADD_TABLE: when the user wants to add, register, or setup a new table (mesa).
- MODIFY_STOCK: when the user wants to adjust, restock, report waste, or change the stock level of an existing ingredient (e.g., "agregar 20 unidades mas a queso gouda", "reportar 5 kg de desperdicio de queso", "ajustar stock de cebolla a 10").
- GENERATE_EXCEL: when the user asks to generate, create, download, export an Excel file, spreadsheet, or report (e.g. "crear excel con gastos de este mes", "descargar excel de ventas", "exportar nomina a excel", "generar excel de inventario").
- ANALYZE_RECIPE_COST: when the user asks about recipe profitability, dish margins, dish costing, food cost, or price recommendations (e.g., "cuanto me cuesta preparar la pizza hawaiana", "analizar costos de platillos", "cual es mi plato mas rentable").
- DRAFT_PURCHASE_ORDER: when the user asks to generate a purchase order for suppliers, draft reorders for low stock, or order supplies (e.g., "generar orden de compra para insumos bajos", "crear pedido a proveedores", "orden de compra carnes").
- PREDICT_STAFFING: when the user asks about peak hours, busiest shifts, or how many cooks/waiters to schedule (e.g., "cuantos meseros necesito para el viernes", "cuales son las horas pico", "prediccion de personal").
- ANALYZE_SLOW_STOCK: when the user asks about slow-moving inventory, dead stock, expiring items, or waste prevention discounts (e.g., "que insumos estan estancados", "desperdicio de ingredientes", "productos por vencer").
- TOGGLE_ITEM_AVAILABILITY: when the user asks to disable/enable a menu dish due to out-of-stock ingredients (e.g., "desactivar pizza hawaiana por falta de queso", "agotado lomo de cerdo", "activar nuevamente hamburguesa").
- UNKNOWN: when the prompt is not understood or doesn't map to these actions.

Rules:
1. For ADD_INGREDIENT, find the name of the ingredient, its cost (e.g. costo, precio, $), stock level (stock, cantidad), and unit of measure (e.g. kg, lb, unidades).
2. For ADD_PRINTER, parse the name, IP address (e.g. 192.168.x.x), and type (receipt/kitchen). If the type is not mentioned but it is described as "facturación" or "recibo", default type is "receipt". If described as "cocina" or "comanda", default is "kitchen".
3. For ADD_STATION, parse the name and display order if mentioned.
4. For ADD_TABLE, parse the name (e.g. Mesa 1, Mesa VIP) and display order if mentioned.
5. For MODIFY_STOCK:
   - item_name: Name of the existing item to update.
   - quantity: The amount to adjust. Always positive.
   - change_type: 
     - "restock" if adding stock, buying, restocking ("agregar", "comprar", "ingresar").
     - "waste" if reporting waste, throwing away, expired, ruined ("desperdicio", "merma", "dañado", "tirar", "vencido").
     - "adjustment" if resetting or calibrating stock ("ajustar stock a X", "establecer stock en X").
   - purchase_cost: If buying or restocking and a cost is mentioned (e.g., "compramos a 1.50").
   - batch_number: Parse batch/lot if mentioned.
   - note: Parse the reason/explanation if mentioned (e.g., "se venció", "estaba arruinado").
6. If details are missing or the prompt is ambiguous, or action is UNKNOWN, set the action to UNKNOWN and set data.message to ask for the missing details politely in Spanish.`
                    }
                ]
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Gemini API Error]', response.status, errorText);
            return NextResponse.json({ error: `Gemini API responded with status ${response.status}` }, { status: 502 });
        }

        const result = await response.json();
        const outputText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!outputText) {
            return NextResponse.json({ error: 'Empty response from Gemini model' }, { status: 502 });
        }

        const commandData = JSON.parse(outputText);
        return NextResponse.json(commandData);

    } catch (err: any) {
        console.error('[AI-Command API Route Error]', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
