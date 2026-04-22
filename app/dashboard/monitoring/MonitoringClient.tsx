'use client';

import React, { useState } from 'react';
import { Activity, Phone, Clock, Star, MapPin, CheckCircle, X, MessageSquare, AlertTriangle, Loader2, ExternalLink, ChevronDown } from 'lucide-react';
import { markFollowupDone, updateProspectNotes } from '@/lib/actions/monitoring';
import { generateWaLink } from '@/lib/actions/settings';
import { toast } from 'react-hot-toast';

const STAGE_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
    sent:        { label: 'Terkirim',   dot: 'bg-zinc-400',   badge: 'bg-zinc-800 text-zinc-300' },
    clicked:     { label: 'Klik Link',  dot: 'bg-blue-400',   badge: 'bg-blue-500/20 text-blue-400' },
    qualified:   { label: 'Hot Lead',   dot: 'bg-amber-400',  badge: 'bg-amber-500/20 text-amber-400' },
    closed_lost: { label: 'Tidak Aktif',dot: 'bg-red-500',    badge: 'bg-red-500/10 text-red-400' },
};

type Lead = {
    id: string; name: string; category: string; city: string;
    wa: string | null; slug: string | null;
    followupStage: string; followupCount: number;
    lastContactAt: string | null; nextFollowupAt: string | null;
    linkClickedAt: string | null; qualifiedAt: string | null;
    totalTimeOnPage: number; prospectNotes: string | null;
};

const isOverdue = (d: string | null) => d && new Date(d) <= new Date();
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (seconds: number) => seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;

export default function MonitoringClient({ initialLeads, stats }: { initialLeads: Lead[]; stats: any }) {
    const [leads, setLeads] = useState<Lead[]>(initialLeads);
    const [filter, setFilter] = useState('all');
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [editNoteId, setEditNoteId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');

    const filteredLeads = leads.filter(l => {
        if (filter === 'hot') return l.followupStage === 'qualified';
        if (filter === 'clicked') return l.followupStage === 'clicked';
        if (filter === 'due') return isOverdue(l.nextFollowupAt) && l.followupStage !== 'closed_lost';
        if (filter === 'closed') return l.followupStage === 'closed_lost';
        return true;
    });

    const handleFU = async (lead: Lead) => {
        setLoadingId(lead.id);
        const res = await markFollowupDone(lead.id);
        if (res.success) {
            toast.success(res.isLastFollowup ? 'Follow up terakhir tercatat. Lead ditutup.' : 'Follow up dicatat, jadwal berikutnya diperbarui.');
            setLeads(prev => prev.map(l => l.id === lead.id ? {
                ...l,
                followupCount: l.followupCount + 1,
                followupStage: res.isLastFollowup ? 'closed_lost' : l.followupStage,
                lastContactAt: new Date().toISOString(),
            } : l));
        }
        setLoadingId(null);
    };

    const handleOpenWA = async (lead: Lead) => {
        if (!lead.wa) { toast.error('Nomor WA tidak ada'); return; }
        const t = toast.loading('Menyiapkan pesan...');
        const res = await generateWaLink(lead.id);
        if (res.success) {
            toast.dismiss(t);
            window.open(res.url, '_blank');
        } else {
            toast.error('Gagal generate WA link', { id: t });
        }
    };

    const handleSaveNote = async (leadId: string) => {
        await updateProspectNotes(leadId, noteText);
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, prospectNotes: noteText } : l));
        setEditNoteId(null);
        toast.success('Catatan tersimpan');
    };

    const statCards = [
        { label: 'Total Monitoring', val: stats?.total ?? 0, color: 'text-white' },
        { label: 'Sudah Klik Link', val: stats?.clicked ?? 0, color: 'text-blue-400' },
        { label: 'Hot Leads', val: stats?.qualified ?? 0, color: 'text-amber-400' },
        { label: 'FU Jatuh Tempo', val: stats?.dueToday ?? 0, color: 'text-red-400' },
    ];

    return (
        <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 bg-premium-800/20 p-6 rounded-3xl border border-white/5">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                    <Activity className="text-emerald-400" size={22} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Monitoring</h1>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Lead Engagement Tracker — Post Outreach</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {statCards.map(s => (
                    <div key={s.label} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-center">
                        <div className={`text-3xl font-black ${s.color}`}>{s.val}</div>
                        <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Hot Leads Banner */}
            {(stats?.qualified > 0) && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <Star size={16} className="text-amber-400 shrink-0" />
                    <p className="text-amber-300 text-sm font-bold">
                        Ada <span className="text-amber-400 font-black">{stats.qualified} leads</span> yang sudah membuka website kamu lebih dari 10 detik. Hubungi mereka sekarang.
                    </p>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit flex-wrap">
                {[
                    { key: 'all', label: 'Semua' },
                    { key: 'hot', label: '🔥 Hot' },
                    { key: 'clicked', label: '👆 Klik Link' },
                    { key: 'due', label: '⏰ Jatuh Tempo' },
                    { key: 'closed', label: '❌ Tutup' },
                ].map(t => (
                    <button key={t.key} onClick={() => setFilter(t.key)}
                        className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === t.key ? 'bg-accent-gold text-black' : 'text-white/40 hover:text-white'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Lead Table */}
            {filteredLeads.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-zinc-800 rounded-3xl">
                    <Activity size={36} className="mx-auto text-white/10 mb-3" />
                    <p className="text-white/30 font-bold">Tidak ada data untuk filter ini.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredLeads.map(lead => {
                        const stg = STAGE_CONFIG[lead.followupStage] || STAGE_CONFIG.sent;
                        const overdue = isOverdue(lead.nextFollowupAt) && lead.followupStage !== 'closed_lost';
                        return (
                            <div key={lead.id} className={`bg-zinc-900/60 border rounded-2xl p-5 transition-all ${overdue ? 'border-red-500/30' : 'border-zinc-800'}`}>
                                <div className="flex items-start gap-4">
                                    {/* Status Dot */}
                                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${stg.dot}`} />

                                    {/* Main Info */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <p className="text-white font-bold text-sm">{lead.name}</p>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stg.badge}`}>{stg.label}</span>
                                            {overdue && <span className="text-[10px] font-black text-red-400 flex items-center gap-1"><AlertTriangle size={9} /> Jatuh Tempo</span>}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-white/40 flex-wrap">
                                            <span className="flex items-center gap-1"><MapPin size={10} />{lead.city}</span>
                                            <span>{lead.category}</span>
                                            <span className="flex items-center gap-1"><Clock size={10} />FU ke-{lead.followupCount}</span>
                                            {lead.totalTimeOnPage > 0 && (
                                                <span className="flex items-center gap-1 text-blue-400"><Star size={10} />Baca {fmtTime(lead.totalTimeOnPage)}</span>
                                            )}
                                            {lead.nextFollowupAt && lead.followupStage !== 'closed_lost' && (
                                                <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : 'text-white/30'}`}>
                                                    <Clock size={10} />FU berikutnya: {fmtDate(lead.nextFollowupAt)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Notes */}
                                        {editNoteId === lead.id ? (
                                            <div className="flex gap-2 mt-2">
                                                <input
                                                    autoFocus
                                                    value={noteText}
                                                    onChange={e => setNoteText(e.target.value)}
                                                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-accent-gold/50"
                                                    placeholder="Tulis catatan..."
                                                    onKeyDown={e => e.key === 'Enter' && handleSaveNote(lead.id)}
                                                />
                                                <button onClick={() => handleSaveNote(lead.id)} className="px-3 py-1.5 bg-accent-gold text-black rounded-xl text-xs font-black">Simpan</button>
                                                <button onClick={() => setEditNoteId(null)} className="px-3 py-1.5 text-white/30 hover:text-white rounded-xl text-xs"><X size={12} /></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => { setEditNoteId(lead.id); setNoteText(lead.prospectNotes || ''); }}
                                                className="flex items-center gap-1.5 text-[10px] text-white/20 hover:text-accent-gold transition-colors mt-1">
                                                <MessageSquare size={10} />
                                                {lead.prospectNotes || 'Tambah catatan...'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {lead.slug && (
                                            <button onClick={() => window.open(`/${lead.slug}`, '_blank')}
                                                className="h-9 w-9 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center transition-all" title="Buka Website">
                                                <ExternalLink size={13} className="text-white/40" />
                                            </button>
                                        )}
                                        {lead.wa && lead.followupStage !== 'closed_lost' && (
                                            <button onClick={() => handleOpenWA(lead)}
                                                className="h-9 px-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all">
                                                <Phone size={11} /> WA
                                            </button>
                                        )}
                                        {lead.followupStage !== 'closed_lost' && (
                                            <button onClick={() => handleFU(lead)} disabled={loadingId === lead.id}
                                                className="h-9 px-3 bg-accent-gold/10 border border-accent-gold/30 text-accent-gold hover:bg-accent-gold/20 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all disabled:opacity-50">
                                                {loadingId === lead.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                                                Catat FU
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
