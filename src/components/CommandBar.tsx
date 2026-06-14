"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Terminal, CornerDownLeft, Loader2, Check, AlertCircle, ShieldAlert } from 'lucide-react';

interface CommandBarProps {
    isOpen: boolean;
    onClose: () => void;
    onExecute: (action: string, data: any) => Promise<boolean>;
    lang: 'es' | 'en';
}

export default function CommandBar({ isOpen, onClose, onExecute, lang }: CommandBarProps) {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parsedCommand, setParsedCommand] = useState<{ action: string; data: any } | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setPrompt('');
            setError(null);
            setParsedCommand(null);
            setSuccessMessage(null);
        }
    }, [isOpen]);

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
            }
        } catch (err: any) {
            setError(err.message || 'Error processing request');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!parsedCommand) return;
        setLoading(true);
        setError(null);
        try {
            const ok = await onExecute(parsedCommand.action, parsedCommand.data);
            if (ok) {
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

    // Human-readable labels
    const getActionLabel = (action: string) => {
        switch (action) {
            case 'ADD_INGREDIENT': return lang === 'es' ? 'Crear Nuevo Ingrediente' : 'Create New Ingredient';
            case 'ADD_STATION': return lang === 'es' ? 'Registrar Estación de Cocina' : 'Register Kitchen Station';
            case 'ADD_PRINTER': return lang === 'es' ? 'Configurar Impresora' : 'Configure Printer';
            case 'ADD_TABLE': return lang === 'es' ? 'Agregar Mesa' : 'Add Table';
            default: return action;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
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
                        transition={{ type: 'spring', duration: 0.4 }}
                        className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white/80 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-800/50 shadow-2xl backdrop-blur-xl"
                    >
                        {/* Header Prompt Box */}
                        <form onSubmit={handleSubmit} className="flex items-center px-4 py-4 border-b border-slate-200/30 dark:border-slate-800/30">
                            <Sparkles className="w-5 h-5 mr-3 text-primary-500 animate-pulse shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={loading || !!successMessage}
                                placeholder={lang === 'es' ? '¿Qué quieres hacer? (ej. "Añadir impresora Cocina en 192.168.1.10")...' : 'What would you like to do? (e.g. "Add a Mozzarella ingredient costing 1.50")...'}
                                className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-base font-medium outline-none border-none pr-3"
                            />
                            {!loading && !successMessage && (
                                <button type="submit" className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1 hover:bg-primary-50 hover:text-primary-600 transition-all">
                                    <span>Enter</span>
                                    <CornerDownLeft className="w-3 h-3" />
                                </button>
                            )}
                            {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                        </form>

                        {/* Middle Content Panel */}
                        <div className="max-h-[350px] overflow-y-auto p-5 space-y-4">
                            {/* Instruction Tip */}
                            {!parsedCommand && !error && !loading && !successMessage && (
                                <div className="text-slate-400 dark:text-slate-500 text-xs flex flex-col gap-2 p-2">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{lang === 'es' ? 'Comandos sugeridos' : 'Suggested Commands'}</span>
                                    <button onClick={() => setPrompt(lang === 'es' ? 'Agregar ingrediente Queso Mozzarella, costo 2.50, cantidad inicial 50kg' : 'Add ingredient Mozzarella Cheese, cost 2.50, initial amount 50kg')} className="text-left py-1 hover:text-primary-500 transition-colors">
                                        💡 {lang === 'es' ? '"Agregar ingrediente Queso Mozzarella, costo 2.50, cantidad inicial 50kg"' : '"Add ingredient Mozzarella Cheese, cost 2.50, initial amount 50kg"'}
                                    </button>
                                    <button onClick={() => setPrompt(lang === 'es' ? 'Registrar impresora de comanda en 192.168.1.200 llamada Cocina' : 'Register kitchen printer at 192.168.1.200 named Kitchen')} className="text-left py-1 hover:text-primary-500 transition-colors">
                                        💡 {lang === 'es' ? '"Registrar impresora de comanda en 192.168.1.200 llamada Cocina"' : '"Register kitchen printer at 192.168.1.200 named Kitchen"'}
                                    </button>
                                    <button onClick={() => setPrompt(lang === 'es' ? 'Añadir Mesa 15 en la sección VIP' : 'Add Table 15 in the VIP zone')} className="text-left py-1 hover:text-primary-500 transition-colors">
                                        💡 {lang === 'es' ? '"Añadir Mesa 15 en la sección VIP"' : '"Add Table 15 in the VIP zone"'}
                                    </button>
                                </div>
                            )}

                            {/* Error / AI Message Bubble */}
                            {error && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-900/30 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-sm font-semibold text-red-700 dark:text-red-300 leading-normal">{error}</p>
                                </motion.div>
                            )}

                            {/* Success Bubble */}
                            {successMessage && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200/50 dark:border-green-900/30 flex items-start gap-3 justify-center py-8">
                                    <Check className="w-6 h-6 text-green-500 dark:text-green-400 shrink-0 animate-bounce" />
                                    <p className="text-lg font-black text-green-700 dark:text-green-300 leading-normal">{successMessage}</p>
                                </motion.div>
                            )}

                            {/* Parsed Command Confirmation Dialog */}
                            {parsedCommand && !successMessage && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    className="p-5 rounded-2xl bg-gradient-to-br from-primary-500/5 to-primary-500/10 dark:from-primary-500/10 dark:to-primary-500/20 border border-primary-500/20 shadow-md"
                                >
                                    <div className="flex items-center gap-2 mb-4 border-b border-primary-500/10 pb-3">
                                        <Terminal className="w-4 h-4 text-primary-500" />
                                        <span className="text-xs font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">
                                            {lang === 'es' ? 'Confirmar Acción de IA' : 'Confirm AI Action'}
                                        </span>
                                    </div>
                                    
                                    <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-4">
                                        {getActionLabel(parsedCommand.action)}
                                    </h4>

                                    {/* Action Data Fields */}
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        {Object.entries(parsedCommand.data).map(([key, val]) => {
                                            if (val === undefined || val === null || key === 'message') return null;
                                            return (
                                                <div key={key} className="bg-white/50 dark:bg-slate-800/50 border border-slate-200/30 dark:border-slate-700/30 p-2.5 rounded-xl">
                                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate block">
                                                        {typeof val === 'number' && key.includes('cost') ? `$${val.toFixed(2)}` : String(val)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Confirmation Buttons */}
                                    <div className="flex items-center gap-3">
                                        <button 
                                            disabled={loading}
                                            onClick={handleConfirm}
                                            className="flex-1 py-3 px-4 font-bold text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            {lang === 'es' ? 'Confirmar y Guardar' : 'Confirm and Save'}
                                        </button>
                                        <button 
                                            disabled={loading}
                                            onClick={() => setParsedCommand(null)}
                                            className="px-4 py-3 font-bold text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
                                        >
                                            {lang === 'es' ? 'Reescribir' : 'Rewrite'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Footer Shortcut Reference */}
                        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/20 dark:border-slate-800/20 text-[10px] font-bold text-slate-400 flex items-center justify-between">
                            <span className="uppercase tracking-wider">Restaurant OS AI Assistant</span>
                            <span>ESC {lang === 'es' ? 'para cerrar' : 'to close'}</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
