'use client';

import React, { useState } from 'react';
import { 
    Globe, ExternalLink, MapPin, Building2, 
    Calendar, Sliders, Send, X, Loader2, Activity,
    LayoutGrid, List, Clock, Star
} from 'lucide-react';
import Link from 'next/link';
import DownloadButton from '@/components/DownloadButton';
import EditPageModal from '@/components/EditPageModal';
import LeadDetailModal from '@/components/LeadDetailModal';
import { sendToMonitoring } from '@/lib/actions/monitoring';
import { toast } from 'react-hot-toast';

interface LiveLead {
    id: string;
    name: string;
    category: string;
    address: string;
    updatedAt: Date | string;
    slug: string | null;
    htmlCode: string | null;
    status: string;
    nextFollowupAt?: string | null;
}

interface LiveClientProps {
    initialLeads: LiveLead[];
    templates: any[];
}

export default function LiveClient({ initialLeads, templates }: LiveClientProps) {
    const [leads, setLeads] = useState(initialLeads);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [editingHtmlLead, setEditingHtmlLead] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [detailLead, setDetailLead] = useState<any>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [sendingId, setSendingId] = useState<string | null>(null);

    // Modal state for notes before sending to monitoring
    const [monitoringModal, setMonitoringModal] = useState<LiveLead | null>(null);
    const [monitoringNote, setMonitoringNote] = useState('');

    const handleSendToMonitoring = async (lead: LiveLead) => {
        setSendingId(lead.id);
        const t = toast.loading(`Memindahkan ${lead.name} ke Monitoring...`);
        const res = await sendToMonitoring(lead.id, monitoringNote || undefined);
        if (res.success) {
            toast.success('Berhasil! Lead masuk ke menu Monitoring.', { id: t });
            // Remove from live list view or mark as already sent
            setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, nextFollowupAt: new Date(Date.now() + 7*24*60*60*1000).toISOString() } : l));
            setMonitoringModal(null);
            setMonitoringNote('');
        } else {
            toast.error('Gagal memindahkan.', { id: t });
        }
        setSendingId(null);
    };

    const notSentLeads = leads.filter(l => !l.nextFollowupAt);
    const sentLeads = leads.filter(l => !!l.nextFollowupAt);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Live Digital Assets</h1>
                    <p className="text-white/40 font-medium italic text-sm">Your fleet of deployed websites, optimized and active.</p>
                </div>
                {/* View Toggle */}
                <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
                    <button onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-accent-gold text-black' : 'text-white/30 hover:text-white'}`}>
                        <LayoutGrid size={16} />
                    </button>
                    <button onClick={() => setViewMode('table')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-accent-gold text-black' : 'text-white/30 hover:text-white'}`}>
                        <List size={16} />
                    </button>
                </div>
            </div>

            {leads.length > 0 ? (
                <div className="space-y-8">
                    {/* Section: Belum Dikirim WA */}
                    {notSentLeads.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                                <Globe size={12} /> Belum Dikirim WA ({notSentLeads.length})
                            </p>
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {notSentLeads.map((lead) => (
                                        <LeadCard key={lead.id} lead={lead}
                                            onOpenDetail={() => { setDetailLead(lead); setIsDetailModalOpen(true); }}
                                            onOpenEdit={() => { setEditingHtmlLead(lead); setIsEditModalOpen(true); }}
                                            onSendToMonitoring={() => setMonitoringModal(lead)}
                                            sending={sendingId === lead.id}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <LeadTable leads={notSentLeads}
                                    onOpenDetail={(l) => { setDetailLead(l); setIsDetailModalOpen(true); }}
                                    onOpenEdit={(l) => { setEditingHtmlLead(l); setIsEditModalOpen(true); }}
                                    onSendToMonitoring={(l) => setMonitoringModal(l)}
                                    sendingId={sendingId}
                                />
                            )}
                        </div>
                    )}

                    {/* Section: Sudah di Monitoring */}
                    {sentLeads.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-widest text-emerald-500/50 flex items-center gap-2">
                                <Activity size={12} /> Sudah di Monitoring ({sentLeads.length})
                            </p>
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                                    {sentLeads.map((lead) => (
                                        <LeadCard key={lead.id} lead={lead}
                                            onOpenDetail={() => { setDetailLead(lead); setIsDetailModalOpen(true); }}
                                            onOpenEdit={() => { setEditingHtmlLead(lead); setIsEditModalOpen(true); }}
                                            onSendToMonitoring={() => setMonitoringModal(lead)}
                                            sending={sendingId === lead.id}
                                            alreadySent
                                        />
                                    ))}
                                </div>
                            ) : (
                                <LeadTable leads={sentLeads}
                                    onOpenDetail={(l) => { setDetailLead(l); setIsDetailModalOpen(true); }}
                                    onOpenEdit={(l) => { setEditingHtmlLead(l); setIsEditModalOpen(true); }}
                                    onSendToMonitoring={(l) => setMonitoringModal(l)}
                                    sendingId={sendingId}
                                    allSent
                                />
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-32 flex flex-col items-center justify-center gap-6 bg-white/[0.02] border border-dashed border-white/10 rounded-[40px] text-center px-6">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                        <Globe className="w-10 h-10 text-white/10" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white/60 uppercase tracking-tighter">No live sites found</h3>
                        <p className="text-sm text-white/30 max-w-sm mx-auto font-medium">
                            Once you forge a website from the Enriched Projects page, it will appear here as a live digital asset.
                        </p>
                    </div>
                    <Link 
                        href="/dashboard/enriched"
                        className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white text-xs font-black rounded-2xl transition-all uppercase tracking-widest"
                    >
                        Go to Enriched Projects
                    </Link>
                </div>
            )}

            {/* Send to Monitoring Modal */}
            {monitoringModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setMonitoringModal(null)} />
                    <div className="relative bg-zinc-950 border border-white/10 rounded-3xl p-8 w-full max-w-md space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                                    <Send size={16} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white">Pindah ke Monitoring</h3>
                                    <p className="text-xs text-white/30">{monitoringModal.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setMonitoringModal(null)} className="p-2 hover:bg-white/5 rounded-xl text-white/30">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-xs text-emerald-400/70 space-y-1">
                            <p>WA pertama dianggap sudah terkirim.</p>
                            <p>Follow up berikutnya otomatis dijadwalkan <strong className="text-emerald-400">7 hari</strong> dari sekarang.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Catatan (Opsional)</label>
                            <textarea
                                value={monitoringNote}
                                onChange={e => setMonitoringNote(e.target.value)}
                                placeholder="Contoh: Bilang lihat nanti, atau sudah ada respon singkat..."
                                rows={3}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 resize-none placeholder:text-white/20"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setMonitoringModal(null)}
                                className="flex-1 py-3 border border-white/10 rounded-2xl text-white/40 hover:text-white text-xs font-black uppercase transition-all">
                                Batal
                            </button>
                            <button onClick={() => handleSendToMonitoring(monitoringModal)}
                                disabled={sendingId === monitoringModal.id}
                                className="flex-1 py-3 bg-emerald-500 text-black font-black text-xs uppercase rounded-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                {sendingId === monitoringModal.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                Konfirmasi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lead Detail Modal */}
            {detailLead && (
                <LeadDetailModal 
                    isOpen={isDetailModalOpen}
                    onClose={() => { setIsDetailModalOpen(false); setDetailLead(null); }}
                    lead={detailLead}
                />
            )}

            {/* Live Edit Modal */}
            {editingHtmlLead && (
                <EditPageModal 
                    isOpen={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setEditingHtmlLead(null); }}
                    lead={editingHtmlLead}
                />
            )}
        </div>
    );
}

// ─── Lead Card Component ─────────────────────────────────────────────────────
function LeadCard({ lead, onOpenDetail, onOpenEdit, onSendToMonitoring, sending, alreadySent }: {
    lead: LiveLead;
    onOpenDetail: () => void;
    onOpenEdit: () => void;
    onSendToMonitoring: () => void;
    sending: boolean;
    alreadySent?: boolean;
}) {
    return (
        <div 
            onClick={onOpenDetail}
            className="glass p-6 rounded-[32px] border-white/5 hover:border-orange-500/30 transition-all group flex flex-col h-full bg-zinc-950/40 cursor-pointer"
        >
            <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20 group-hover:scale-110 transition-transform">
                    <Globe className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex items-center gap-2">
                    {alreadySent && (
                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                <Activity size={8} /> Monitoring
                            </span>
                        </div>
                    )}
                    <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                        <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Active</span>
                    </div>
                </div>
            </div>

            <div className="space-y-2 mb-6">
                <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1">{lead.name}</h3>
                <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
                    <Building2 size={12} className="text-orange-500" />
                    {lead.category}
                </div>
            </div>

            <div className="space-y-3 mb-8 flex-1">
                <div className="flex items-start gap-2 text-[11px] text-white/60">
                    <MapPin size={14} className="text-orange-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{lead.address}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/40 font-medium">
                    <Calendar size={14} className="text-orange-500 shrink-0" />
                    Deployed on {new Date(lead.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex flex-wrap gap-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); window.open(`/${lead.slug}`, '_blank'); }}
                    className="flex-1 min-w-[110px] h-12 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-widest active:scale-95 shadow-lg shadow-orange-900/20"
                >
                    <ExternalLink size={14} />
                    Visit Site
                </button>
                
                {lead.htmlCode && (
                    <DownloadButton 
                        htmlCode={lead.htmlCode} 
                        fileName={lead.name}
                        className="h-12 w-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-all"
                        iconSize={16}
                    />
                )}
                
                <button 
                    onClick={(e) => { e.stopPropagation(); const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name + ' ' + lead.address)}`; window.open(url, '_blank'); }}
                    className="h-12 w-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-all"
                    title="View on Google Maps"
                >
                    <MapPin size={16} className="text-white/40 hover:text-red-400 transition-colors" />
                </button>
                
                <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenEdit(); }}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                    title="Edit Page"
                >
                    <Sliders size={16} className="text-accent-gold" />
                </button>

                {/* Send to Monitoring Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onSendToMonitoring(); }}
                    disabled={alreadySent || sending}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        alreadySent 
                            ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-500/40 cursor-not-allowed'
                            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                    title={alreadySent ? 'Sudah di Monitoring' : 'Sudah Kirim WA? Pindah ke Monitoring'}
                >
                    {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    {alreadySent ? 'Terkirim' : 'Monitoring'}
                </button>
            </div>
        </div>
    );
}

// ─── Table View Component ─────────────────────────────────────────────────────
function LeadTable({ leads, onOpenDetail, onOpenEdit, onSendToMonitoring, sendingId, allSent }: {
    leads: LiveLead[];
    onOpenDetail: (l: LiveLead) => void;
    onOpenEdit: (l: LiveLead) => void;
    onSendToMonitoring: (l: LiveLead) => void;
    sendingId: string | null;
    allSent?: boolean;
}) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-white/5 text-white/30 font-black uppercase tracking-widest">
                        <th className="text-left py-3 px-4">Bisnis</th>
                        <th className="text-left py-3 px-4">Kategori</th>
                        <th className="text-left py-3 px-4 hidden md:table-cell">Alamat</th>
                        <th className="text-left py-3 px-4 hidden lg:table-cell">Deployed</th>
                        <th className="text-left py-3 px-4">URL</th>
                        <th className="text-right py-3 px-4">Aksi</th>
                    </tr>
                </thead>
                <tbody className={allSent ? 'opacity-60' : ''}>
                    {leads.map((lead) => (
                        <tr key={lead.id}
                            onClick={() => onOpenDetail(lead)}
                            className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors group">
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center border border-orange-500/20 shrink-0">
                                        <Globe size={12} className="text-orange-500" />
                                    </div>
                                    <span className="font-bold text-white group-hover:text-orange-400 transition-colors">{lead.name}</span>
                                    {allSent && (
                                        <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[9px] font-black text-emerald-400 uppercase">Monitoring</span>
                                    )}
                                </div>
                            </td>
                            <td className="py-3 px-4 text-white/40">{lead.category}</td>
                            <td className="py-3 px-4 text-white/30 max-w-[180px] truncate hidden md:table-cell">{lead.address}</td>
                            <td className="py-3 px-4 text-white/30 hidden lg:table-cell">
                                {new Date(lead.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3 px-4">
                                <span className="text-white/40 font-mono text-[10px]">/{lead.slug || lead.id}</span>
                            </td>
                            <td className="py-3 px-4">
                                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => window.open(`/${lead.slug}`, '_blank')}
                                        className="h-8 px-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all">
                                        <ExternalLink size={11} /> Visit
                                    </button>
                                    <button onClick={() => onOpenEdit(lead)}
                                        className="h-8 w-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center transition-all">
                                        <Sliders size={12} className="text-accent-gold" />
                                    </button>
                                    <button onClick={() => onSendToMonitoring(lead)}
                                        disabled={allSent || sendingId === lead.id}
                                        className={`h-8 px-2.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all ${
                                            allSent
                                                ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-500/40 cursor-not-allowed'
                                                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                        }`}>
                                        {sendingId === lead.id ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                                        {allSent ? 'Sent' : 'Monitor'}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
