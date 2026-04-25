'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, RefreshCw, Trash2, Database, Search, ChevronLeft, ChevronRight, X, Save } from 'lucide-react';

// ============================================================
// TAB CONFIG — Tambah tabel baru cukup tambah entry di sini
// ============================================================
type ColumnType = 'text' | 'textarea' | 'select' | 'date' | 'boolean';
interface Column {
    key: string;
    label: string;
    editable: boolean;
    type: ColumnType;
    options?: string[];
    width?: string;
}
interface TabConfig {
    id: string;
    label: string;
    icon: string;
    columns: Column[];
    filters: { key: string; label: string; options: string[] }[];
    readOnly?: boolean;
}

const TABS: TabConfig[] = [
    {
        id: 'lead', label: 'Leads', icon: '🎯',
        columns: [
            { key: 'name',          label: 'Bisnis',    editable: true,  type: 'text',     width: 'min-w-[200px]' },
            { key: 'wa',            label: 'WA',        editable: true,  type: 'text',     width: 'min-w-[150px]' },
            { key: 'category',      label: 'Kategori',  editable: true,  type: 'text',     width: 'min-w-[150px]' },
            { key: 'city',          label: 'Kota',      editable: true,  type: 'text',     width: 'min-w-[120px]' },
            { key: 'status',        label: 'Status',    editable: true,  type: 'select',   options: ['FRESH','ENRICHED','READY','LIVE','FINISH'] },
            { key: 'blastStatus',   label: 'Blast',     editable: true,  type: 'select',   options: ['','PENDING','BAIT_SENT','REPLIED','SENT','FAILED','SCHEDULED'] },
            { key: 'baitDraft',     label: 'Bait',      editable: true,  type: 'textarea', width: 'min-w-[250px]' },
            { key: 'outreachDraft', label: 'Outreach',  editable: true,  type: 'textarea', width: 'min-w-[250px]' },
            { key: 'slug',          label: 'Slug',      editable: true,  type: 'text',     width: 'min-w-[150px]' },
            { key: 'ig',            label: 'Instagram', editable: true,  type: 'text',     width: 'min-w-[130px]' },
            { key: 'lastLog',       label: 'Last Log',  editable: false, type: 'text',     width: 'min-w-[180px]' },
            { key: 'createdAt',     label: 'Dibuat',    editable: false, type: 'date' },
        ],
        filters: [
            { key: 'status',      label: 'Status',      options: ['FRESH','ENRICHED','READY','LIVE','FINISH'] },
            { key: 'blastStatus', label: 'Blast Status', options: ['PENDING','BAIT_SENT','REPLIED','SENT','FAILED','SCHEDULED'] },
        ]
    },
    {
        id: 'user', label: 'Users', icon: '👤',
        columns: [
            { key: 'name',       label: 'Nama',       editable: true,  type: 'text',   width: 'min-w-[150px]' },
            { key: 'email',      label: 'Email',      editable: false, type: 'text',   width: 'min-w-[200px]' },
            { key: 'isApproved', label: 'Approved',   editable: true,  type: 'select', options: ['true','false'] },
            { key: 'aiEngine',   label: 'AI Engine',  editable: true,  type: 'text',   width: 'min-w-[150px]' },
            { key: 'kieAiApiKey',label: 'API Key',    editable: true,  type: 'text',   width: 'min-w-[200px]' },
            { key: 'createdAt',  label: 'Dibuat',     editable: false, type: 'date' },
        ],
        filters: [
            { key: 'isApproved', label: 'Approved', options: ['true','false'] }
        ]
    },
    {
        id: 'watemplate', label: 'WA Templates', icon: '💬',
        columns: [
            { key: 'title',     label: 'Judul',    editable: true, type: 'text',     width: 'min-w-[150px]' },
            { key: 'category',  label: 'Kategori', editable: true, type: 'text',     width: 'min-w-[120px]' },
            { key: 'content',   label: 'Konten',   editable: true, type: 'textarea', width: 'min-w-[300px]' },
            { key: 'isDefault', label: 'Default',  editable: true, type: 'select',   options: ['true','false'] },
        ],
        filters: []
    },
    {
        id: 'systemprompt', label: 'System Prompts', icon: '🤖',
        columns: [
            { key: 'name',      label: 'Nama',    editable: false, type: 'text',     width: 'min-w-[180px]' },
            { key: 'content',   label: 'Prompt',  editable: true,  type: 'textarea', width: 'min-w-[400px]' },
            { key: 'updatedAt', label: 'Updated', editable: false, type: 'date' },
        ],
        filters: []
    },
    {
        id: 'leadsandbox', label: 'Sandbox', icon: '🧪',
        columns: [
            { key: 'name',      label: 'Nama',    editable: true,  type: 'text', width: 'min-w-[180px]' },
            { key: 'wa',        label: 'WA',      editable: true,  type: 'text', width: 'min-w-[140px]' },
            { key: 'category',  label: 'Kategori',editable: true,  type: 'text', width: 'min-w-[140px]' },
            { key: 'reason',    label: 'Alasan',  editable: true,  type: 'text', width: 'min-w-[200px]' },
            { key: 'createdAt', label: 'Dibuat',  editable: false, type: 'date' },
        ],
        filters: []
    },
    {
        id: 'activitylog', label: 'Activity Log', icon: '📋',
        readOnly: true,
        columns: [
            { key: 'action',      label: 'Action',  editable: false, type: 'text', width: 'min-w-[120px]' },
            { key: 'description', label: 'Desc',    editable: false, type: 'text', width: 'min-w-[250px]' },
            { key: 'prospectId',  label: 'Lead ID', editable: false, type: 'text', width: 'min-w-[180px]' },
            { key: 'createdAt',   label: 'Waktu',   editable: false, type: 'date' },
        ],
        filters: []
    },
    {
        id: 'b2bdeal', label: 'B2B Deals', icon: '🤝',
        columns: [
            { key: 'categoryLink', label: 'Link',   editable: true, type: 'text',   width: 'min-w-[200px]' },
            { key: 'status',       label: 'Status', editable: true, type: 'select', options: ['DISCOVERED','VERIFIED','INTRODUCED','NEGOTIATING','CLOSED'] },
            { key: 'dealValue',    label: 'Value',  editable: true, type: 'text',   width: 'min-w-[100px]' },
            { key: 'notes',        label: 'Notes',  editable: true, type: 'textarea',width: 'min-w-[200px]' },
            { key: 'createdAt',    label: 'Dibuat', editable: false, type: 'date' },
        ],
        filters: [
            { key: 'status', label: 'Status', options: ['DISCOVERED','VERIFIED','INTRODUCED','NEGOTIATING','CLOSED'] }
        ]
    },
];

// ============================================================
// HELPER: Textarea Modal for long text editing
// ============================================================
function TextareaModal({ value, onSave, onClose }: { value: string; onSave: (v: string) => void; onClose: () => void }) {
    const [text, setText] = useState(value || '');
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Edit Field</h3>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={18} /></button>
                </div>
                <textarea
                    autoFocus
                    value={text}
                    onChange={e => setText(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-accent-gold/50 min-h-[200px] resize-none"
                />
                <div className="flex gap-3 mt-4">
                    <button onClick={() => { onSave(text); onClose(); }}
                        className="flex items-center gap-2 px-6 py-3 bg-accent-gold text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-yellow-400 transition-all">
                        <Save size={14} /> Simpan
                    </button>
                    <button onClick={onClose}
                        className="px-6 py-3 bg-white/5 text-white/60 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// HELPER: Format cell display value
// ============================================================
function formatCellValue(value: any, type: ColumnType): string {
    if (value == null || value === '') return '—';
    if (type === 'date') return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    if (type === 'boolean') return value ? '✅' : '❌';
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 60) + '...';
    const str = String(value);
    if ((type === 'textarea' || type === 'text') && str.length > 80) return str.slice(0, 80) + '…';
    return str;
}

// ============================================================
// STATUS BADGE COLORS
// ============================================================
const STATUS_COLORS: Record<string, string> = {
    FRESH: 'bg-blue-500/20 text-blue-400',
    ENRICHED: 'bg-purple-500/20 text-purple-400',
    READY: 'bg-yellow-500/20 text-yellow-400',
    LIVE: 'bg-green-500/20 text-green-400',
    FINISH: 'bg-zinc-500/20 text-zinc-400',
    BAIT_SENT: 'bg-orange-500/20 text-orange-400',
    REPLIED: 'bg-emerald-500/20 text-emerald-400',
    SENT: 'bg-cyan-500/20 text-cyan-400',
    FAILED: 'bg-red-500/20 text-red-400',
    PENDING: 'bg-zinc-500/20 text-zinc-400',
    SCHEDULED: 'bg-indigo-500/20 text-indigo-400',
};

// ============================================================
// MAIN PAGE
// ============================================================
export default function LocalEditorPage() {
    const [activeTab, setActiveTab] = useState('lead');
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<Set<string>>(new Set());
    const [modal, setModal] = useState<{ rowId: string; field: string; value: string } | null>(null);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const tab = TABS.find(t => t.id === activeTab)!;
    const totalPages = Math.ceil(total / 50);

    // ── Fetch data ──────────────────────────────────────────
    const fetchData = useCallback(async (p = page) => {
        setLoading(true);
        const params = new URLSearchParams({ model: activeTab, page: String(p), search });
        Object.entries(filters).forEach(([k, v]) => { if (v) params.append(`filter[${k}]`, v); });
        try {
            const res = await fetch(`/api/local-editor?${params}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setData(json.data || []);
            setTotal(json.total || 0);
            setPage(p);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }, [activeTab, search, filters, page]);

    // Re-fetch when tab/filter changes
    useEffect(() => { fetchData(1); }, [activeTab, filters]);

    // Search debounce
    const handleSearchChange = (val: string) => {
        setSearch(val);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => fetchData(1), 500);
    };

    // Tab switch
    const handleTabChange = (id: string) => {
        setActiveTab(id);
        setSearch('');
        setFilters({});
        setPage(1);
    };

    // ── Inline Update ────────────────────────────────────────
    const handleUpdate = async (rowId: string, field: string, value: string) => {
        const key = `${rowId}-${field}`;
        setSaving(prev => new Set(prev).add(key));
        try {
            const res = await fetch('/api/local-editor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: activeTab, id: rowId, field, value })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            // Optimistic update
            setData(prev => prev.map(row => row.id === rowId ? { ...row, [field]: value } : row));
            toast.success('Tersimpan', { duration: 1000 });
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(prev => { const s = new Set(prev); s.delete(key); return s; });
        }
    };

    // ── Delete ───────────────────────────────────────────────
    const handleDelete = async (rowId: string, label: string) => {
        if (!confirm(`Hapus "${label}"? Tindakan ini tidak bisa dibatalkan.`)) return;
        try {
            const res = await fetch('/api/local-editor', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: activeTab, id: rowId })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setData(prev => prev.filter(r => r.id !== rowId));
            setTotal(prev => prev - 1);
            toast.success('Dihapus');
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    // ── Render Cell ──────────────────────────────────────────
    const renderCell = (row: any, col: Column) => {
        const val = row[col.key];
        const key = `${row.id}-${col.key}`;
        const isSaving = saving.has(key);

        if (!col.editable || tab.readOnly) {
            const display = formatCellValue(val, col.type);
            const colorClass = STATUS_COLORS[val] || '';
            return (
                <span className={`text-xs px-2 py-1 rounded-lg ${colorClass || 'text-white/60'}`}>
                    {display}
                </span>
            );
        }

        if (col.type === 'select') {
            return (
                <select
                    defaultValue={val ?? ''}
                    onChange={e => handleUpdate(row.id, col.key, e.target.value)}
                    disabled={isSaving}
                    className={`text-xs font-bold uppercase bg-zinc-800 border border-transparent focus:border-accent-gold/40 rounded-xl px-3 py-1.5 outline-none transition-all max-w-[140px] ${STATUS_COLORS[val] || 'text-white/70'}`}
                >
                    {col.options!.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                </select>
            );
        }

        if (col.type === 'textarea') {
            const preview = val ? String(val).slice(0, 60) + (val.length > 60 ? '…' : '') : '—';
            return (
                <button
                    onClick={() => setModal({ rowId: row.id, field: col.key, value: val || '' })}
                    className="text-left text-xs text-white/50 hover:text-white hover:bg-white/5 rounded-xl px-2 py-1 transition-all max-w-[220px] truncate border border-transparent hover:border-white/10"
                >
                    {preview}
                </button>
            );
        }

        return (
            <div className="relative group">
                <input
                    defaultValue={val ?? ''}
                    onBlur={e => e.target.value !== (val ?? '') && handleUpdate(row.id, col.key, e.target.value)}
                    disabled={isSaving}
                    className="w-full bg-transparent text-xs text-white/80 px-2 py-1.5 rounded-xl border border-transparent focus:border-accent-gold/40 focus:bg-white/5 outline-none transition-all"
                />
                {isSaving && <Loader2 size={12} className="absolute right-2 top-2 animate-spin text-accent-gold" />}
            </div>
        );
    };

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="min-h-screen bg-black text-white">
            {/* Textarea Modal */}
            {modal && (
                <TextareaModal
                    value={modal.value}
                    onSave={v => handleUpdate(modal.rowId, modal.field, v)}
                    onClose={() => setModal(null)}
                />
            )}

            <div className="p-6 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/30">
                            <Database className="text-red-500" size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tighter">Local DB Editor</h1>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">⚠️ Owner Only · Bypasses all UI Logic</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-white/30 font-mono">{total} rows</span>
                        <button onClick={() => fetchData(page)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest">
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl border border-white/5 w-fit mb-6 flex-wrap">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => handleTabChange(t.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                                activeTab === t.id
                                    ? 'bg-red-600 text-white shadow-lg'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}>
                            <span>{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Search & Filter Bar */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <div className="relative flex-1 max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            value={search}
                            onChange={e => handleSearchChange(e.target.value)}
                            placeholder="Cari..."
                            className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-accent-gold/40 transition-all"
                        />
                        {search && (
                            <button onClick={() => { setSearch(''); fetchData(1); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    {tab.filters.map(f => (
                        <select key={f.key}
                            value={filters[f.key] || ''}
                            onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                            className="px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-accent-gold/40 transition-all">
                            <option value="">All {f.label}</option>
                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    ))}
                </div>

                {/* Table */}
                <div className="border border-white/5 rounded-3xl bg-zinc-950/60 overflow-hidden">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-48 gap-3">
                                <Loader2 className="animate-spin text-red-500" size={24} />
                                <span className="text-xs font-black uppercase tracking-widest text-white/30">Loading...</span>
                            </div>
                        ) : data.length === 0 ? (
                            <div className="flex items-center justify-center h-48 text-white/20 text-sm font-bold">
                                Tidak ada data ditemukan
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-zinc-900/80">
                                        {tab.columns.map(col => (
                                            <th key={col.key} className="p-3 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">
                                                {col.label}
                                            </th>
                                        ))}
                                        {!tab.readOnly && (
                                            <th className="p-3 text-[10px] font-black uppercase tracking-widest text-white/30">Hapus</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map(row => (
                                        <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                                            {tab.columns.map(col => (
                                                <td key={col.key} className={`p-2 ${col.width || ''}`}>
                                                    {renderCell(row, col)}
                                                </td>
                                            ))}
                                            {!tab.readOnly && (
                                                <td className="p-2">
                                                    <button
                                                        onClick={() => handleDelete(row.id, row.name || row.title || row.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                            <span className="text-xs text-white/30 font-mono">
                                Page {page} of {totalPages} · {total} total rows
                            </span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => fetchData(page - 1)} disabled={page <= 1}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all">
                                    <ChevronLeft size={14} />
                                </button>
                                <button onClick={() => fetchData(page + 1)} disabled={page >= totalPages}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all">
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
