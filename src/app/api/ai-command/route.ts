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
                            enum: ["ADD_INGREDIENT", "ADD_STATION", "ADD_PRINTER", "ADD_TABLE", "UNKNOWN"]
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
- ADD_INGREDIENT: when the user wants to add, create, register, or track a new ingredient in inventory.
- ADD_STATION: when the user wants to add, register, or create a new kitchen station (estación).
- ADD_PRINTER: when the user wants to add, register, or setup a new printer (impresora).
- ADD_TABLE: when the user wants to add, register, or setup a new table (mesa).
- UNKNOWN: when the prompt is not understood or doesn't map to these actions.

Rules:
1. For ADD_INGREDIENT, find the name of the ingredient, its cost (e.g. costo, precio, $), stock level (stock, cantidad), and unit of measure (e.g. kg, lb, unidades).
2. For ADD_PRINTER, parse the name, IP address (e.g. 192.168.x.x), and type (receipt/kitchen). If the type is not mentioned but it is described as "facturación" or "recibo", default type is "receipt". If described as "cocina" or "comanda", default is "kitchen".
3. For ADD_STATION, parse the name and display order if mentioned.
4. For ADD_TABLE, parse the name (e.g. Mesa 1, Mesa VIP) and display order if mentioned.
5. If details are missing or the prompt is ambiguous, or action is UNKNOWN, set the action to UNKNOWN and set data.message to ask for the missing details politely in Spanish.`
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
