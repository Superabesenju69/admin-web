import React, { useState, useEffect } from 'react';
import { t } from '../../utils/i18n';

interface SettingsTabProps {
    supabase: any;
    settings: any;
    setSettings: (s: any) => void;
    lang: string;
    setTab: (t: any) => void;
    printers: any[];
    setPrinters: React.Dispatch<React.SetStateAction<any[]>>;
    CURRENCIES: Record<string, { symbol: string; name: string; locale: string }>;
}

const DEFAULT_TEMPLATE = {
    logo_url: '',
    logo_size: 'medium', // 'small' (32px), 'medium' (48px), 'large' (64px), 'xlarge' (80px)
    header_lines: [
        "EL GAUCHO STEAKHOUSE",
        "KM 4.5 Carretera Masaya",
        "Managua, Nicaragua",
        "Tel: +505 2278 1234"
    ],
    footer_lines: [
        "¡Gracias por su visita!",
        "Sígannos en Instagram: @elgaucho_ni",
        "Ley de Concertación Tributaria Art. 122"
    ],
    show_server_name: true,
    show_order_timestamp: true,
    show_tax_breakdown: true,
    show_promotion_discounts: true,
    alignment: 'center',
    paper_width: '80mm',
    font_family: 'classic', // 'classic' (Monospace), 'modern' (Sans), 'condensed' (Compact), 'serif' (Serif)
    font_size: 'normal', // 'compact', 'normal', 'large'
    header_format: 'bold_uppercase', // 'bold_uppercase', 'bold', 'normal'
    divider_style: 'dashes', // 'dashes', 'equals', 'dots', 'stars'
    line_spacing: 'normal', // 'compact', 'normal', 'relaxed'
};

export default function SettingsTab({
    supabase,
    settings,
    setSettings,
    lang,
    setTab,
    printers,
    setPrinters,
    CURRENCIES
}: SettingsTabProps) {
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newPrinterName, setNewPrinterName] = useState('');
    const [newPrinterIp, setNewPrinterIp] = useState('');

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            if (data.url) {
                setLogoUrl(data.url);
            }
        } catch (err: any) {
            console.error(err);
            alert(`Error uploading logo: ${err.message}`);
        } finally {
            setUploading(false);
        }
    }

    // Receipt Customizer State
    const template = settings?.receipt_template || DEFAULT_TEMPLATE;
    const [logoUrl, setLogoUrl] = useState(template.logo_url || '');
    const [logoSize, setLogoSize] = useState(template.logo_size || 'medium');
    const [headerLines, setHeaderLines] = useState<string[]>(template.header_lines || []);
    const [footerLines, setFooterLines] = useState<string[]>(template.footer_lines || []);
    const [showServerName, setShowServerName] = useState(template.show_server_name !== false);
    const [showOrderTimestamp, setShowOrderTimestamp] = useState(template.show_order_timestamp !== false);
    const [showTaxBreakdown, setShowTaxBreakdown] = useState(template.show_tax_breakdown !== false);
    const [showPromotionDiscounts, setShowPromotionDiscounts] = useState(template.show_promotion_discounts !== false);
    const [showDualCurrency, setShowDualCurrency] = useState(template.show_dual_currency !== false);
    const [alignment, setAlignment] = useState(template.alignment || 'center');
    const [paperWidth, setPaperWidth] = useState(template.paper_width || '80mm');
    const [fontFamily, setFontFamily] = useState(template.font_family || 'classic');
    const [fontSize, setFontSize] = useState(template.font_size || 'normal');
    const [headerFormat, setHeaderFormat] = useState(template.header_format || 'bold_uppercase');
    const [dividerStyle, setDividerStyle] = useState(template.divider_style || 'dashes');
    const [lineSpacing, setLineSpacing] = useState(template.line_spacing || 'normal');

    // Dual Currency State
    const [enableSecondaryCurrency, setEnableSecondaryCurrency] = useState<boolean>(
        settings?.attendance_settings?.currency_settings?.enable_secondary_currency ??
        settings?.currency_settings?.enable_secondary_currency ??
        settings?.enable_secondary_currency ??
        false
    );
    const [secondaryCurrency, setSecondaryCurrency] = useState<string>(
        settings?.attendance_settings?.currency_settings?.secondary_currency ??
        settings?.currency_settings?.secondary_currency ??
        settings?.secondary_currency ??
        'USD'
    );
    const [exchangeRate, setExchangeRate] = useState<number | string>(
        settings?.attendance_settings?.currency_settings?.exchange_rate ??
        settings?.currency_settings?.exchange_rate ??
        settings?.exchange_rate ??
        36.80
    );

    // Tax (IVA) State
    const [enableTax, setEnableTax] = useState<boolean>(
        settings?.attendance_settings?.tax_settings?.enable_tax ??
        settings?.tax_settings?.enable_tax ??
        settings?.enable_tax ??
        true
    );
    const [taxRate, setTaxRate] = useState<number | string>(
        settings?.attendance_settings?.tax_settings?.tax_rate ??
        settings?.tax_settings?.tax_rate ??
        settings?.tax_rate ??
        15
    );
    const [pricesIncludeTax, setPricesIncludeTax] = useState<boolean>(
        settings?.attendance_settings?.tax_settings?.prices_include_tax ??
        settings?.tax_settings?.prices_include_tax ??
        settings?.prices_include_tax ??
        false
    );

    useEffect(() => {
        if (settings?.receipt_template) {
            const t = settings.receipt_template;
            setLogoUrl(t.logo_url || '');
            setLogoSize(t.logo_size || 'medium');
            setHeaderLines(t.header_lines || []);
            setFooterLines(t.footer_lines || []);
            setShowServerName(t.show_server_name !== false);
            setShowOrderTimestamp(t.show_order_timestamp !== false);
            setShowTaxBreakdown(t.show_tax_breakdown !== false);
            setShowPromotionDiscounts(t.show_promotion_discounts !== false);
            setShowDualCurrency(t.show_dual_currency !== false);
            setAlignment(t.alignment || 'center');
            setPaperWidth(t.paper_width || '80mm');
            setFontFamily(t.font_family || 'classic');
            setFontSize(t.font_size || 'normal');
            setHeaderFormat(t.header_format || 'bold_uppercase');
            setDividerStyle(t.divider_style || 'dashes');
            setLineSpacing(t.line_spacing || 'normal');
        }
        if (settings?.attendance_settings?.currency_settings || settings?.currency_settings) {
            const cs = settings?.attendance_settings?.currency_settings || settings?.currency_settings;
            if (cs.enable_secondary_currency !== undefined) setEnableSecondaryCurrency(cs.enable_secondary_currency);
            if (cs.secondary_currency) setSecondaryCurrency(cs.secondary_currency);
            if (cs.exchange_rate) setExchangeRate(cs.exchange_rate);
        }
        if (settings?.attendance_settings?.tax_settings || settings?.tax_settings) {
            const ts = settings?.attendance_settings?.tax_settings || settings?.tax_settings;
            if (ts.enable_tax !== undefined) setEnableTax(ts.enable_tax);
            if (ts.tax_rate !== undefined) setTaxRate(ts.tax_rate);
            if (ts.prices_include_tax !== undefined) setPricesIncludeTax(ts.prices_include_tax);
        }
    }, [settings]);

    async function toggleTableService() {
        setSaving(true);
        const newVal = !settings.enable_table_service;
        const { error } = await supabase.from('restaurant_settings').update({ enable_table_service: newVal }).not('id', 'is', null);
        if (error) {
            console.error('Failed to toggle table service:', error);
            alert(`Error: ${error.message}`);
        } else {
            setSettings((s: any) => ({ ...s, enable_table_service: newVal }));
        }
        setSaving(false);
    }

    async function addPrinter() {
        if (!newPrinterName.trim() || !newPrinterIp.trim()) return;
        const { data, error } = await supabase.from('printers')
            .insert([{ name: newPrinterName.trim(), ip_address: newPrinterIp.trim(), port: 9100 }])
            .select().single();
        if (error) {
            console.error('Failed to add printer:', error);
            alert(`Error adding printer: ${error.message}`);
            return;
        }
        if (data) setPrinters((prev: any[]) => [...prev, data]);
        setNewPrinterName(''); setNewPrinterIp('');
    }

    async function deletePrinter(id: string) {
        if (!confirm(lang === 'es' ? '¿Está seguro de que desea eliminar esta impresora? Asegúrese de que ninguna estación la esté usando.' : 'Are you sure you want to delete this printer? Assure no stations are actively using it.')) return;
        await supabase.from('printers').delete().eq('id', id);
        setPrinters((prev: any[]) => prev.filter(p => p.id !== id));
    }

    async function updateMapBackground(url: string) {
        setSaving(true);
        const { error } = await supabase.from('restaurant_settings').update({ map_background_url: url }).not('id', 'is', null);
        if (error) {
            console.error('Failed to update map background:', error);
            alert(`Error updating map background: ${error.message}`);
        } else {
            setSettings((s: any) => ({ ...s, map_background_url: url }));
        }
        setSaving(false);
    }

    async function updateThemeColor(color: string) {
        setSaving(true);
        const { error } = await supabase.from('restaurant_settings').update({ theme_color: color }).not('id', 'is', null);
        if (error) {
            console.error('Failed to update theme color:', error);
            alert(`Error: ${error.message}`);
        } else {
            setSettings((s: any) => ({ ...s, theme_color: color }));
            document.documentElement.setAttribute('data-color', color);
        }
        setSaving(false);
    }

    async function updateThemeMode(mode: string) {
        setSaving(true);
        const { error } = await supabase.from('restaurant_settings').update({ theme_mode: mode }).not('id', 'is', null);
        if (error) {
            console.error('Failed to update theme mode:', error);
            alert(`Error: ${error.message}`);
        } else {
            setSettings((s: any) => ({ ...s, theme_mode: mode }));
            if (mode === 'dark') document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        }
        setSaving(false);
    }

    async function updateCurrency(currency: string) {
        setSaving(true);
        await supabase.from('restaurant_settings').update({ currency }).not('id', 'is', null);
        setSettings((s: any) => ({ ...s, currency }));
        setSaving(false);
    }

    async function saveCurrencySettings(overrides?: {
        enableSec?: boolean;
        secCur?: string;
        rate?: number | string;
    }) {
        setSaving(true);
        const effectiveEnable = overrides?.enableSec !== undefined ? overrides.enableSec : enableSecondaryCurrency;
        const effectiveCur = overrides?.secCur !== undefined ? overrides.secCur : secondaryCurrency;
        const effectiveRate = overrides?.rate !== undefined ? Number(overrides.rate) : Number(exchangeRate) || 36.80;

        const currency_settings = {
            enable_secondary_currency: effectiveEnable,
            secondary_currency: effectiveCur,
            exchange_rate: effectiveRate
        };

        const attendance_settings = {
            ...(settings?.attendance_settings || {}),
            currency_settings
        };

        const { error } = await supabase.from('restaurant_settings')
            .update({ attendance_settings })
            .not('id', 'is', null);

        if (error) {
            console.error('Error saving currency settings:', error);
            alert(lang === 'es' ? 'Error al guardar la moneda secundaria' : 'Error saving secondary currency');
        } else {
            setSettings((s: any) => ({
                ...s,
                attendance_settings,
                currency_settings,
                enable_secondary_currency: effectiveEnable,
                secondary_currency: effectiveCur,
                exchange_rate: effectiveRate
            }));
        }
        setSaving(false);
    }

    async function saveTaxSettings(overrides?: {
        enableTaxVal?: boolean;
        taxRateVal?: number | string;
        includeTaxVal?: boolean;
    }) {
        setSaving(true);
        const effectiveEnable = overrides?.enableTaxVal !== undefined ? overrides.enableTaxVal : enableTax;
        const effectiveRate = overrides?.taxRateVal !== undefined ? Number(overrides.taxRateVal) : Number(taxRate) || 15;
        const effectiveInclude = overrides?.includeTaxVal !== undefined ? overrides.includeTaxVal : pricesIncludeTax;

        const tax_settings = {
            enable_tax: effectiveEnable,
            tax_rate: effectiveRate,
            prices_include_tax: effectiveInclude
        };

        const attendance_settings = {
            ...(settings?.attendance_settings || {}),
            tax_settings
        };

        const { error } = await supabase.from('restaurant_settings')
            .update({ attendance_settings })
            .not('id', 'is', null);

        if (error) {
            console.error('Error saving tax settings:', error);
            alert(lang === 'es' ? 'Error al guardar la configuración de impuestos' : 'Error saving tax settings');
        } else {
            setSettings((s: any) => ({
                ...s,
                attendance_settings,
                tax_settings,
                enable_tax: effectiveEnable,
                tax_rate: effectiveRate,
                prices_include_tax: effectiveInclude
            }));
        }
        setSaving(false);
    }

    async function updateLanguage(language: string) {
        setSaving(true);
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('pos_language', language);
            }
        } catch (e) {}
        await supabase.from('restaurant_settings').update({ language }).not('id', 'is', null);
        setSettings((s: any) => ({ ...s, language }));
        setSaving(false);
    }

    async function saveReceiptTemplate() {
        setSaving(true);
        const updatedTemplate = {
            logo_url: logoUrl.trim(),
            logo_size: logoSize,
            header_lines: headerLines.map(l => l.trim()).filter(l => l !== ''),
            footer_lines: footerLines.map(l => l.trim()).filter(l => l !== ''),
            show_server_name: showServerName,
            show_order_timestamp: showOrderTimestamp,
            show_tax_breakdown: showTaxBreakdown,
            show_promotion_discounts: showPromotionDiscounts,
            show_dual_currency: showDualCurrency,
            alignment,
            paper_width: paperWidth,
            font_family: fontFamily,
            font_size: fontSize,
            header_format: headerFormat,
            divider_style: dividerStyle,
            line_spacing: lineSpacing
        };

        const { error } = await supabase.from('restaurant_settings')
            .update({ receipt_template: updatedTemplate })
            .not('id', 'is', null);

        if (error) {
            console.error('Failed to save receipt template:', error);
            if (error.code === '42703' || error.message.includes('receipt_template')) {
                alert(lang === 'es' ? "Migración Requerida:\nLa columna 'receipt_template' no existe en la base de datos." : "Database Migration Required:\nThe 'receipt_template' column does not exist on your restaurant_settings table.");
            } else {
                alert(`Error: ${error.message}`);
            }
        } else {
            setSettings((s: any) => ({ ...s, receipt_template: updatedTemplate }));
            alert(lang === 'es' ? '¡Plantilla de recibos guardada con éxito!' : 'Receipt configuration saved successfully!');
        }
        setSaving(false);
    }

    return (
        <div className="max-w-4xl">
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-6">{t('settings.title', lang)}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column Settings */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('settings.table_service.title', lang)}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('settings.table_service.desc', lang)}</p>
                            </div>
                            <button onClick={toggleTableService} disabled={saving}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${settings.enable_table_service ? 'bg-primary-600' : 'bg-gray-300'}`}>
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-900 shadow transition-transform duration-200 ${settings.enable_table_service ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        {settings.enable_table_service && (
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                                <p className="text-sm text-green-600 font-semibold">{t('settings.table_service.active', lang)}</p>
                                <button onClick={() => setTab('tables')} className="mt-2 text-sm text-primary-600 font-semibold hover:underline">{t('settings.table_service.manage', lang)}</button>
                            </div>
                        )}
                    </div>

                    {/* Printers Management Settings */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('settings.printers.title', lang)}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{t('settings.printers.desc', lang)}</p>

                        <div className="space-y-3 mb-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input type="text" value={newPrinterName} onChange={e => setNewPrinterName(e.target.value)} placeholder={lang === 'es' ? 'Nombre de la impresora (ej. Bar)' : 'Printer Name (e.g. Front Bar)'} className="border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100" />
                                <input type="text" value={newPrinterIp} onChange={e => setNewPrinterIp(e.target.value)} placeholder={lang === 'es' ? 'Dirección IP' : 'IP Address'} className="border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100" />
                            </div>
                            <button onClick={addPrinter} disabled={!newPrinterName || !newPrinterIp} className="w-full bg-primary-600 text-white py-2.5 hover:bg-primary-700 disabled:opacity-50 rounded-xl font-bold transition text-sm shadow-sm">{t('settings.printers.add', lang)}</button>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {printers.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">{lang === 'es' ? 'No hay impresoras configuradas.' : 'No printers configured.'}</p>
                            ) : (
                                printers.map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-3 border border-gray-100 dark:border-slate-800 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                                        <div>
                                            <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{p.name}</p>
                                            <p className="text-xs text-gray-500 font-mono">{p.ip_address}:{p.port}</p>
                                        </div>
                                        <button onClick={() => deletePrinter(p.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition text-xs font-bold">{t('btn.remove', lang)}</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('settings.floor_bg', lang)}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-4">{lang === 'es' ? 'Agregue una URL de imagen para mostrar como fondo del plano en la pestaña Mesas y en la App POS.' : 'Add an image URL to display as your floor plan background in the Tables tab and POS App.'}</p>

                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    value={settings?.map_background_url || ''}
                                    onChange={(e) => setSettings({ ...settings, map_background_url: e.target.value })}
                                    placeholder="https://example.com/floorplan.jpg"
                                    className="flex-1 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                                />
                                <button
                                    onClick={() => updateMapBackground(settings.map_background_url)}
                                    disabled={saving}
                                    className="bg-gray-900 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-gray-800 transition disabled:opacity-50"
                                >
                                    {lang === 'es' ? 'Guardar' : 'Save Option'}
                                </button>
                            </div>
                            {settings?.map_background_url && (
                                <div className="mt-4 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden h-32 relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={settings.map_background_url} alt="Floor plan preview" className="w-full h-full object-cover opacity-50" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column Settings */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('settings.theme.title', lang)}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-6">{t('settings.theme.desc', lang)}</p>

                            <div className="mb-6">
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{lang === 'es' ? 'Paleta de Colores' : 'Color Palette'}</h4>
                                <div className="flex gap-4">
                                    {(['teal', 'rose', 'amber', 'indigo'] as const).map(color => (
                                        <button
                                            key={color}
                                            disabled={saving}
                                            onClick={() => updateThemeColor(color)}
                                            className={`w-12 h-12 rounded-full border-4 transition-all flex items-center justify-center ${settings?.theme_color === color ? 'border-gray-900 scale-110 shadow-md' : 'border-transparent hover:scale-105'} ${color === 'teal' ? 'bg-teal-500' : color === 'rose' ? 'bg-rose-500' : color === 'amber' ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                        >
                                            {settings?.theme_color === color && <span className="text-white text-lg font-bold">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{lang === 'es' ? 'Modo de Visualización' : 'Display Mode'}</h4>
                                <div className="flex gap-2">
                                    {(['light', 'dark'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            disabled={saving}
                                            onClick={() => updateThemeMode(mode)}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${settings?.theme_mode === mode ? 'border-primary-500 text-primary-600 bg-primary-50' : 'border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 hover:border-gray-300'}`}
                                        >
                                            {mode === 'light' ? (lang === 'es' ? '☀️ Claro' : '☀️ Light') : (lang === 'es' ? '🌙 Oscuro' : '🌙 Dark')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Currency & Dual Pricing Setting */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <span>💵</span> {lang === 'es' ? 'Moneda y Precios Duales' : 'Currency & Dual Pricing'}
                            </h3>
                            {enableSecondaryCurrency && (
                                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                                    {lang === 'es' ? 'Precios Duales Activo' : 'Dual Pricing Active'}
                                </span>
                            )}
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                            {lang === 'es'
                                ? 'Establezca la moneda principal de cobro y configure una moneda secundaria con tasa de cambio para clientes o turistas.'
                                : 'Set your primary billing currency and configure an optional secondary currency with exchange rate for tourists.'}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                                    {lang === 'es' ? 'Moneda Principal (Cobro General)' : 'Primary Currency'}
                                </label>
                                <select
                                    value={settings?.currency || 'USD'}
                                    onChange={e => updateCurrency(e.target.value)}
                                    disabled={saving}
                                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer text-sm"
                                >
                                    {Object.entries(CURRENCIES).map(([code, info]) => (
                                        <option key={code} value={code}>{info.symbol} {code} — {info.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Secondary Currency Toggle & Inputs */}
                            <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 block">
                                            {lang === 'es' ? 'Habilitar Moneda Secundaria (ej. USD / Turistas)' : 'Enable Secondary Currency (e.g. USD)'}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {lang === 'es' ? 'Muestra el precio equivalente en el menú, POS y recibo' : 'Shows equivalent price on menu, POS, and receipt'}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextVal = !enableSecondaryCurrency;
                                            setEnableSecondaryCurrency(nextVal);
                                            saveCurrencySettings({ enableSec: nextVal });
                                        }}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${enableSecondaryCurrency ? 'bg-primary-600' : 'bg-gray-300 dark:bg-slate-700'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${enableSecondaryCurrency ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {enableSecondaryCurrency && (
                                    <div className="pt-3 border-t border-gray-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                                {lang === 'es' ? 'Moneda Secundaria' : 'Secondary Currency'}
                                            </label>
                                            <select
                                                value={secondaryCurrency}
                                                onChange={e => {
                                                    setSecondaryCurrency(e.target.value);
                                                    saveCurrencySettings({ secCur: e.target.value });
                                                }}
                                                disabled={saving}
                                                className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200"
                                            >
                                                {Object.entries(CURRENCIES).map(([code, info]) => (
                                                    <option key={code} value={code}>{info.symbol} {code} — {info.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                                {lang === 'es' ? `Tasa de Cambio (1 ${secondaryCurrency} = )` : `Exchange Rate (1 ${secondaryCurrency} = )`}
                                            </label>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.0001"
                                                    value={exchangeRate}
                                                    onChange={e => setExchangeRate(e.target.value)}
                                                    onBlur={() => saveCurrencySettings({ rate: exchangeRate })}
                                                    className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200"
                                                    placeholder="36.80"
                                                />
                                                <button
                                                    onClick={() => saveCurrencySettings({ rate: exchangeRate })}
                                                    disabled={saving}
                                                    className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition shadow-sm whitespace-nowrap"
                                                >
                                                    {lang === 'es' ? 'Guardar' : 'Save'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="sm:col-span-2 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl p-3 text-xs text-blue-900 dark:text-blue-300 flex items-center justify-between">
                                            <span>
                                                💡 {lang === 'es' ? 'Ejemplo de Conversión:' : 'Conversion Preview:'} <strong>100 {CURRENCIES[settings?.currency || 'USD']?.symbol || ''}</strong> ≈ <strong>{((100 / (Number(exchangeRate) || 36.80))).toFixed(2)} {CURRENCIES[secondaryCurrency]?.symbol || '$'} {secondaryCurrency}</strong>
                                            </span>
                                            <span className="font-mono text-[11px] opacity-80">
                                                1 {secondaryCurrency} = {Number(exchangeRate) || 36.80} {settings?.currency || 'USD'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tax & IVA Configuration Setting */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <span>🧾</span> {lang === 'es' ? 'Impuestos e IVA' : 'Taxes & VAT / IVA'}
                            </h3>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${enableTax && !pricesIncludeTax ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'}`}>
                                {!enableTax ? (lang === 'es' ? 'IVA Desactivado' : 'Tax Disabled') : pricesIncludeTax ? (lang === 'es' ? 'IVA Incluido en Precios' : 'Tax Included in Prices') : (lang === 'es' ? `IVA Adicional (${taxRate}%)` : `Additional Tax (${taxRate}%)`)}
                            </span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                            {lang === 'es'
                                ? 'Configure el cálculo de IVA para las órdenes. Puede desactivarlo o indicar que los precios ya tienen el IVA incluido para evitar recargos no deseados al cobrar.'
                                : 'Configure tax calculations. You can disable tax or indicate that menu prices already include tax to avoid unintended extra charges at checkout.'}
                        </p>

                        <div className="space-y-3">
                            {/* Toggle Tax Enabled */}
                            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <div>
                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 block">
                                        {lang === 'es' ? 'Calcular Impuestos / IVA en Órdenes' : 'Calculate Taxes / VAT on Orders'}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {lang === 'es' ? 'Si se desactiva, las órdenes no tendrán recargo de IVA' : 'If disabled, orders will not calculate additional tax'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextVal = !enableTax;
                                        setEnableTax(nextVal);
                                        saveTaxSettings({ enableTaxVal: nextVal });
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${enableTax ? 'bg-primary-600' : 'bg-gray-300 dark:bg-slate-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${enableTax ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {enableTax && (
                                <>
                                    {/* Toggle Prices Include Tax */}
                                    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                        <div>
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 block">
                                                {lang === 'es' ? 'Los precios del menú ya incluyen IVA (Precios Netos)' : 'Menu Prices Already Include Tax'}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {lang === 'es' ? 'No sumará 15% extra al total al momento de cobrar en el POS' : 'Will not add extra tax on top of cart total during checkout'}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextVal = !pricesIncludeTax;
                                                setPricesIncludeTax(nextVal);
                                                saveTaxSettings({ includeTaxVal: nextVal });
                                            }}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${pricesIncludeTax ? 'bg-amber-600' : 'bg-gray-300 dark:bg-slate-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${pricesIncludeTax ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {/* Tax Rate Percentage */}
                                    <div className="grid grid-cols-2 gap-3 items-center pt-1">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                                {lang === 'es' ? 'Porcentaje de Impuesto / IVA (%)' : 'Tax Rate Percentage (%)'}
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.5"
                                                value={taxRate}
                                                onChange={e => setTaxRate(e.target.value)}
                                                onBlur={() => saveTaxSettings({ taxRateVal: taxRate })}
                                                className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-bold bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                        <div className="pt-5">
                                            <button
                                                onClick={() => saveTaxSettings({ taxRateVal: taxRate })}
                                                disabled={saving}
                                                className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white py-2 rounded-xl text-xs font-bold transition shadow-sm"
                                            >
                                                {lang === 'es' ? 'Guardar Tasa IVA' : 'Save Tax Rate'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Language Setting */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('settings.language_header', lang)}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-4">{lang === 'es' ? 'Establezca el idioma de la interfaz para el Panel y la App POS.' : 'Set the interface language for the Dashboard and POS App.'}</p>
                            <select
                                value={settings?.language || 'es'}
                                onChange={e => updateLanguage(e.target.value)}
                                disabled={saving}
                                className="w-full max-w-xs border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 font-bold bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer text-sm"
                            >
                                <option value="es">🇪🇸 Español (Spanish)</option>
                                <option value="en">🇺🇸 English (Inglés)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Receipt Design & Customizer Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm mt-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{lang === 'es' ? 'Diseño y Personalización de Recibos' : 'Receipt Design & Customization'}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{lang === 'es' ? 'Personalice logotipos, texto de encabezado, mensajes de bienvenida y campos de datos mostrados en los recibos de clientes. Los cambios se visualizan en tiempo real en el simulador térmico.' : 'Customize logos, header text, welcome messages, and data fields displayed on customer receipts. Real-time changes are previewed in the live thermal simulator.'}</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Editor Controls */}
                    <div className="space-y-5">
                        
                        {/* Logo Upload & URL Input Group */}
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{lang === 'es' ? 'Logotipo Personalizado' : 'Custom Header Logo'}</label>
                            
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 space-y-4 shadow-sm">
                                {/* Upload Button UI */}
                                <div className="flex items-center gap-3">
                                    <label className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer transition hover:bg-slate-100 dark:hover:bg-slate-800 ${uploading ? 'opacity-50 pointer-events-none' : 'border-gray-300 dark:border-slate-700'}`}>
                                        <div className="flex flex-col items-center justify-center">
                                            {uploading ? (
                                                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-1" />
                                            ) : (
                                                <span className="text-xl mb-1">📤</span>
                                            )}
                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{uploading ? (lang === 'es' ? 'Subiendo...' : 'Uploading...') : (lang === 'es' ? 'Elegir Imagen de Logotipo' : 'Choose Logo Image')}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, SVG (Max 5MB)</p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                <div className="relative flex py-1 items-center">
                                    <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
                                    <span className="flex-shrink mx-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">{lang === 'es' ? 'o pegar URL directa' : 'or paste direct url'}</span>
                                    <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
                                </div>

                                {/* URL fallback input */}
                                <input
                                    type="url"
                                    value={logoUrl}
                                    onChange={e => setLogoUrl(e.target.value)}
                                    placeholder="https://example.com/logo.png"
                                    className="w-full border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                                />

                                {/* Logo Size Selector */}
                                <div className="pt-2">
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{lang === 'es' ? 'Tamaño del Logotipo' : 'Logo / Image Size'}</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { id: 'small', label: lang === 'es' ? 'Pequeño' : 'Small', sub: '32px' },
                                            { id: 'medium', label: lang === 'es' ? 'Mediano' : 'Medium', sub: '48px' },
                                            { id: 'large', label: lang === 'es' ? 'Grande' : 'Large', sub: '64px' },
                                            { id: 'xlarge', label: lang === 'es' ? 'Extra' : 'X-Large', sub: '80px' }
                                        ].map((sz) => (
                                            <button
                                                key={sz.id}
                                                type="button"
                                                onClick={() => setLogoSize(sz.id)}
                                                className={`px-2 py-2 text-xs font-bold rounded-xl border transition-all text-center flex flex-col items-center justify-center ${
                                                    logoSize === sz.id
                                                        ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/20 scale-[1.02]'
                                                        : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                <span>{sz.label}</span>
                                                <span className={`text-[10px] font-normal ${logoSize === sz.id ? 'text-primary-100' : 'text-gray-400'}`}>{sz.sub}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Typography & Text Formatting Card */}
                        <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/30 space-y-4">
                            <h4 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                                <span>🔤</span>
                                <span>{lang === 'es' ? 'Formato de Texto y Tipografía' : 'Typography & Text Formatting'}</span>
                            </h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{lang === 'es' ? 'Estilo de Fuente' : 'Font Style'}</label>
                                    <select
                                        value={fontFamily}
                                        onChange={e => setFontFamily(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 cursor-pointer font-medium"
                                    >
                                        <option value="classic">{lang === 'es' ? 'Clásica Térmica (Monospace)' : 'Classic Thermal (Monospace)'}</option>
                                        <option value="modern">{lang === 'es' ? 'Moderna Limpia (Sans-serif)' : 'Modern Clean (Sans-serif)'}</option>
                                        <option value="condensed">{lang === 'es' ? 'Condensada (Compact / Font B)' : 'Condensed (Compact / Font B)'}</option>
                                        <option value="serif">{lang === 'es' ? 'Elegante (Serif)' : 'Elegant (Serif)'}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{lang === 'es' ? 'Tamaño de Letra Base' : 'Base Font Size'}</label>
                                    <select
                                        value={fontSize}
                                        onChange={e => setFontSize(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 cursor-pointer font-medium"
                                    >
                                        <option value="compact">{lang === 'es' ? 'Compacto (Pequeño 10px)' : 'Compact (Small 10px)'}</option>
                                        <option value="normal">{lang === 'es' ? 'Normal (Estándar 12px)' : 'Normal (Standard 12px)'}</option>
                                        <option value="large">{lang === 'es' ? 'Grande (Destacado 14px)' : 'Large (Prominent 14px)'}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{lang === 'es' ? 'Énfasis de Encabezado' : 'Header Line Style'}</label>
                                    <select
                                        value={headerFormat}
                                        onChange={e => setHeaderFormat(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 cursor-pointer font-medium"
                                    >
                                        <option value="bold_uppercase">{lang === 'es' ? 'Negrita + MAYÚSCULAS' : 'Bold + UPPERCASE'}</option>
                                        <option value="bold">{lang === 'es' ? 'Negrita Normal' : 'Bold Normal Case'}</option>
                                        <option value="normal">{lang === 'es' ? 'Texto Regular' : 'Regular Normal Text'}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{lang === 'es' ? 'Estilo de Separador' : 'Divider Style'}</label>
                                    <select
                                        value={dividerStyle}
                                        onChange={e => setDividerStyle(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 cursor-pointer font-mono text-xs"
                                    >
                                        <option value="dashes">-------------------- (Guiones / Dashes)</option>
                                        <option value="equals">==================== (Doble / Equals)</option>
                                        <option value="dots">.................... (Puntos / Dots)</option>
                                        <option value="stars">******************** (Estrellas / Stars)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{lang === 'es' ? 'Espaciado Vertical' : 'Line Density / Spacing'}</label>
                                    <select
                                        value={lineSpacing}
                                        onChange={e => setLineSpacing(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 cursor-pointer font-medium"
                                    >
                                        <option value="compact">{lang === 'es' ? 'Apretado / Compacto' : 'Tight / Compact'}</option>
                                        <option value="normal">{lang === 'es' ? 'Normal / Estándar' : 'Normal / Standard'}</option>
                                        <option value="relaxed">{lang === 'es' ? 'Espacioso / Holgado' : 'Relaxed / Spacious'}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Header lines */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{lang === 'es' ? 'Líneas de Encabezado' : 'Receipt Header Lines'}</label>
                                <button
                                    onClick={() => setHeaderLines([...headerLines, ''])}
                                    className="text-xs text-primary-600 font-bold hover:underline"
                                >
                                    + {lang === 'es' ? 'Agregar Línea' : 'Add Line'}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {headerLines.map((line, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={line}
                                            onChange={e => {
                                                const updated = [...headerLines];
                                                updated[idx] = e.target.value;
                                                setHeaderLines(updated);
                                            }}
                                            placeholder={lang === 'es' ? `Línea de Encabezado ${idx + 1}` : `Header Line ${idx + 1}`}
                                            className="flex-1 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                                        />
                                        <button
                                            onClick={() => setHeaderLines(headerLines.filter((_, i) => i !== idx))}
                                            className="text-red-500 hover:text-red-700 px-2 font-bold text-xs"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer lines */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{lang === 'es' ? 'Líneas de Pie de Página' : 'Receipt Footer Lines'}</label>
                                <button
                                    onClick={() => setFooterLines([...footerLines, ''])}
                                    className="text-xs text-primary-600 font-bold hover:underline"
                                >
                                    + {lang === 'es' ? 'Agregar Línea' : 'Add Line'}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {footerLines.map((line, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={line}
                                            onChange={e => {
                                                const updated = [...footerLines];
                                                updated[idx] = e.target.value;
                                                setFooterLines(updated);
                                            }}
                                            placeholder={lang === 'es' ? `Línea de Pie ${idx + 1}` : `Footer Line ${idx + 1}`}
                                            className="flex-1 border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                                        />
                                        <button
                                            onClick={() => setFooterLines(footerLines.filter((_, i) => i !== idx))}
                                            className="text-red-500 hover:text-red-700 px-2 font-bold text-xs"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Toggles & Options */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{lang === 'es' ? 'Alineación' : 'Alignment'}</label>
                                <select
                                    value={alignment}
                                    onChange={e => setAlignment(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 cursor-pointer"
                                >
                                    <option value="left">{lang === 'es' ? 'Izquierda' : 'Left Align'}</option>
                                    <option value="center">{lang === 'es' ? 'Centrado' : 'Center Align'}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{lang === 'es' ? 'Ancho de Papel' : 'Paper Width'}</label>
                                <select
                                    value={paperWidth}
                                    onChange={e => setPaperWidth(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 cursor-pointer"
                                >
                                    <option value="58mm">58mm ({lang === 'es' ? 'Estrecho' : 'Narrow'})</option>
                                    <option value="80mm">80mm ({lang === 'es' ? 'Estándar' : 'Standard'})</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{lang === 'es' ? 'Mostrar Nombre del Mesero' : 'Show Waiter Name'}</span>
                                <button
                                    onClick={() => setShowServerName(!showServerName)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${showServerName ? 'bg-primary-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${showServerName ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{lang === 'es' ? 'Mostrar Fecha y Hora de la Orden' : 'Show Order Date & Time'}</span>
                                <button
                                    onClick={() => setShowOrderTimestamp(!showOrderTimestamp)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${showOrderTimestamp ? 'bg-primary-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${showOrderTimestamp ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{lang === 'es' ? 'Mostrar Desglose de Impuestos (IVA 15%)' : 'Show Detailed Tax Breakdown (IVA 15%)'}</span>
                                <button
                                    onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${showTaxBreakdown ? 'bg-primary-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${showTaxBreakdown ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{lang === 'es' ? 'Mostrar Descuentos de Promociones' : 'Show Promotion Discounts'}</span>
                                <button
                                    onClick={() => setShowPromotionDiscounts(!showPromotionDiscounts)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${showPromotionDiscounts ? 'bg-primary-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${showPromotionDiscounts ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {enableSecondaryCurrency && (
                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
                                    <div>
                                        <span className="text-sm font-bold text-blue-900 dark:text-blue-300 block">
                                            {lang === 'es' ? `Mostrar Total en ${secondaryCurrency} (Moneda Secundaria)` : `Show Total in ${secondaryCurrency}`}
                                        </span>
                                        <span className="text-[11px] text-blue-700 dark:text-blue-400">
                                            {lang === 'es' ? `Imprime el total convertido con tasa de ${exchangeRate}` : `Prints converted total at rate ${exchangeRate}`}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setShowDualCurrency(!showDualCurrency)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${showDualCurrency ? 'bg-blue-600' : 'bg-gray-300'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${showDualCurrency ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                            <button
                                onClick={saveReceiptTemplate}
                                disabled={saving}
                                className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-50 text-sm shadow-sm"
                            >
                                {saving ? (lang === 'es' ? 'Guardando Plantilla...' : 'Saving Custom Template...') : (lang === 'es' ? 'Guardar Configuración de Recibos' : 'Save Receipt Configuration')}
                            </button>
                        </div>
                    </div>

                    {/* Live CSS Simulator */}
                    <div className="flex flex-col items-center justify-start bg-slate-100 dark:bg-slate-950 p-6 rounded-2xl border border-gray-200 dark:border-slate-800">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{lang === 'es' ? 'Vista Previa Térmica en Vivo' : 'Live Thermal Preview'}</span>

                        {(() => {
                            const fontClass = fontFamily === 'modern' ? 'font-sans' : fontFamily === 'serif' ? 'font-serif' : fontFamily === 'condensed' ? 'font-mono tracking-tighter' : 'font-mono';
                            const sizeClass = fontSize === 'compact' ? 'text-[10px]' : fontSize === 'large' ? 'text-sm' : 'text-xs';
                            const spacingClass = lineSpacing === 'compact' ? 'space-y-0.5' : lineSpacing === 'relaxed' ? 'space-y-2' : 'space-y-1';
                            const logoHeightClass = logoSize === 'small' ? 'max-h-8' : logoSize === 'large' ? 'max-h-16' : logoSize === 'xlarge' ? 'max-h-20' : 'max-h-12';
                            const dividerChar = dividerStyle === 'equals' ? '=' : dividerStyle === 'dots' ? '.' : dividerStyle === 'stars' ? '*' : '-';
                            const dividerCount = paperWidth === '58mm' ? 28 : 38;

                            return (
                                <div
                                    className={`bg-[#fffff9] text-gray-900 p-6 shadow-md border-y-2 border-dashed border-gray-300 ${fontClass} ${sizeClass} select-none transition-all duration-300 ${paperWidth === '58mm' ? 'w-[280px]' : 'w-[360px]'} flex flex-col`}
                                    style={{
                                        backgroundImage: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.01) 100%)',
                                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)'
                                    }}
                                >
                                    {/* Logo rendering */}
                                    {logoUrl && logoUrl.trim() ? (
                                        <div className="flex justify-center mb-3">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={logoUrl.trim()} alt="Receipt logo" className={`${logoHeightClass} object-contain transition-all`} />
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-300 text-3xl mb-2">🍽️</div>
                                    )}

                                    {/* Headers */}
                                    <div className={`mb-3 ${spacingClass} ${alignment === 'center' ? 'text-center' : 'text-left'}`}>
                                        {headerLines.map((line, idx) => {
                                            const headerStyle = idx === 0
                                                ? (headerFormat === 'bold_uppercase' ? 'font-black text-sm uppercase' : headerFormat === 'bold' ? 'font-bold text-sm' : 'font-normal text-sm')
                                                : 'text-[11px] text-gray-600 dark:text-gray-400';
                                            return (
                                                <div key={idx} className={headerStyle}>
                                                    {line}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Divider */}
                                    <div className="overflow-hidden whitespace-nowrap text-gray-400 text-center font-mono text-xs my-1 select-none">
                                        {dividerChar.repeat(dividerCount)}
                                    </div>

                                    {/* Meta info */}
                                    <div className="text-[10px] text-gray-500 space-y-0.5">
                                        <div className="flex justify-between">
                                            <span>ORDER: #4810</span>
                                            {showOrderTimestamp && <span>30/05/2026 12:45 PM</span>}
                                        </div>
                                        <div className="flex justify-between">
                                            <span>TABLE: 14</span>
                                            {showServerName && <span>WAITER: JANE SMITH</span>}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="overflow-hidden whitespace-nowrap text-gray-400 text-center font-mono text-xs my-1 select-none">
                                        {dividerChar.repeat(dividerCount)}
                                    </div>

                                    {/* Items */}
                                    <div className={`${spacingClass} py-1`}>
                                        <div className="flex justify-between font-medium">
                                            <span className="truncate">1x RIBEYE STEAK</span>
                                            <span>C$680.00</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 ml-3">+ TERM: MEDIUM RARE</div>
                                        <div className="flex justify-between font-medium">
                                            <span className="truncate">2x IMPERIAL BEER</span>
                                            <span>C$160.00</span>
                                        </div>
                                        <div className="flex justify-between font-medium">
                                            <span className="truncate">1x FLAN DE COCO</span>
                                            <span>C$120.00</span>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="overflow-hidden whitespace-nowrap text-gray-400 text-center font-mono text-xs my-1 select-none">
                                        {dividerChar.repeat(dividerCount)}
                                    </div>

                                    {/* Totals */}
                                    <div className={`${spacingClass} text-[11px]`}>
                                        <div className="flex justify-between">
                                            <span>SUBTOTAL</span>
                                            <span>C$960.00</span>
                                        </div>

                                        {showPromotionDiscounts && (
                                            <div className="flex justify-between text-red-600 font-semibold">
                                                <span>DISCOUNTS (HAPPY HOUR)</span>
                                                <span>-C$80.00</span>
                                            </div>
                                        )}

                                        {showTaxBreakdown && (
                                            <div className="flex justify-between text-gray-500">
                                                <span>IVA ({taxRate}%)</span>
                                                <span>{pricesIncludeTax ? (lang === 'es' ? 'INCLUIDO' : 'INCLUDED') : !enableTax ? (lang === 'es' ? 'EXENTO' : 'EXEMPT') : 'C$132.00'}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between font-black text-sm border-t border-dotted border-gray-300 pt-1 mt-1">
                                            <span>TOTAL ({settings?.currency || 'NIO'})</span>
                                            <span>C$1,012.00</span>
                                        </div>

                                        {showDualCurrency && enableSecondaryCurrency && (
                                            <div className="flex justify-between font-bold text-xs text-blue-700 border-t border-dashed border-gray-200 pt-1 mt-0.5">
                                                <span>TOTAL ({secondaryCurrency})</span>
                                                <span>${(1012.00 / (Number(exchangeRate) || 36.80)).toFixed(2)} {secondaryCurrency} <span className="text-[9px] font-normal text-gray-400">(T.C. {exchangeRate})</span></span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Divider */}
                                    <div className="overflow-hidden whitespace-nowrap text-gray-400 text-center font-mono text-xs my-1 select-none">
                                        {dividerChar.repeat(dividerCount)}
                                    </div>

                                    {/* Footers */}
                                    <div className={`mt-2 text-center text-[10px] text-gray-500 ${spacingClass}`}>
                                        {footerLines.map((line, idx) => (
                                            <div key={idx}>{line}</div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}
