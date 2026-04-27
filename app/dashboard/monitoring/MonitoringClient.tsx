'use client';

import { useState } from 'react';
import { Activity, Phone, Clock, Star, MapPin, CheckCircle, X, MessageSquare, AlertTriangle, Loader2, ExternalLink, ChevronDown, BarChart2, TrendingUp, ThumbsDown, Sparkles, RefreshCw, Send, CheckSquare, Square } from 'lucide-react';
import { markFollowupDone, updateProspectNotes, markAsDeal, markAsFail, batchMarkAsDeal, batchMarkAsFail } from '@/lib/actions/monitoring';
import { generateFollowUpDraft } from '@/lib/actions/ai';
import { PERSONA_OPTIONS } from '@/lib/prompts';
import { toast } from 'react-hot-toast';


const STAGE_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
    monitoring_1: { label: 'FU 1 (H+3)', dot: 'bg-blue-400',   badge: 'bg-blue-500/20 text-blue-400' },
    monitoring_2: { label: 'FU 2 (H+6)', dot: 'bg-purple-400', badge: 'bg-purple-500/20 text-purple-400' },
    monitoring_3: { label: 'FU 3 (H+14)', dot: 'bg-orange-400', badge: 'bg-orange-500/20 text-orange-400' },
    closed_won:   { label: 'DEAL',       dot: 'bg-green-500',  badge: 'bg-green-500/20 text-green-400' },
    closed_lost:  { label: 'FAIL',       dot: 'bg-red-500',    badge: 'bg-red-500/10 text-red-400' },
};

type Lead = {
    id: string; name: string; category: string; city: string;
    wa: string | null; slug: string | null;
    followupStage: string; followupCount: number;
    lastContactAt: string | null; nextFollowupAt: string | null;
    linkClickedAt: string | null; qualifiedAt: string | null;
    totalTimeOnPage: number; prospectNotes: string | null;
    pendingDraft?: {
        messageText: string;
        waLink: string;
        followupNumber: number;
    } | null;
};

const isOverdue = (d: string | null) => d && new Date(d) <= new Date();
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (seconds: number) => seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;

export default function MonitoringClient({ initialLeads, stats }: { initialLeads: Lead[]; stats: any }) {
    const [leads, setLeads] = useState<Lead[]>(initialLeads);
    const [activeTab, setActiveTab] = useState<'monitoring' | 'deal' | 'fail'>('monitoring');
    const [filter, setFilter] = useState('all');
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [editNoteId, setEditNoteId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');
    const [persona, setPersona] = useState('professional');
    const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
    const [scheduledTimes, setScheduledTimes] = useState<Record<string, string>>({});
    const [isScheduling, setIsScheduling] = useState<string | null>(null);
    
    // Batch Processing State
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [batchScheduleDate, setBatchScheduleDate] = useState<string>('');
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);

    // Batch Processing State
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [batchScheduleDate, setBatchScheduleDate] = useState<string>('');
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);

    const filteredLeads = leads.filter(l => {

        // Tab Filtering
        if (activeTab === 'monitoring') {
            if (!l.followupStage.startsWith('monitoring_')) return false;
        } else if (activeTab === 'deal') {
            if (l.followupStage !== 'closed_won') return false;
        } else if (activeTab === 'fail') {
            if (l.followupStage !== 'closed_lost') return false;
        }

        // Sub Filter inside Monitoring
        if (activeTab === 'monitoring') {
            if (filter === 'hot') return l.totalTimeOnPage > 10;
            if (filter === 'due') return isOverdue(l.nextFollowupAt);
        }
        
        return true;
    });

    // --- Batch Functions ---
    const toggleSelect = (id: string) => {
        setSelectedLeadIds(prev => 
            prev.includes(id) ? prev.filter(lId => lId !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0) {
            setSelectedLeadIds([]);
        } else {
            setSelectedLeadIds(filteredLeads.map(l => l.id));
        }
    };

    const handleBatchDeal = async () => {
        if (!confirm('Pindahkan semua lead terpilih ke Deal?')) return;
        setIsBatchProcessing(true);
        const t = toast.loading('Memproses Deal masal...');
        await batchMarkAsDeal(selectedLeadIds);
        toast.success('Leads dipindahkan ke Deal', { id: t });
        setSelectedLeadIds([]);
        window.location.reload();
    };

    const handleBatchFail = async () => {
        if (!confirm('Pindahkan semua lead terpilih ke Fail?')) return;
        setIsBatchProcessing(true);
        const t = toast.loading('Memproses Fail masal...');
        await batchMarkAsFail(selectedLeadIds);
        toast.success('Leads dipindahkan ke Fail', { id: t });
        setSelectedLeadIds([]);
        window.location.reload();
    };

    const handleBatchSchedule = async () => {
        if (!batchScheduleDate) {
            toast.error("Pilih tanggal awal jadwal dulu bos!");
            return;
        }
        setIsBatchProcessing(true);
        const t = toast.loading("Memulai job penjadwalan masal di background...");
        try {
            const res = await fetch('/api/monitoring/batch-schedule-followup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadIds: selectedLeadIds, baseScheduledAt: batchScheduleDate })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Job penjadwalan berjalan. Silakan tunggu notifikasi.", { id: t });
                setSelectedLeadIds([]);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                toast.error(data.error || "Gagal memulai job", { id: t });
                setIsBatchProcessing(false);
            }
        } catch (e) {
            toast.error("Network Error", { id: t });
            setIsBatchProcessing(false);
        }
    };

    const handleFU = async (lead: Lead) => {
        if (!confirm('Tandai follow-up ini sudah selesai?')) return;
        setLoadingId(lead.id);
        const res = await markFollowupDone(lead.id);
        if (res.success) {
            toast.success('Follow up tercatat. Jadwal berikutnya diperbarui.');
            // Refresh logic - ideally reload page or update state
            window.location.reload();
        }
        setLoadingId(null);
    };

    const handleScheduleFollowup = async (leadId: string, queueId: string, messageText: string) => {
        const scheduledAt = scheduledTimes[leadId];
        if (!scheduledAt) {
            toast.error("Pilih waktu pengiriman dulu bos!");
            return;
        }

        setIsScheduling(leadId);
        const t = toast.loading("Menjadwalkan pengiriman via Fonnte...");
        try {
            const res = await fetch('/api/monitoring/schedule-followup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId, queueId, scheduledAt, messageText })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("FU Berhasil dijadwalkan di server Fonnte!", { id: t });
                // Refresh data
                window.location.reload();
            } else {
                toast.error(data.error || "Gagal menjadwalkan", { id: t });
            }
        } catch (e) {
            toast.error("Network Error", { id: t });
        } finally {
            setIsScheduling(null);
        }
    };

    const handleRegenerateDraft = async (leadId: string, fuNumber: number) => {
        setIsRegenerating(leadId);
        const res = await generateFollowUpDraft(leadId, fuNumber, persona);
        if (res.success) {
            toast.success('Draft diperbarui dengan persona baru!');
            setLeads(prev => prev.map(l => l.id === leadId ? {
                ...l,
                pendingDraft: {
                    messageText: res.draft!,
                    waLink: res.waLink!,
                    followupNumber: fuNumber
                }
            } : l));
        } else {
            toast.error('Gagal memperbarui draft');
        }
        setIsRegenerating(null);
    };

    const handleMoveToDeal = async (id: string) => {
        if (!confirm('Yakin ingin menandai Deal?')) return;
        setLoadingId(id);
        const res = await markAsDeal(id);
        if (res.success) {
            toast.success('Selamat! Lead berhasil ditutup sebagai DEAL.');
            window.location.reload();
        }
        setLoadingId(null);
    };

    const handleMoveToFail = async (id: string) => {
        if (!confirm('Yakin ingin memindahkan ke Fail?')) return;
        setLoadingId(id);
        const res = await markAsFail(id);
        if (res.success) {
            toast.error('Lead dipindahkan ke Fail.');
            window.location.reload();
        }
        setLoadingId(null);
    };

    const handleSaveNote = async (leadId: string) => {
        await updateProspectNotes(leadId, noteText);
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, prospectNotes: noteText } : l));
        setEditNoteId(null);
        toast.success('Catatan tersimpan');
    };

    return (
        <>
        <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}

            <div className="flex items-center gap-4 bg-premium-800/20 p-6 rounded-3xl border border-white/5">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                    <Activity className="text-emerald-400" size={22} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Monitoring CRM</h1>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Lead Engagement & Follow-Up Optimizer</p>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5">
                    <div className="text-3xl font-black text-white">{stats?.total ?? 0}</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Monitoring</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
                    <div className="text-3xl font-black text-emerald-400">{stats?.closedWon ?? 0}</div>
                    <div className="text-[10px] text-emerald-400/40 font-bold uppercase tracking-widest mt-1">Total Deals</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
                    <div className="text-3xl font-black text-red-400">{stats?.closedLost ?? 0}</div>
                    <div className="text-[10px] text-red-400/40 font-bold uppercase tracking-widest mt-1">Total Fails</div>
                </div>
                <div className={`border rounded-2xl p-5 ${stats?.dueToday > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-zinc-900/60 border-white/5'}`}>
                    <div className={`text-3xl font-black ${stats?.dueToday > 0 ? 'text-red-400' : 'text-white'}`}>{stats?.dueToday ?? 0}</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Jatuh Tempo</div>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex gap-4 border-b border-white/10 pb-4">
                <button onClick={() => setActiveTab('monitoring')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'monitoring' ? 'bg-accent-gold text-black' : 'text-white/40 hover:text-white bg-white/5'}`}>
                    <Activity size={14} /> Monitoring
                </button>
                <button onClick={() => setActiveTab('deal')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'deal' ? 'bg-emerald-500 text-black' : 'text-white/40 hover:text-white bg-white/5'}`}>
                    <TrendingUp size={14} /> Deal ({stats?.closedWon ?? 0})
                </button>
                <button onClick={() => setActiveTab('fail')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'fail' ? 'bg-red-500 text-white' : 'text-white/40 hover:text-white bg-white/5'}`}>
                    <ThumbsDown size={14} /> Fail ({stats?.closedLost ?? 0})
                </button>
            </div>

            {activeTab === 'monitoring' && (
                <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit">
                    <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-zinc-700 text-white' : 'text-white/40'}`}>Semua</button>
                    <button onClick={() => setFilter('hot')} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'hot' ? 'bg-amber-500 text-black' : 'text-white/40'}`}>🔥 Hot</button>
                    <button onClick={() => setFilter('due')} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'due' ? 'bg-red-500 text-white' : 'text-white/40'}`}>⏰ Jatuh Tempo</button>
                </div>
            )}

            {/* List */}
            <div className="space-y-4">
                {filteredLeads.length > 0 && (
                    <div className="flex items-center gap-3 px-6 py-2">
                        <button onClick={toggleSelectAll} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                            {selectedLeadIds.length === filteredLeads.length ? <CheckSquare size={14} className="text-accent-gold" /> : <Square size={14} />}
                            Pilih Semua ({filteredLeads.length})
                        </button>
                    </div>
                )}

                {filteredLeads.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-white/10 rounded-[32px]">
                        <Activity className="mx-auto text-white/10 mb-4" size={40} />
                        <p className="text-white/30 font-bold uppercase tracking-widest text-xs">Belum ada data di tab ini.</p>
                    </div>
                ) : (
                    filteredLeads.map(lead => {
                        const stg = STAGE_CONFIG[lead.followupStage] || STAGE_CONFIG.monitoring_1;
                        const overdue = isOverdue(lead.nextFollowupAt) && lead.followupStage.startsWith('monitoring_');
                        const isSelected = selectedLeadIds.includes(lead.id);
                        
                        return (
                            <div key={lead.id} className={`glass bg-zinc-950/40 border p-6 rounded-[32px] transition-all flex flex-col md:flex-row gap-4 ${overdue ? 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-white/5'} ${isSelected ? 'ring-1 ring-accent-gold/50 bg-accent-gold/5' : ''}`}>
                                <div className="pt-2">
                                    <button onClick={() => toggleSelect(lead.id)} className="text-white/40 hover:text-white transition-colors">
                                        {isSelected ? <CheckSquare size={18} className="text-accent-gold" /> : <Square size={18} />}
                                    </button>
                                </div>
                                <div className="flex-1 flex flex-col lg:flex-row gap-6">

                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="text-xl font-bold text-white">{lead.name}</h3>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${stg.badge}`}>{stg.label}</span>
                                            {lead.totalTimeOnPage > 10 && <span className="bg-amber-500 text-black px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">🔥 Hot Lead</span>}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-white/40 flex-wrap">
                                            <span className="flex items-center gap-1"><MapPin size={12} /> {lead.city}</span>
                                            <span className="flex items-center gap-1"><Clock size={12} /> {lead.followupCount}x FU</span>
                                            {lead.nextFollowupAt && activeTab === 'monitoring' && (
                                                <span className={`flex items-center gap-1 font-bold ${overdue ? 'text-red-400' : 'text-white/60'}`}>
                                                    <Clock size={12} /> Jadwal: {fmtDate(lead.nextFollowupAt)}
                                                </span>
                                            )}
                                        </div>

                                        {/* AI Draft Section */}
                                        {lead.pendingDraft && activeTab === 'monitoring' && (
                                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-accent-gold">
                                                        <Sparkles size={14} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                                            {lead.pendingDraft.status === 'scheduled' ? 'Scheduled Follow-Up' : 'AI Next Follow-Up Draft'}
                                                        </span>
                                                        {lead.pendingDraft.status === 'scheduled' && (
                                                            <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase ml-2 animate-pulse">Scheduled</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {lead.pendingDraft.status !== 'scheduled' && (
                                                            <select value={persona} onChange={(e) => setPersona(e.target.value)}
                                                                className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-black uppercase text-white/60 outline-none">
                                                                {PERSONA_OPTIONS.map(opt => (
                                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        {lead.pendingDraft.status !== 'scheduled' && (
                                                            <button 
                                                                disabled={isRegenerating === lead.id}
                                                                onClick={() => handleRegenerateDraft(lead.id, lead.pendingDraft!.followupNumber)}
                                                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 transition-all">
                                                                <RefreshCw size={14} className={isRegenerating === lead.id ? 'animate-spin' : ''} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {lead.pendingDraft.status === 'scheduled' && lead.pendingDraft.scheduledAt && (
                                                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-center gap-3">
                                                        <Clock size={14} className="text-blue-400" />
                                                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                                            Pesan ini akan terkirim otomatis pada: {new Date(lead.pendingDraft.scheduledAt).toLocaleString('id-ID')}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="text-[11px] text-zinc-300 font-mono bg-zinc-900/50 p-4 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed">
                                                    {lead.pendingDraft.messageText}
                                                </div>

                                                {lead.pendingDraft.status !== 'scheduled' && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <button onClick={() => window.open(lead.pendingDraft!.waLink, '_blank')}
                                                            className="h-11 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20">
                                                            <Send size={14} /> Kirim via WhatsApp
                                                        </button>
                                                        
                                                        <div className="flex gap-2">
                                                            <input 
                                                                type="datetime-local" 
                                                                value={scheduledTimes[lead.id] || ''}
                                                                onChange={(e) => setScheduledTimes({ ...scheduledTimes, [lead.id]: e.target.value })}
                                                                className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-accent-gold/50"
                                                            />
                                                            <button 
                                                                disabled={isScheduling === lead.id}
                                                                onClick={() => handleScheduleFollowup(lead.id, lead.pendingDraft!.id, lead.pendingDraft!.messageText)}
                                                                className="px-4 bg-accent-gold hover:bg-yellow-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                                            >
                                                                {isScheduling === lead.id ? <Loader2 size={14} className="animate-spin" /> : 'Jadwalkan'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Notes Section */}
                                        {editNoteId === lead.id ? (
                                            <div className="flex gap-2">
                                                <input autoFocus value={noteText} onChange={e => setNoteText(e.target.value)}
                                                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-accent-gold/50"
                                                    placeholder="Tulis catatan CRM..." />
                                                <button onClick={() => handleSaveNote(lead.id)} className="px-4 py-2 bg-accent-gold text-black rounded-xl text-xs font-black">Save</button>
                                                <button onClick={() => setEditNoteId(null)} className="px-2 text-white/30"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => { setEditNoteId(lead.id); setNoteText(lead.prospectNotes || ''); }}
                                                className="flex items-center gap-2 text-[10px] text-white/20 hover:text-white transition-colors italic">
                                                <MessageSquare size={12} /> {lead.prospectNotes || 'Klik untuk tambah catatan...'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Action Column */}
                                    <div className="flex lg:flex-col items-center justify-center gap-3 shrink-0">
                                        {activeTab === 'monitoring' && (
                                            <>
                                                <button onClick={() => handleFU(lead)} disabled={loadingId === lead.id}
                                                    className="w-full lg:w-32 h-11 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all">
                                                    {loadingId === lead.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Catat FU
                                                </button>
                                                <button onClick={() => handleMoveToDeal(lead.id)}
                                                    className="w-full lg:w-32 h-11 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all">
                                                    <TrendingUp size={14} /> Deal
                                                </button>
                                                <button onClick={() => handleMoveToFail(lead.id)}
                                                    className="w-full lg:w-32 h-11 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all">
                                                    <ThumbsDown size={14} /> Fail
                                                </button>
                                            </>
                                        )}
                                        {lead.slug && (
                                            <button onClick={() => window.open(`/${lead.slug}`, '_blank')}
                                                className="w-full lg:w-32 h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all text-white/40">
                                                <ExternalLink size={14} /> Visit Site
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* Batch Action Bar (Sticky at bottom) */}
        {selectedLeadIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 w-[95vw] md:w-auto">
                <div className="glass bg-zinc-900/90 border border-accent-gold/20 shadow-2xl shadow-accent-gold/10 px-6 py-4 rounded-[32px] flex flex-wrap items-center gap-6 justify-center overflow-hidden">
                    <div className="text-[11px] font-black uppercase tracking-widest text-white/60 whitespace-nowrap">
                        <span className="text-accent-gold mr-1">{selectedLeadIds.length}</span> Terpilih
                    </div>
                    
                    <div className="h-6 w-px bg-white/10 hidden md:block" />

                    <div className="flex gap-2">
                        <button 
                            onClick={handleBatchDeal}
                            disabled={isBatchProcessing}
                            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                        >
                            Tandai Deal
                        </button>
                        <button 
                            onClick={handleBatchFail}
                            disabled={isBatchProcessing}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                        >
                            Tandai Fail
                        </button>
                    </div>

                    <div className="h-6 w-px bg-white/10 hidden md:block" />

                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        <div className="text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Extreme Delay (60-120s)</div>
                        <input 
                            type="datetime-local" 
                            value={batchScheduleDate}
                            onChange={(e) => setBatchScheduleDate(e.target.value)}
                            className="w-full sm:w-auto bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-accent-gold/50"
                        />
                        <button 
                            onClick={handleBatchSchedule}
                            disabled={isBatchProcessing || !batchScheduleDate}
                            className="w-full sm:w-auto px-6 py-2 bg-accent-gold hover:bg-yellow-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-accent-gold/20 disabled:opacity-50 whitespace-nowrap"
                        >
                            {isBatchProcessing ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Jadwalkan Massal'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
    );
}

