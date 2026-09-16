import React, { useState, useRef } from 'react';
import { t } from '../../utils/i18n';
import { motion } from 'framer-motion';

type TableShape = 'rectangle' | 'circle' | 'square' | 'wall';
const GRID_SIZE = 20;

interface TablesTabProps {
    supabase: any;
    lang: string;
    tables: any[];
    setTables: any;
    settings: any;
    setTab: any;
    zones: any[];
    setZones: any;
    setSettings?: any;
}

const CANVAS_HEIGHT = 600;

export default function TablesTab({ supabase, lang, tables, setTables, settings, setTab, zones, setZones, setSettings }: TablesTabProps) {
    const [newTableName, setNewTableName] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState(4);
    const [newTableZone, setNewTableZone] = useState('Main Floor');
    const [dragActiveId, setDragActiveId] = useState<string | null>(null);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [newZoneName, setNewZoneName] = useState('');
    const [newZoneColor, setNewZoneColor] = useState('#6366f1');
    const [floorZoneFilter, setFloorZoneFilter] = useState('all');
    const [uploadingZoneId, setUploadingZoneId] = useState<string | null>(null);
    const [editingZoneBgId, setEditingZoneBgId] = useState<string | null>(null);
    const [zoneUrlInputs, setZoneUrlInputs] = useState<Record<string, string>>({});
    const canvasRef = useRef<HTMLDivElement>(null);

    // Zone Backgrounds map helper
    const zoneBackgrounds: Record<string, string> =
        settings?.attendance_settings?.zone_backgrounds ||
        settings?.zone_backgrounds ||
        {};

    function getActiveZoneBackground(): string | null {
        if (floorZoneFilter === 'all') {
            return settings?.map_background_url || null;
        }
        const zoneObj = zones.find((z: any) => z.name === floorZoneFilter || z.id === floorZoneFilter);
        if (zoneObj) {
            if (zoneBackgrounds[zoneObj.id]) return zoneBackgrounds[zoneObj.id];
            if (zoneBackgrounds[zoneObj.name]) return zoneBackgrounds[zoneObj.name];
            if (zoneObj.background_url) return zoneObj.background_url;
        }
        return settings?.map_background_url || null;
    }

    async function saveZoneBackground(zoneId: string, url: string) {
        const updatedBackgrounds = {
            ...zoneBackgrounds,
            [zoneId]: url
        };
        const attendance_settings = {
            ...(settings?.attendance_settings || {}),
            zone_backgrounds: updatedBackgrounds
        };

        await supabase.from('restaurant_settings')
            .update({ attendance_settings })
            .not('id', 'is', null);

        if (setSettings) {
            setSettings((s: any) => ({
                ...s,
                attendance_settings,
                zone_backgrounds: updatedBackgrounds
            }));
        }
        setZones((prev: any[]) => prev.map((z: any) => z.id === zoneId ? { ...z, background_url: url } : z));
    }

    async function handleZoneBgUpload(zoneId: string, file: File) {
        setUploadingZoneId(zoneId);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'floorplans');
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            if (data.url) {
                await saveZoneBackground(zoneId, data.url);
            }
        } catch (err: any) {
            console.error('Zone background upload error:', err);
            alert(`Error: ${err.message}`);
        } finally {
            setUploadingZoneId(null);
        }
    }

    // snap to grid helper for tables tab
    const snapToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

    async function addTable(shape: TableShape = 'rectangle', isWall: boolean = false) {
        let name = newTableName.trim();
        if (!name) {
            name = isWall 
                ? (lang === 'es' ? `Pared ${tables.filter(t => t.shape === 'wall').length + 1}` : `Wall ${tables.filter(t => t.shape === 'wall').length + 1}`) 
                : (lang === 'es' ? `Mesa ${tables.length + 1}` : `Table ${tables.length + 1}`);
        }

        const baseWidth = isWall ? 200 : (shape === 'circle' ? 80 : 100);
        const baseHeight = isWall ? 20 : 80;

        const { data } = await supabase.from('tables').insert([{
            name,
            shape,
            x: snapToGrid(50),
            y: snapToGrid(50),
            width: baseWidth,
            height: baseHeight,
            zone: isWall ? null : newTableZone,
            capacity: isWall ? null : newTableCapacity,
        }]).select().single();

        if (data) setTables((prev: any[]) => [...prev, data]);
        setNewTableName('');
        setNewTableCapacity(4);
    }

    async function deleteTable(id: string) {
        if (!confirm(lang === 'es' ? '¿Seguro que deseas eliminar esta mesa o pared?' : 'Are you sure you want to delete this table/wall?')) return;
        await supabase.from('tables').delete().eq('id', id);
        setTables((prev: any[]) => prev.filter((t: any) => t.id !== id));
    }

    async function handleDragEnd(table: any, info: any) {
        setDragActiveId(null);
        setSelectedTableId(table.id);
        const newX = snapToGrid(Math.max(0, table.x + info.offset.x));
        const newY = snapToGrid(Math.max(0, table.y + info.offset.y));
        setTables((prev: any[]) => prev.map((t: any) => t.id === table.id ? { ...t, x: newX, y: newY } : t));
        await supabase.from('tables').update({ x: newX, y: newY }).eq('id', table.id);
    }

    async function updateTableDimensions(id: string, updates: any) {
        setTables((prev: any[]) => prev.map((t: any) => t.id === id ? { ...t, ...updates } : t));
        await supabase.from('tables').update(updates).eq('id', id);
    }

    // ─── ZONE actions ─────────────────────────────────────────────────────────
    async function addZone() {
        if (!newZoneName.trim()) return;
        const { data } = await supabase.from('table_zones').insert([{
            name: newZoneName.trim(),
            color: newZoneColor,
            display_order: zones.length,
        }]).select().single();
        if (data) setZones((prev: any[]) => [...prev, data]);
        setNewZoneName('');
        setNewZoneColor('#6366f1');
    }

    async function deleteZone(id: string) {
        if (!confirm(lang === 'es' ? '¿Eliminar esta zona? Las mesas asignadas mantendrán su etiqueta.' : 'Delete this zone? Tables assigned to it will keep their zone label.')) return;
        await supabase.from('table_zones').delete().eq('id', id);
        setZones((prev: any[]) => prev.filter((z: any) => z.id !== id));
    }

    async function updateZone(id: string, updates: any) {
        setZones((prev: any[]) => prev.map((z: any) => z.id === id ? { ...z, ...updates } : z));
        await supabase.from('table_zones').update(updates).eq('id', id);
    }

    const currentCanvasBg = getActiveZoneBackground();

    return (
        <>
            {/* ══════════ TABLES TAB ══════════ */}
                            
                                <div className="flex flex-col gap-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('tables.title', lang)}</h2>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                                {settings.enable_table_service ? `${tables.filter((t: any) => t.shape !== 'wall').length} ${t('tables.tables_count', lang)} · ${zones.length} ${t('tables.zones_count', lang)}` : t('tables.enable_service', lang)}
                                            </p>
                                        </div>
                                    </div>

                                    {!settings.enable_table_service ? (
                                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
                                            <span className="text-2xl">⚠️</span>
                                            <div>
                                                <p className="font-bold text-amber-900">{t('tables.disabled_msg', lang)}</p>
                                                <button onClick={() => setTab('settings')} className="text-amber-700 text-sm font-semibold hover:underline">{t('tables.enable_btn', lang)}</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-6">
                                            {/* Zone Filter Tabs */}
                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-3 shadow-sm overflow-x-auto">
                                                <button onClick={() => setFloorZoneFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ${floorZoneFilter === 'all' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>{lang === 'es' ? '📍 Todas las Zonas' : '📍 All Zones'}</button>
                                                {zones.map((z: any) => {
                                                    const hasBg = !!(zoneBackgrounds[z.id] || zoneBackgrounds[z.name] || z.background_url);
                                                    return (
                                                        <button key={z.id} onClick={() => setFloorZoneFilter(z.name)} className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap flex items-center gap-2 ${floorZoneFilter === z.name ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                                                            style={floorZoneFilter === z.name ? { backgroundColor: z.color } : {}}>
                                                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: z.color }}></span>
                                                            <span>{z.name}</span>
                                                            {hasBg && <span className="text-xs opacity-90" title={lang === 'es' ? 'Fondo de zona personalizado' : 'Custom zone background'}>🖼️</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="flex flex-col lg:flex-row gap-6">
                                                {/* Canvas Area container */}
                                                <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                                                    <div className="bg-gray-50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800 p-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{lang === 'es' ? 'Editor de Plano' : 'Floor Plan Editor'}</span>
                                                            {floorZoneFilter !== 'all' && (
                                                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold">
                                                                    {lang === 'es' ? `Zona: ${floorZoneFilter}` : `Zone: ${floorZoneFilter}`} {currentCanvasBg ? '🖼️' : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs">
                                                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span> {lang === 'es' ? 'Disponible' : 'Available'}</span>
                                                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> {lang === 'es' ? 'Ocupada' : 'Occupied'}</span>
                                                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block"></span> {lang === 'es' ? 'Reservada' : 'Reserved'}</span>
                                                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block"></span> {lang === 'es' ? 'No disponible' : 'Unavailable'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 overflow-auto bg-amber-50/20 dark:bg-slate-950/40">
                                                        <div
                                                            className="relative"
                                                            style={{
                                                                minWidth: '100%',
                                                                width: tables.length > 0 ? Math.max(800, ...tables.map((t: any) => (t.x || 0) + (t.width || 0) + 100)) : '100%',
                                                                minHeight: CANVAS_HEIGHT,
                                                                height: tables.length > 0 ? Math.max(CANVAS_HEIGHT, ...tables.map((t: any) => (t.y || 0) + (t.height || 0) + 100)) : CANVAS_HEIGHT,
                                                                backgroundImage: currentCanvasBg ? `url(${currentCanvasBg}), radial-gradient(#cbd5e1 1px, transparent 1px)` : `radial-gradient(#cbd5e1 1px, transparent 1px)`,
                                                                backgroundSize: currentCanvasBg ? 'cover, 20px 20px' : `${GRID_SIZE}px ${GRID_SIZE}px`,
                                                                backgroundPosition: 'center, top left',
                                                                backgroundRepeat: 'no-repeat, repeat'
                                                            }}
                                                            ref={canvasRef}
                                                        >
                                                            {tables.filter((t: any) => floorZoneFilter === 'all' || t.zone === floorZoneFilter || t.shape === 'wall').map((table: any) => {
                                                                const zoneObj = zones.find((z: any) => z.name === table.zone);
                                                                const zoneColor = zoneObj?.color || '#6366f1';
                                                                const statusClasses: any = {
                                                                    available: 'bg-white dark:bg-slate-900 border-emerald-300 text-emerald-900',
                                                                    occupied: 'bg-amber-50 border-amber-300 text-amber-900',
                                                                    reserved: 'bg-blue-50 border-blue-300 text-blue-900',
                                                                    unavailable: 'bg-gray-100 border-gray-300 text-gray-500',
                                                                };
                                                                const sc = statusClasses[table.status] || statusClasses.available;

                                                                return (
                                                                <motion.div
                                                                    key={table.id}
                                                                    drag
                                                                    dragMomentum={false}
                                                                    dragConstraints={canvasRef}
                                                                    onDragStart={() => setDragActiveId(table.id)}
                                                                    onDragEnd={(e: any, info: any) => handleDragEnd(table, info)}
                                                                    initial={{ x: table.x, y: table.y, rotate: table.rotation || 0 }}
                                                                    animate={{ x: table.x, y: table.y, rotate: table.rotation || 0 }}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        width: table.width,
                                                                        height: table.height,
                                                                        zIndex: dragActiveId === table.id ? 50 : 10,
                                                                    }}
                                                                    onPointerDown={() => setSelectedTableId(table.id)}
                                                                    className={`
                                                                        flex flex-col items-center justify-center cursor-grab active:cursor-grabbing border-2 shadow-sm transition-shadow hover:shadow-md overflow-hidden relative
                                                                        ${table.shape === 'circle' ? 'rounded-full' : table.shape === 'wall' ? 'rounded-sm bg-gray-500 border-gray-600' : 'rounded-lg'}
                                                                        ${table.shape !== 'wall' ? sc : ''}
                                                                    `}
                                                                >
                                                                    {/* Zone color strip */}
                                                                    {table.shape !== 'wall' && (
                                                                        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: zoneColor }}></div>
                                                                    )}
                                                                    {table.shape !== 'wall' && (() => {
                                                                        const minDim = Math.min(table.width, table.height);
                                                                        const titleSize = Math.max(10, minDim * 0.18);
                                                                        const badgeSize = Math.max(8, minDim * 0.10);
                                                                        const showBadge = minDim >= 60;

                                                                        return (
                                                                            <>
                                                                                <span style={{ fontSize: `${titleSize}px` }} className="font-bold leading-tight px-1 text-center truncate w-full">{table.name}</span>
                                                                                {showBadge && (
                                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                                        <span style={{ fontSize: `${badgeSize}px`, padding: `${Math.max(2, badgeSize * 0.2)}px ${Math.max(8, badgeSize * 0.4)}px` }} className="uppercase tracking-wider font-semibold rounded-full bg-black/10">
                                                                                            {table.status === 'reserved' ? (lang === 'es' ? '📅 Reservada' : '📅 Reserved') : (lang === 'es' ? (table.status === 'occupied' ? 'OCUPADA' : table.status === 'unavailable' ? 'NO DISP.' : 'DISPONIBLE') : (table.status || 'available').toUpperCase())}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                {showBadge && table.capacity && (
                                                                                    <span style={{ fontSize: `${Math.max(7, badgeSize * 0.85)}px` }} className="text-gray-400 mt-0.5">👥 {table.capacity}</span>
                                                                                )}
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Sidebar Controls */}
                                                <div className="w-full lg:w-80 flex flex-col gap-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                                                    {/* Add Items Card */}
                                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
                                                        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">{t('tables.add_table', lang)}</h3>

                                                        <div className="space-y-3 mb-4">
                                                            <input
                                                                type="text"
                                                                value={newTableName}
                                                                onChange={e => setNewTableName(e.target.value)}
                                                                placeholder={lang === 'es' ? "Nombre personalizado (opcional)" : "Custom name (optional)"}
                                                                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                            />
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">{lang === 'es' ? 'Zona' : 'Zone'}</label>
                                                                    <select value={newTableZone} onChange={e => setNewTableZone(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                                                        {zones.map((z: any) => <option key={z.id} value={z.name}>{z.name}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">{lang === 'es' ? 'Capacidad' : 'Capacity'}</label>
                                                                    <input type="number" min="1" max="30" value={newTableCapacity} onChange={e => setNewTableCapacity(parseInt(e.target.value) || 4)}
                                                                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                                            <button onClick={() => addTable('rectangle')} className="flex flex-col items-center justify-center gap-2 border border-gray-200 dark:border-slate-800 bg-gray-50 rounded-xl p-3 hover:border-primary-400 hover:bg-primary-50 transition-colors group">
                                                                <div className="w-10 h-8 border-2 border-gray-400 rounded group-hover:border-primary-500"></div>
                                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-primary-700">{lang === 'es' ? 'Rectángulo' : 'Rectangle'}</span>
                                                            </button>
                                                            <button onClick={() => addTable('circle')} className="flex flex-col items-center justify-center gap-2 border border-gray-200 dark:border-slate-800 bg-gray-50 rounded-xl p-3 hover:border-primary-400 hover:bg-primary-50 transition-colors group">
                                                                <div className="w-9 h-9 border-2 border-gray-400 rounded-full group-hover:border-primary-500"></div>
                                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-primary-700">{lang === 'es' ? 'Redonda' : 'Round'}</span>
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <button onClick={() => addTable('wall', true)} className="flex flex-col items-center justify-center gap-2 border border-gray-200 dark:border-slate-800 bg-gray-50 rounded-xl p-3 hover:border-gray-400 hover:bg-gray-100 transition-colors group">
                                                                <div className="w-12 h-2 bg-gray-400 rounded-sm group-hover:bg-gray-500"></div>
                                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-gray-700">{lang === 'es' ? 'Pared Horiz.' : 'Horiz Wall'}</span>
                                                            </button>
                                                            <button onClick={async () => {
                                                                let name = newTableName.trim() || (lang === 'es' ? `Pared ${tables.filter((t: any) => t.shape === 'wall').length + 1}` : `Wall ${tables.filter((t: any) => t.shape === 'wall').length + 1}`);
                                                                const { data } = await supabase.from('tables').insert([{
                                                                    name, shape: 'wall', x: snapToGrid(50), y: snapToGrid(50), width: 20, height: 200
                                                                }]).select().single();
                                                                if (data) setTables((prev: any[]) => [...prev, data]);
                                                                setNewTableName('');
                                                            }} className="flex flex-col items-center justify-center gap-2 border border-gray-200 dark:border-slate-800 bg-gray-50 rounded-xl p-3 hover:border-gray-400 hover:bg-gray-100 transition-colors group">
                                                                <div className="w-2 h-10 bg-gray-400 rounded-sm group-hover:bg-gray-500"></div>
                                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-gray-700">{lang === 'es' ? 'Pared Vert.' : 'Vert Wall'}</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Selected Element Editor */}
                                                    {selectedTableId && tables.find((t: any) => t.id === selectedTableId) && (
                                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-primary-200 dark:border-primary-800 p-5 shadow-sm">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="font-bold text-primary-600">{t('tables.edit_element', lang)}</h3>
                                                                <button onClick={() => setSelectedTableId(null)} className="text-gray-400 hover:text-gray-600 rounded-full p-1 bg-gray-50 transition">✕</button>
                                                            </div>

                                                            {(() => {
                                                                const table = tables.find((t: any) => t.id === selectedTableId)!;
                                                                const isWall = table.shape === 'wall';
                                                                return (
                                                                    <div className="space-y-4">
                                                                        {/* Name */}
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{lang === 'es' ? 'Nombre' : 'Name'}</label>
                                                                            <input type="text" value={table.name} onChange={(e) => updateTableDimensions(table.id, { name: e.target.value })}
                                                                                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                                        </div>

                                                                        {!isWall && (
                                                                            <>
                                                                                {/* Zone */}
                                                                                <div>
                                                                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{lang === 'es' ? 'Zona' : 'Zone'}</label>
                                                                                    <select value={table.zone || ''} onChange={(e) => updateTableDimensions(table.id, { zone: e.target.value })}
                                                                                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                                                                        {zones.map((z: any) => <option key={z.id} value={z.name}>{z.name}</option>)}
                                                                                    </select>
                                                                                </div>

                                                                                {/* Capacity */}
                                                                                <div>
                                                                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{lang === 'es' ? 'Capacidad de Asientos' : 'Seating Capacity'}</label>
                                                                                    <input type="number" min="1" max="30" value={table.capacity || 4}
                                                                                        onChange={(e) => updateTableDimensions(table.id, { capacity: parseInt(e.target.value) || 4 })}
                                                                                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                                                </div>

                                                                                {/* Status */}
                                                                                <div>
                                                                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{lang === 'es' ? 'Estado' : 'Status'}</label>
                                                                                    <select value={table.status || 'available'} onChange={(e) => {
                                                                                        const updates: any = { status: e.target.value };
                                                                                        if (e.target.value !== 'reserved') { updates.reserved_by = null; updates.reserved_at = null; }
                                                                                        updateTableDimensions(table.id, updates);
                                                                                    }} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                                                                        <option value="available">{lang === 'es' ? '✅ Disponible' : '✅ Available'}</option>
                                                                                        <option value="occupied">{lang === 'es' ? '🟡 Ocupada' : '🟡 Occupied'}</option>
                                                                                        <option value="reserved">{lang === 'es' ? '📅 Reservada' : '📅 Reserved'}</option>
                                                                                        <option value="unavailable">{lang === 'es' ? '⛔ No disponible' : '⛔ Unavailable'}</option>
                                                                                    </select>
                                                                                </div>

                                                                                {/* Reservation Details */}
                                                                                {table.status === 'reserved' && (
                                                                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                                                                                        <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">{lang === 'es' ? '📅 Detalles de Reservación' : '📅 Reservation Details'}</h4>
                                                                                        <div>
                                                                                            <label className="block text-xs font-semibold text-blue-600 mb-1">{lang === 'es' ? 'Nombre del Cliente' : 'Guest Name'}</label>
                                                                                            <input type="text" value={table.reserved_by || ''} placeholder={lang === 'es' ? "ej. Familia Pérez" : "e.g. Smith Family"}
                                                                                                onChange={(e) => updateTableDimensions(table.id, { reserved_by: e.target.value || null })}
                                                                                                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="block text-xs font-semibold text-blue-600 mb-1">{lang === 'es' ? 'Fecha y Hora' : 'Date & Time'}</label>
                                                                                            <input type="datetime-local" value={table.reserved_at ? new Date(table.reserved_at).toISOString().slice(0, 16) : ''}
                                                                                                onChange={(e) => updateTableDimensions(table.id, { reserved_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                                                                                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        )}

                                                                        {/* Rotation */}
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{lang === 'es' ? 'Rotación (Grados)' : 'Rotation (Degrees)'}</label>
                                                                            <div className="flex gap-2">
                                                                                <input type="range" min="0" max="360" step="15" value={table.rotation || 0}
                                                                                    onChange={(e) => updateTableDimensions(table.id, { rotation: parseInt(e.target.value) })}
                                                                                    className="flex-1 accent-primary-500" />
                                                                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded w-12 text-center text-gray-600">{table.rotation || 0}°</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            <div>
                                                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{lang === 'es' ? 'Ancho (px)' : 'Width (px)'}</label>
                                                                                <input type="number" min="10" step="10" value={table.width}
                                                                                    onChange={(e) => updateTableDimensions(table.id, { width: parseInt(e.target.value) || table.width })}
                                                                                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{lang === 'es' ? 'Alto (px)' : 'Height (px)'}</label>
                                                                                <input type="number" min="10" step="10" value={table.height}
                                                                                    onChange={(e) => updateTableDimensions(table.id, { height: parseInt(e.target.value) || table.height })}
                                                                                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                                            </div>
                                                                        </div>

                                                                        {/* Delete button */}
                                                                        <button onClick={() => { deleteTable(table.id); setSelectedTableId(null); }}
                                                                            className="w-full mt-2 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition">
                                                                            {isWall ? t('tables.delete_wall', lang) : t('tables.delete_table', lang)}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}

                                                    {/* Zone Management */}
                                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
                                                        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{t('tables.manage_zones', lang)}</h3>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                                            {lang === 'es' ? 'Cree zonas y personalice el fondo del plano para cada una.' : 'Create zones and customize the floor plan background for each.'}
                                                        </p>

                                                        <div className="flex gap-2 mb-4">
                                                            <input type="text" value={newZoneName} onChange={e => setNewZoneName(e.target.value)}
                                                                onKeyDown={e => e.key === 'Enter' && addZone()}
                                                                placeholder={lang === 'es' ? "Nueva zona..." : "New zone name..."}
                                                                className="flex-1 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100" />
                                                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl px-2">
                                                                <input type="color" value={newZoneColor} onChange={e => setNewZoneColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                                                            </div>
                                                            <button onClick={addZone} disabled={!newZoneName.trim()} className="bg-primary-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary-700 transition disabled:opacity-40">+</button>
                                                        </div>

                                                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                                            {zones.map((z: any) => {
                                                                const zoneBg = zoneBackgrounds[z.id] || zoneBackgrounds[z.name] || z.background_url || '';
                                                                const isExpanded = editingZoneBgId === z.id;
                                                                const isUploading = uploadingZoneId === z.id;

                                                                return (
                                                                    <div key={z.id} className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 p-3 transition">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: z.color }}></span>
                                                                                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{z.name}</span>
                                                                                <span className="text-xs text-gray-400">({tables.filter((t: any) => t.zone === z.name).length})</span>
                                                                                {zoneBg && <span className="text-xs" title={lang === 'es' ? 'Fondo configurado' : 'Background set'}>🖼️</span>}
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <button
                                                                                    onClick={() => setEditingZoneBgId(isExpanded ? null : z.id)}
                                                                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${isExpanded ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 border border-gray-200 dark:border-slate-700'}`}
                                                                                >
                                                                                    <span>🖼️</span> {isExpanded ? (lang === 'es' ? 'Cerrar' : 'Close') : (lang === 'es' ? 'Fondo' : 'Background')}
                                                                                </button>
                                                                                <button onClick={() => deleteZone(z.id)} className="text-red-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50 text-xs">✕</button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Expandable Zone Background Editor */}
                                                                        {isExpanded && (
                                                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700 space-y-2.5">
                                                                                <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                                                    <span>{lang === 'es' ? 'Fondo del Plano de esta Zona:' : 'Zone Floor Plan Background:'}</span>
                                                                                    {zoneBg && (
                                                                                        <button
                                                                                            onClick={() => saveZoneBackground(z.id, '')}
                                                                                            className="text-red-500 hover:underline text-[11px]"
                                                                                        >
                                                                                            {lang === 'es' ? 'Quitar Fondo' : 'Remove Background'}
                                                                                        </button>
                                                                                    )}
                                                                                </div>

                                                                                {zoneBg ? (
                                                                                    <div className="relative rounded-lg overflow-hidden border border-gray-300 dark:border-slate-700 h-24 group">
                                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                        <img src={zoneBg} alt="Zone map background" className="w-full h-full object-cover" />
                                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                                                                            <button
                                                                                                onClick={() => setFloorZoneFilter(z.name)}
                                                                                                className="bg-white/90 text-gray-900 text-xs font-bold px-2.5 py-1 rounded shadow"
                                                                                            >
                                                                                                {lang === 'es' ? 'Ver en Plano' : 'View on Map'}
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-center py-3 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-gray-300 dark:border-slate-700 text-xs text-gray-400">
                                                                                        {lang === 'es' ? 'Sin fondo específico (usa cuadrícula/fondo general)' : 'No custom background (uses global/grid)'}
                                                                                    </div>
                                                                                )}

                                                                                {/* File Upload Button */}
                                                                                <div className="flex gap-2 items-center">
                                                                                    <label className={`flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 rounded-lg py-1.5 px-3 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300 transition ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                                                        <input
                                                                                            type="file"
                                                                                            accept="image/*"
                                                                                            className="hidden"
                                                                                            onChange={(e) => {
                                                                                                const file = e.target.files?.[0];
                                                                                                if (file) handleZoneBgUpload(z.id, file);
                                                                                            }}
                                                                                        />
                                                                                        <span>{isUploading ? '⏳' : '📁'}</span>
                                                                                        <span>{isUploading ? (lang === 'es' ? 'Subiendo...' : 'Uploading...') : (lang === 'es' ? 'Subir Imagen' : 'Upload Image')}</span>
                                                                                    </label>
                                                                                </div>

                                                                                {/* URL Input */}
                                                                                <div className="flex gap-1.5">
                                                                                    <input
                                                                                        type="url"
                                                                                        value={zoneUrlInputs[z.id] !== undefined ? zoneUrlInputs[z.id] : (zoneBg || '')}
                                                                                        onChange={e => setZoneUrlInputs({ ...zoneUrlInputs, [z.id]: e.target.value })}
                                                                                        placeholder="https://.../map.jpg"
                                                                                        className="flex-1 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            const val = zoneUrlInputs[z.id] !== undefined ? zoneUrlInputs[z.id] : zoneBg;
                                                                                            saveZoneBackground(z.id, val.trim());
                                                                                        }}
                                                                                        className="bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-900 transition"
                                                                                    >
                                                                                        {lang === 'es' ? 'OK' : 'Set'}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Elements List */}
                                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm flex-1">
                                                        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">{t('tables.elements_list', lang)}</h3>
                                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                                            {tables.length === 0 ? (
                                                                <p className="text-sm text-gray-400">{lang === 'es' ? 'No hay elementos en el plano todavía.' : 'No layout elements added yet.'}</p>
                                                            ) : (
                                                                tables.filter((t: any) => floorZoneFilter === 'all' || t.zone === floorZoneFilter || t.shape === 'wall').map((table: any) => {
                                                                    const zoneObj = zones.find((z: any) => z.name === table.zone);
                                                                    return (
                                                                        <div key={table.id} onClick={() => setSelectedTableId(table.id)}
                                                                            className={`flex items-center justify-between text-sm py-2 px-3 rounded-lg border cursor-pointer transition-colors
                                                                                ${selectedTableId === table.id ? 'bg-primary-50 border-primary-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}>
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <span>{table.shape === 'wall' ? '🧱' : '🪑'}</span>
                                                                                <span className="font-medium text-gray-700 truncate">{table.name}</span>
                                                                                {table.shape !== 'wall' && (
                                                                                    <>
                                                                                        {zoneObj && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: zoneObj.color }}></span>}
                                                                                        <span className="text-xs text-gray-400 flex-shrink-0">👥{table.capacity || 4}</span>
                                                                                        <span className={`text-xs font-bold flex-shrink-0 ${
                                                                                            table.status === 'occupied' ? 'text-amber-600' :
                                                                                            table.status === 'reserved' ? 'text-blue-600' :
                                                                                            table.status === 'unavailable' ? 'text-gray-400' : 'text-emerald-600'
                                                                                        }`}>{lang === 'es' ? (table.status === 'occupied' ? 'OCUPADA' : table.status === 'reserved' ? 'RESERVADA' : table.status === 'unavailable' ? 'NO DISP.' : 'DISPONIBLE') : (table.status || 'available').toUpperCase()}</span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                            <button onClick={(e) => { e.stopPropagation(); deleteTable(table.id); }}
                                                                                className="text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50 text-xs flex-shrink-0">✕</button>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            
        </>
    );
}
