'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Globe, ExternalLink, MapPin, Building2, 
    Calendar, Sliders, Send, X, Loader2, Activity,
    LayoutGrid, List, Clock, Star, Search, RefreshCw, Square, ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import DownloadButton from '@/components/DownloadButton';
import EditPageModal from '@/components/EditPageModal';
import LeadDetailModal from '@/components/LeadDetailModal';
import BlastPanel from '@/components/BlastPanel';

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
    const [activeTab, setActiveTab] = useState<'sites' | 'blast'>('sites');
    const [sendingId, setSendingId] = useState<string | null>(null);

    const router = useRouter();

    // Filter & UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL CATEGORIES');
    const [filterCity, setFilterCity] = useState('ALL CITIES');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Compute dynamic lists
    const dynamicCategories = useMemo(() => {
        const cats = new Set(initialLeads.map(l => l.category).filter(Boolean));
        return ['ALL CATEGORIES', ...Array.from(cats)].sort();
    }, [initialLeads]);

    const dynamicCities = useMemo(() => {
        const cities = new Set(initialLeads.map(l => {
            const match = l.address?.match(/Kota ([a-zA-Z0-9\s]+)/i);
            return match ? match[1].trim() : 'Unknown';
        }).filter(c => c !== 'Unknown'));
        return ['ALL CITIES', ...Array.from(cities)].sort();
    }, [initialLeads]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 1000); // Visual feedback
    };

    const handleSendToMonitoring = async (lead: LiveLead) => {
        try {
            setSendingId(lead.id);
            const res = await fetch(`/api/leads/${lead.id}/monitoring`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to send to monitoring');
            handleRefresh();
        } catch (error) {
            console.error(error);
            alert('Failed to move to monitoring');
        } finally {
            setSendingId(null);
        }
    };

    // Apply filters
    const filteredLeads = leads.filter(l => {
        if (filterCategory !== 'ALL CATEGORIES' && l.category !== filterCategory) return false;
        
        if (filterCity !== 'ALL CITIES') {
            const match = l.address?.match(/Kota ([a-zA-Z0-9\s]+)/i);
            const city = match ? match[1].trim() : 'Unknown';
            if (city !== filterCity) return false;
        }

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (
                l.name?.toLowerCase().includes(search) || 
                l.address?.toLowerCase().includes(search) ||
                l.category?.toLowerCase().includes(search)
            );
        }

        return true;
    });

    const notSentLeads = filteredLeads.filter(l => !l.nextFollowupAt);
    const sentLeads = filteredLeads.filter(l => !!l.nextFollowupAt);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 text-center md:text-left">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Live Digital Assets</h1>
                <p className="text-white/40 font-medium italic text-sm">Your fleet of deployed websites, optimized and active.</p>
            </div>

            {/* Top Navigation Tabs */}
            <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto scrollbar-hide">
                <button 
                    onClick={() => setActiveTab('sites')}
                    className={`text-sm font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all whitespace-nowrap ${activeTab === 'sites' ? 'bg-accent-gold text-black shadow-lg shadow-accent-gold/20' : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'}`}
                >
                    <Globe size={16} className="inline-block mr-2 -mt-1" />
                    Live Sites
                </button>
                <button 
                    onClick={() => setActiveTab('blast')}
                    className={`text-sm font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all whitespace-nowrap ${activeTab === 'blast' ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'}`}
                >
                    <Send size={16} className="inline-block mr-2 -mt-1" />
                    WA Pitching Blast
                </button>
            </div>

            {activeTab === 'blast' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <BlastPanel leads={leads as any} onStatusUpdate={handleRefresh} />
                </div>
            ) : (
                <>
                    {/* Reactive Filter Bar */}
                    <div className="glass p-6 rounded-[32px] border-white/5 bg-zinc-950/40 sticky top-4 z-30 backdrop-blur-2xl shadow-2xl">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent-gold transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="Quick Search Business or Address..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-accent-gold/40 focus:ring-4 focus:ring-accent-gold/5 transition-all text-sm font-medium"
                        />
                    </div>

                    <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <div className="relative group/filter min-w-[180px] shrink-0">
                            <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover/filter:text-accent-gold transition-colors" />
                            <select 
                                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl pl-10 pr-10 py-4 appearance-none text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all outline-none focus:border-accent-gold/40 cursor-pointer"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                {dynamicCategories.map(cat => (
                                    <option key={cat} value={cat} className="bg-zinc-950">{cat}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={14} />
                        </div>

                        <div className="relative group/city min-w-[160px] shrink-0">
                            <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover/city:text-accent-gold transition-colors" />
                            <select 
                                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl pl-10 pr-10 py-4 appearance-none text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all outline-none focus:border-accent-gold/40 cursor-pointer"
                                value={filterCity}
                                onChange={(e) => setFilterCity(e.target.value)}
                            >
                                {dynamicCities.map(city => (
                                    <option key={city} value={city} className="bg-zinc-950">{city}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={14} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content View Toggle & Refresh */}
            <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 shrink-0">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-accent-gold text-black shadow-lg shadow-accent-gold/20' : 'text-white/40 hover:text-white'}`}
                    >
                        <Sliders size={12} /> Grid
                    </button>
                    <button 
                        onClick={() => setViewMode('table')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'table' ? 'bg-accent-gold text-black shadow-lg shadow-accent-gold/20' : 'text-white/40 hover:text-white'}`}
                    >
                        <Square size={12} /> Table
                    </button>
                </div>

                <button 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 shrink-0 ml-4 transition-all"
                >
                    <RefreshCw size={12} className={`text-accent-gold ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white">Refresh Live</span>
                </button>
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
                                            onSendToMonitoring={() => handleSendToMonitoring(lead)}
                                            sendingId={sendingId}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <LeadTable leads={notSentLeads}
                                    onOpenDetail={(l) => { setDetailLead(l); setIsDetailModalOpen(true); }}
                                    onOpenEdit={(l) => { setEditingHtmlLead(l); setIsEditModalOpen(true); }}
                                    onSendToMonitoring={handleSendToMonitoring}
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
                                            alreadySent
                                        />
                                    ))}
                                </div>
                            ) : (
                                <LeadTable leads={sentLeads}
                                    onOpenDetail={(l) => { setDetailLead(l); setIsDetailModalOpen(true); }}
                                    onOpenEdit={(l) => { setEditingHtmlLead(l); setIsEditModalOpen(true); }}
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
            </>
            )}

            {/* Send to Monitoring Modal (Removed) */}

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
function LeadCard({ lead, onOpenDetail, onOpenEdit, onSendToMonitoring, sendingId, alreadySent }: {
    lead: LiveLead;
    onOpenDetail: () => void;
    onOpenEdit: () => void;
    onSendToMonitoring?: () => void;
    sendingId?: string | null;
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

                {onSendToMonitoring && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onSendToMonitoring(); }}
                        disabled={alreadySent || sendingId === lead.id}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            alreadySent 
                                ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-500/40 cursor-not-allowed'
                                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                        title={alreadySent ? 'Sudah di Monitoring' : 'Sudah Kirim WA? Pindah ke Monitoring'}
                    >
                        {sendingId === lead.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        {alreadySent ? 'Terkirim' : 'Monitoring'}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Table View Component ─────────────────────────────────────────────────────
function LeadTable({ leads, onOpenDetail, onOpenEdit, onSendToMonitoring, sendingId, allSent }: {
    leads: LiveLead[];
    onOpenDetail: (l: LiveLead) => void;
    onOpenEdit: (l: LiveLead) => void;
    onSendToMonitoring?: (l: LiveLead) => void;
    sendingId?: string | null;
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
                                    {onSendToMonitoring && (
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
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
