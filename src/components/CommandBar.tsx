"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Terminal, CornerDownLeft, Loader2, Check, AlertCircle, Copy } from 'lucide-react';

interface CommandBarProps {
    isOpen: boolean;
    onClose: () => void;
    onExecute: (action: string, data: any) => Promise<boolean | any>;
    lang: 'es' | 'en';
    initialPrompt?: string;
}

export default function CommandBar({ isOpen, onClose, onExecute, lang, initialPrompt }: CommandBarProps) {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parsedCommand, setParsedCommand] = useState<{ action: string; data: any } | null>(null);
    const [editedData, setEditedData] = useState<any>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [analysisResultText, setAnalysisResultText] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setPrompt(initialPrompt || '');
            setError(null);
            setParsedCommand(null);
            setEditedData(null);
            setSuccessMessage(null);
            setAnalysisResultText(null);
            setCopied(false);
        }
    }, [isOpen, initialPrompt]);

    // Handle Esc key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || loading) return;

        setLoading(true);
        setError(null);
        setParsedCommand(null);
        setEditedData(null);
        setAnalysisResultText(null);

        try {
            const res = await fetch('/api/ai-command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt.trim() })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to parse command');
            }

            const command = await res.json();
            
            if (command.action === 'UNKNOWN') {
                setError(command.data.message || (lang === 'es' ? 'No logré entender el comando. Intenta detallarlo un poco más.' : 'Could not understand the command. Try explaining in more detail.'));
            } else {
                setParsedCommand(command);
                setEditedData(command.data || {});

                // Auto-execute analytics & direct action commands immediately
                const directActions = [
                    'GENERATE_EXCEL', 
                    'ANALYZE_RECIPE_COST', 
                    'DRAFT_PURCHASE_ORDER', 
                    'PREDICT_STAFFING', 
                    'ANALYZE_SLOW_STOCK', 
                    'TOGGLE_ITEM_AVAILABILITY'
                ];

                if (directActions.includes(command.action)) {
                    const result = await onExecute(command.action, command.data || {});
                    if (result && typeof result === 'object' && result.formattedText) {
                        setAnalysisResultText(result.formattedText);
                        setSuccessMessage(result.message || (lang === 'es' ? '¡Análisis generado con éxito!' : 'Analysis generated successfully!'));
                    } else if (result) {
                        setSuccessMessage(lang === 'es' ? '¡Operación realizada con éxito!' : 'Operation completed successfully!');
                        setTimeout(() => onClose(), 1500);
                    } else {
                        throw new Error(lang === 'es' ? 'Error al ejecutar la acción del asistente.' : 'Failed to execute assistant action.');
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || 'Error processing request');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!parsedCommand || !editedData) return;
        setLoading(true);
        setError(null);
        try {
            const result = await onExecute(parsedCommand.action, editedData);
            if (result && typeof result === 'object' && result.formattedText) {
                setAnalysisResultText(result.formattedText);
                setSuccessMessage(result.message || (lang === 'es' ? '¡Operación realizada con éxito!' : 'Operation completed successfully!'));
            } else if (result) {
                setSuccessMessage(lang === 'es' ? '¡Operación realizada con éxito!' : 'Operation completed successfully!');
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                throw new Error(lang === 'es' ? 'Error al guardar los cambios en la base de datos' : 'Failed to save changes to the database');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (key: string, value: any) => {
        setEditedData((prev: any) => ({
            ...prev,
            [key]: value
        }));
    };

    const copyAnalysisText = () => {
        if (analysisResultText) {
            navigator.clipboard.writeText(analysisResultText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Human-readable labels
    const getActionLabel = (action: string) => {
        switch (action) {
            case 'ADD_INGREDIENT': return lang === 'es' ? 'Crear Nuevo Ingrediente' : 'Create New Ingredient';
            case 'ADD_STATION': return lang === 'es' ? 'Registrar Estación de Cocina' : 'Register Kitchen Station';
            case 'ADD_PRINTER': return lang === 'es' ? 'Configurar Impresora' : 'Configure Printer';
            case 'ADD_TABLE': return lang === 'es' ? 'Agregar Mesa' : 'Add Table';
            case 'MODIFY_STOCK': return lang === 'es' ? 'Modificar Stock de Ingrediente' : 'Modify Ingredient Stock';
            case 'GENERATE_EXCEL': return lang === 'es' ? 'Generar Documento Excel' : 'Generate Excel Document';
            case 'ANALYZE_RECIPE_COST': return lang === 'es' ? 'Análisis de Rentabilidad de Recetas' : 'Recipe Profitability Analysis';
            case 'DRAFT_PURCHASE_ORDER': return lang === 'es' ? 'Borrador de Orden de Compra' : 'Draft Purchase Order';
            case 'PREDICT_STAFFING': return lang === 'es' ? 'Proyección de Horas Pico y Personal' : 'Staffing & Peak Hours Projection';
            case 'ANALYZE_SLOW_STOCK': return lang === 'es' ? 'Análisis de Insumos Estancados' : 'Slow Inventory & Waste Analysis';
            case 'TOGGLE_ITEM_AVAILABILITY': return lang === 'es' ? 'Cambio de Disponibilidad de Platillo' : 'Toggle Dish Availability';
            default: return action;
        }
    };

    const labelClasses = "block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider";
    const inputClasses = "w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-700/60 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all";

    const renderDataFields = () => {
        if (!parsedCommand || !editedData) return null;

        switch (parsedCommand.action) {
            case 'MODIFY_STOCK':
                return (
                    <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                        <div className="col-span-2">
                            <label className={labelClasses}>{lang === 'es' ? 'Tipo de Operación' : 'Operation Type'}</label>
                            <select
                                value={editedData.change_type || 'restock'}
                                onChange={(e) => handleFieldChange('change_type', e.target.value)}
                                className={inputClasses}
                            >
                                <option value="restock">{lang === 'es' ? 'Ingreso / Compra (Restock)' : 'Restock / Purchase'}</option>
                                <option value="waste">{lang === 'es' ? 'Desperdicio / Merma (Waste)' : 'Waste / Spoilage'}</option>
                                <option value="adjustment">{lang === 'es' ? 'Ajuste (Manual)' : 'Adjustment (Manual)'}</option>
                            </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className={labelClasses}>{lang === 'es' ? 'Nombre del Ingrediente' : 'Ingredient Name'}</label>
                            <input
                                type="text"
                                value={editedData.item_name || ''}
                                onChange={(e) => handleFieldChange('item_name', e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className={labelClasses}>{lang === 'es' ? 'Cantidad' : 'Quantity'}</label>
                            <input
                                type="number"
                                step="any"
                                value={editedData.quantity !== undefined && editedData.quantity !== null ? editedData.quantity : ''}
                                onChange={(e) => handleFieldChange('quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className={inputClasses}
                            />
                        </div>
                    </div>
                );
            case 'ADD_INGREDIENT':
                return (
                    <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                        <div className="col-span-2 md:col-span-1">
                            <label className={labelClasses}>{lang === 'es' ? 'Nombre del Ingrediente' : 'Ingredient Name'}</label>
                            <input
                                type="text"
                                value={editedData.name || ''}
                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className={labelClasses}>{lang === 'es' ? 'Costo por Unidad' : 'Cost per Unit'}</label>
                            <input
                                type="number"
                                step="0.0001"
                                value={editedData.cost_per_unit !== undefined && editedData.cost_per_unit !== null ? editedData.cost_per_unit : ''}
                                onChange={(e) => handleFieldChange('cost_per_unit', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className={inputClasses}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* Command Box Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden"
                    >
                        {/* Prompt Input Form */}
                        <form onSubmit={handleSubmit} className="relative flex items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800/80">
                            <Sparkles className="w-5 h-5 text-teal-500 mr-3 animate-pulse shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={lang === 'es' ? "Escribe lo que deseas (ej: 'Crear excel con gastos', 'Analizar costos de recetas', 'Horas pico')..." : "Type what you want (e.g. 'Export expenses excel', 'Analyze dish costs', 'Peak hours')..."}
                                className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 text-base font-medium focus:outline-none pr-10"
                                disabled={loading}
                            />
                            {loading ? (
                                <Loader2 className="w-5 h-5 text-teal-500 animate-spin shrink-0 ml-2" />
                            ) : (
                                <button 
                                    type="submit" 
                                    disabled={!prompt.trim()} 
                                    className="p-2 text-teal-500 hover:text-teal-600 disabled:opacity-30 transition-colors shrink-0"
                                >
                                    <CornerDownLeft className="w-5 h-5" />
                                </button>
                            )}
                        </form>

                        {/* Content Area */}
                        <div className="p-6 max-h-[65vh] overflow-y-auto">
                            {/* Analysis Result Text (Markdown style card) */}
                            {analysisResultText ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">🤖</span>
                                            <h4 className="font-extrabold text-gray-900 dark:text-white text-base">
                                                {getActionLabel(parsedCommand?.action || '')}
                                            </h4>
                                        </div>
                                        <button
                                            onClick={copyAnalysisText}
                                            className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                            {copied ? (lang === 'es' ? '¡Copiado!' : 'Copied!') : (lang === 'es' ? 'Copiar Análisis' : 'Copy Analysis')}
                                        </button>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200/60 dark:border-slate-700/60 text-gray-800 dark:text-slate-200 text-xs font-medium whitespace-pre-wrap leading-relaxed">
                                        {analysisResultText}
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                                        >
                                            {lang === 'es' ? 'Entendido / Cerrar' : 'Done / Close'}
                                        </button>
                                    </div>
                                </div>
                            ) : successMessage ? (
                                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 py-4 font-bold text-sm">
                                    <Check className="w-5 h-5" />
                                    <span>{successMessage}</span>
                                </div>
                            ) : error ? (
                                <div className="flex items-center justify-center gap-2 text-red-500 py-4 font-semibold text-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            ) : parsedCommand && editedData ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                                        <div className="text-left">
                                            <span className="text-[10px] font-extrabold text-teal-500 uppercase tracking-wider">
                                                {lang === 'es' ? 'Acción Detectada' : 'Detected Action'}
                                            </span>
                                            <h4 className="font-extrabold text-gray-900 dark:text-white text-base">
                                                {getActionLabel(parsedCommand.action)}
                                            </h4>
                                        </div>
                                    </div>

                                    {renderDataFields()}

                                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setParsedCommand(null)}
                                            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                                        >
                                            {lang === 'es' ? 'Cancelar' : 'Cancel'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirm}
                                            disabled={loading}
                                            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            <span>{lang === 'es' ? 'Confirmar Operación' : 'Confirm Operation'}</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-gray-400 dark:text-slate-500 space-y-2">
                                    <Terminal className="w-8 h-8 mx-auto text-teal-500/40" />
                                    <p className="text-xs font-semibold">
                                        {lang === 'es' ? "Escribe un comando o pregunta para el Asistente IA del Restaurante." : "Type a command or query for the Restaurant AI Assistant."}
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-gray-500 dark:text-slate-400">
                                        <span className="bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">💡 {lang === 'es' ? '"¿Cuál es mi plato más rentable?"' : '"What is my most profitable dish?"'}</span>
                                        <span className="bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">📦 {lang === 'es' ? '"Generar orden de compra"' : '"Generate purchase order"'}</span>
                                        <span className="bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">⏰ {lang === 'es' ? '"¿Cuántos meseros necesito el viernes?"' : '"How many servers do I need Friday?"'}</span>
                                        <span className="bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">⚡ {lang === 'es' ? '"Desactivar plato Pizza Hawaiana"' : '"Disable Hawaiian Pizza"'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
