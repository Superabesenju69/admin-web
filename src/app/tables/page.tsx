'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TablesPage() {
    const [tableServiceEnabled, setTableServiceEnabled] = useState(false);
    const [tables, setTables] = useState<any[]>([]);
    const [newTableName, setNewTableName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            const { data: settings } = await supabase.from('restaurant_settings').select('*').single();
            if (settings) setTableServiceEnabled(settings.enable_table_service);

            const { data: tableData } = await supabase.from('tables').select('*').order('name');
            setTables(tableData || []);
            setLoading(false);
        }
        load();
    }, []);

    async function toggleTableService() {
        setSaving(true);
        const newVal = !tableServiceEnabled;
        await supabase.from('restaurant_settings').update({ enable_table_service: newVal }).not('id', 'is', null);
        setTableServiceEnabled(newVal);
        setSaving(false);
    }

    async function addTable() {
        if (!newTableName.trim()) return;
        const { data } = await supabase.from('tables').insert([{ name: newTableName.trim() }]).select().single();
        if (data) setTables(prev => [...prev, data]);
        setNewTableName('');
    }

    async function deleteTable(id: string) {
        await supabase.from('tables').delete().eq('id', id);
        setTables(prev => prev.filter(t => t.id !== id));
    }

    if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-black text-gray-900 mb-8">Restaurant Settings</h1>

                {/* Table Service Toggle */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Table Service Module</h2>
                            <p className="text-gray-500 text-sm mt-1">Enable dine-in tables and order tracking.</p>
                        </div>
                        <button
                            onClick={toggleTableService}
                            disabled={saving}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${tableServiceEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${tableServiceEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Tables Management */}
                {tableServiceEnabled && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Tables</h2>

                        {/* Add new table */}
                        <div className="flex gap-3 mb-6">
                            <input
                                type="text"
                                value={newTableName}
                                onChange={e => setNewTableName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addTable()}
                                placeholder="Table name (e.g. Table 1, Bar, Patio)"
                                className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={addTable}
                                className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition"
                            >
                                + Add Table
                            </button>
                        </div>

                        {/* Table list */}
                        {tables.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">No tables yet. Add one above.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {tables.map(table => (
                                    <div key={table.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">{table.name}</p>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${table.status === 'occupied' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                {table.status}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => deleteTable(table.id)}
                                            className="text-red-400 hover:text-red-600 text-sm font-bold ml-4"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
