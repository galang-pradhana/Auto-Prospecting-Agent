'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Globe, ExternalLink, MapPin, Building2, 
    Calendar, Sliders, Send, X, Loader2, Activity,
    LayoutGrid, List, Clock, Star, Search, RefreshCw, Square, CheckSquare, ChevronDown, Sparkles, FileText
} from 'lucide-react';
import Link from 'next/link';
import { PERSONA_OPTIONS } from '@/lib/prompts';
import { toast } from 'react-hot-toast';
import DownloadButton from '@/components/DownloadButton';
import EditPageModal from '@/components/EditPageModal';
import LeadDetailModal from '@/components/LeadDetailModal';
import BlastPanel from '@/components/BlastPanel';
import ProposalModal from '@/components/ProposalModal';
import { 
    getLeads, 
    getUniqueCategories, 
    getUniqueCities,
    getUniqueDistricts
} from '@/lib/actions/lead';
import { getUserSettings } from '@/lib/actions/user-settings';

interface LiveLead {
    id: string;
    name: string;
    wa: string | null;
    category: string;
    address: string;
    city?: string | null;
    district?: string | null;
    updatedAt: Date | string;
    slug: string | null;
    htmlCode: string | null;
    prototypeHtml?: string | null;
    status: string;
    nextFollowupAt?: string | null;
    baitDraft?: string | null;
    outreachDraft?: string | null;
    blastStatus?: string | null;
    blastError?: string | null;
    lastContactAt?: string | null;
    brandDna?: {
        status: string;
        submittedAt?: Date | string | null;
    } | null;
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
    const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
    const [proposalLead, setProposalLead] = useState<any>(null);
    const [siteVersion, setSiteVersion] = useState<'dummy' | 'real'>('dummy');
    const [modelId, setModelId] = useState('gemini-3-1-pro');
    
    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL CATEGORIES');
    const [filterCity, setFilterCity] = useState('ALL CITIES');
    const [filterDistrict, setFilterDistrict] = useState('ALL DISTRICTS');
    const [dynamicCategories, setDynamicCategories] = useState<string[]>(['ALL CATEGORIES']);
    const [dynamicCities, setDynamicCities] = useState<string[]>(['ALL CITIES']);
    const [dynamicDistricts, setDynamicDistricts] = useState<string[]>(['ALL DISTRICTS']);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Batch Action States
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);
    const [outreachPersona, setOutreachPersona] = useState<string>('professional');
    const [generateProgress, setGenerateProgress] = useState({ done: 0, total: 0 });

    useEffect(() => {
        const fetchSettings = async () => {
            const settings = await getUserSettings();
            if (settings?.htmlModel) {
                setModelId(settings.htmlModel);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            const [categories, citiesList, districtsList] = await Promise.all([
                getUniqueCategories('LIVE'),
                getUniqueCities('LIVE'),
                getUniqueDistricts('LIVE')
            ]);
            if (categories) setDynamicCategories(['ALL CATEGORIES', ...categories]);
            if (citiesList) setDynamicCities(['ALL CITIES', ...citiesList]);
            if (districtsList) setDynamicDistricts(['ALL DISTRICTS', ...districtsList]);
        };
        loadInitialData();
    }, [refreshKey]);

    useEffect(() => {
        const updateRegions = async () => {
            const [cities, districts] = await Promise.all([
                getUniqueCities('LIVE'),
                getUniqueDistricts('LIVE', filterCity === 'ALL CITIES' ? undefined : filterCity)
            ]);
            if (cities) setDynamicCities(['ALL CITIES', ...cities]);
            if (districts) setDynamicDistricts(['ALL DISTRICTS', ...districts]);
        };
        updateRegions();
    }, [filterCity]);

    // Background Polling Logic for WA Blast & Replies
    useEffect(() => {
        const hasActiveLeads = leads.some(l => 
            l.blastStatus === "PENDING" || 
            l.blastStatus === "BAIT_SENT" || 
            l.blastStatus === "SCHEDULED"
        );

        if (!hasActiveLeads) return;

        const interval = setInterval(() => {
            handleRefresh();
        }, 8000);

        return () => clearInterval(interval);
    }, [leads]);

    const router = useRouter();

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    const toggleSelectLead = (id: string) => {
        setSelectedLeadIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBatchGenerateOutreach = async () => {
        if (selectedLeadIds.length === 0) return;
        setIsGeneratingOutreach(true);
        setGenerateProgress({ done: 0, total: selectedLeadIds.length });

        try {
            const res = await fetch('/api/outreach/batch-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadIds: selectedLeadIds, persona: outreachPersona })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to start batch generation');

            const checkStatus = setInterval(async () => {
                const sRes = await fetch(`/api/jobs/status?id=${data.jobId}`);
                if (sRes.ok) {
                    const sData = await sRes.json();
                    if (sData.job?.status === 'COMPLETED' || sData.job?.status === 'FAILED') {
                        clearInterval(checkStatus);
                        setIsGeneratingOutreach(false);
                        setSelectedLeadIds([]);
                        setRefreshKey(prev => prev + 1);
                        if (sData.job?.status === 'COMPLETED') {
                            alert('Batch outreach generation finished in background!');
                        } else {
                            alert('Batch generation failed: ' + (sData.job?.message || 'Unknown error'));
                        }
                    } else if (sData.job?.progress !== undefined) {
                        setGenerateProgress({ 
                            done: Math.round((sData.job.progress / 100) * selectedLeadIds.length), 
                            total: selectedLeadIds.length 
                        });
                    }
                }
            }, 3000);

            alert('Batch processing started in background. You can continue working.');
        } catch (e: any) {
            console.error(e);
            alert('Error: ' + e.message);
            setIsGeneratingOutreach(false);
        }
    };

    const handleSendToMonitoring = async (lead: LiveLead) => {
        try {
            setSendingId(lead.id);
            setLeads(prev => prev.map(l => 
                l.id === lead.id ? { ...l, nextFollowupAt: new Date().toISOString() } : l
            ));

            const res = await fetch(`/api/leads/${lead.id}/monitoring`, { method: 'POST' });
            if (!res.ok) {
                setLeads(prev => prev.map(l => 
                    l.id === lead.id ? { ...l, nextFollowupAt: null } : l
                ));
                throw new Error('Failed to send to monitoring');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to move to monitoring. Please try again.');
        } finally {
            setSendingId(null);
        }
    };

    const filteredLeads = useMemo(() => {
        return leads.filter(l => {
            if (siteVersion === 'real') {
                const status = l.brandDna?.status;
                if (status !== 'SUBMITTED' && status !== 'VIEWED') return false;
            }

            if (filterCategory !== 'ALL CATEGORIES' && l.category !== filterCategory) return false;
            if (filterCity !== 'ALL CITIES' && l.city !== filterCity) return false;
            if (filterDistrict !== 'ALL DISTRICTS' && l.district !== filterDistrict) return false;

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
    }, [leads, siteVersion, filterCategory, filterCity, filterDistrict, searchTerm]);

    const notSentLeads = filteredLeads.filter(l => !l.nextFollowupAt);
    const sentLeads = filteredLeads.filter(l => !!l.nextFollowupAt);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 text-center md:text-left">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Live Digital Assets</h1>
                <p className="text-white/40 font-medium italic text-sm">Your fleet of deployed websites, optimized and active.</p>
            </div>

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

                            <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto">
                                <div className="relative group/filter flex-1 min-w-[140px] md:min-w-[180px]">
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

                                <div className="relative group/city flex-1 min-w-[140px] md:min-w-[160px]">
                                    <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover/city:text-accent-gold transition-colors" />
                                    <select 
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl pl-10 pr-10 py-4 appearance-none text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all outline-none focus:border-accent-gold/40 cursor-pointer"
                                        value={filterCity}
                                        onChange={(e) => {
                                            setFilterCity(e.target.value);
                                            setFilterDistrict('ALL DISTRICTS');
                                        }}
                                    >
                                        {dynamicCities.map(city => (
                                            <option key={city} value={city} className="bg-zinc-950">{city}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={14} />
                                </div>

                                <div className="relative group/district flex-1 min-w-[140px] md:min-w-[160px]">
                                    <Navigation size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover/district:text-accent-gold transition-colors" />
                                    <select 
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl pl-10 pr-10 py-4 appearance-none text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all outline-none focus:border-accent-gold/40 cursor-pointer"
                                        value={filterDistrict}
                                        onChange={(e) => setFilterDistrict(e.target.value)}
                                    >
                                        {dynamicDistricts.map(dist => (
                                            <option key={dist} value={dist} className="bg-zinc-950">{dist}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={14} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                        <div className="flex flex-wrap items-center gap-3">
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

                            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 shrink-0">
                                <button 
                                    onClick={() => setSiteVersion('dummy')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${siteVersion === 'dummy' ? 'bg-zinc-700 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                                >
                                    Dummy Version
                                </button>
                                <button 
                                    onClick={() => setSiteVersion('real')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${siteVersion === 'real' ? 'bg-accent-gold text-black shadow-lg shadow-accent-gold/20' : 'text-white/40 hover:text-white'}`}
                                >
                                    Real (Blueprint)
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 shrink-0 transition-all w-full md:w-auto mt-2 md:mt-0"
                        >
                            <RefreshCw size={12} className={`text-accent-gold ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white">Refresh Live</span>
                        </button>
                    </div>

                    {filteredLeads.length > 0 ? (
                        <div className="space-y-8">
                            {notSentLeads.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                                        <Globe size={12} /> Belum Dikirim WA ({notSentLeads.length})
                                    </p>
                                    {viewMode === 'grid' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {notSentLeads.map((lead) => (
                                                <LeadCard key={lead.id} lead={lead} siteVersion={siteVersion}
                                                    onOpenDetail={() => { setDetailLead(lead); setIsDetailModalOpen(true); }}
                                                    onOpenEdit={() => { setEditingHtmlLead({...lead, viewVersion: siteVersion}); setIsEditModalOpen(true); }}
                                                    onOpenProposal={() => { setProposalLead(lead); setIsProposalModalOpen(true); }}
                                                    onSendToMonitoring={() => handleSendToMonitoring(lead)}
                                                    sendingId={sendingId}
                                                    modelId={modelId}
                                                    setModelId={setModelId}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <LeadTable leads={notSentLeads} siteVersion={siteVersion}
                                            onOpenDetail={(l) => { setDetailLead(l); setIsDetailModalOpen(true); }}
                                            onOpenEdit={(l) => { setEditingHtmlLead({...l, viewVersion: siteVersion}); setIsEditModalOpen(true); }}
                                            onOpenProposal={(l) => { setProposalLead(l); setIsProposalModalOpen(true); }}
                                            onSendToMonitoring={handleSendToMonitoring}
                                            sendingId={sendingId}
                                            selectedIds={selectedLeadIds}
                                            onToggleSelect={toggleSelectLead}
                                        />
                                    )}
                                </div>
                            )}

                            {sentLeads.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-emerald-500/50 flex items-center gap-2">
                                        <Activity size={12} /> Sudah di Monitoring ({sentLeads.length})
                                    </p>
                                    {viewMode === 'grid' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                                            {sentLeads.map((lead) => (
                                                <LeadCard key={lead.id} lead={lead} siteVersion={siteVersion}
                                                    onOpenDetail={() => { setDetailLead(lead); setIsDetailModalOpen(true); }}
                                                    onOpenEdit={() => { setEditingHtmlLead({...lead, viewVersion: siteVersion}); setIsEditModalOpen(true); }}
                                                    onOpenProposal={() => { setProposalLead(lead); setIsProposalModalOpen(true); }}
                                                    alreadySent
                                                    modelId={modelId}
                                                    setModelId={setModelId}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <LeadTable leads={sentLeads} siteVersion={siteVersion}
                                            onOpenDetail={(l) => { setDetailLead(l); setIsDetailModalOpen(true); }}
                                            onOpenEdit={(l) => { setEditingHtmlLead({...l, viewVersion: siteVersion}); setIsEditModalOpen(true); }}
                                            onOpenProposal={(l) => { setProposalLead(l); setIsProposalModalOpen(true); }}
                                            allSent
                                            selectedIds={selectedLeadIds}
                                            onToggleSelect={toggleSelectLead}
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

            {detailLead && (
                <LeadDetailModal 
                    isOpen={isDetailModalOpen}
                    onClose={() => { setIsDetailModalOpen(false); setDetailLead(null); }}
                    lead={detailLead}
                />
            )}

            {editingHtmlLead && (
                <EditPageModal 
                    isOpen={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setEditingHtmlLead(null); }}
                    lead={editingHtmlLead}
                />
            )}

            {selectedLeadIds.length > 0 && viewMode === 'table' && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 px-8 py-6 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex items-center gap-8">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-accent-gold">{selectedLeadIds.length} Selected</span>
                            <span className="text-xs text-white/40 font-bold uppercase tracking-tight">Batch Outreach Mode</span>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <Sparkles size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-gold" />
                                <select 
                                    value={outreachPersona}
                                    onChange={(e) => setOutreachPersona(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-[11px] font-black uppercase tracking-widest text-white outline-none focus:border-accent-gold/40 cursor-pointer appearance-none min-w-[200px]"
                                >
                                    {PERSONA_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" />
                            </div>
                            <button 
                                onClick={handleBatchGenerateOutreach}
                                disabled={isGeneratingOutreach}
                                className="h-12 px-8 bg-accent-gold hover:bg-yellow-500 text-black rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-accent-gold/20 flex items-center gap-3 disabled:opacity-50"
                            >
                                {isGeneratingOutreach ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Generating {generateProgress.done}/{generateProgress.total}</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        <span>Generate Outreach</span>
                                    </>
                                )}
                            </button>
                            <button 
                                onClick={() => setSelectedLeadIds([])}
                                className="h-12 w-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center transition-all group"
                            >
                                <X size={18} className="text-white/20 group-hover:text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {proposalLead && (
                <ProposalModal 
                    isOpen={isProposalModalOpen}
                    onClose={() => setIsProposalModalOpen(false)}
                    lead={proposalLead}
                />
            )}
        </div>
    );
}

function LeadCard({ lead, siteVersion, onOpenDetail, onOpenEdit, onOpenProposal, onSendToMonitoring, sendingId, alreadySent, modelId, setModelId }: {
    lead: LiveLead;
    siteVersion: 'dummy' | 'real';
    onOpenDetail: () => void;
    onOpenEdit: () => void;
    onOpenProposal: () => void;
    onSendToMonitoring?: () => void;
    sendingId?: string | null;
    alreadySent?: boolean;
    modelId: string;
    setModelId: (m: string) => void;
}) {
    const isRealAvailable = lead.prototypeHtml && lead.prototypeHtml.length > 0;
    const currentUrl = `/${lead.slug || lead.id}${siteVersion === 'real' ? '?v=real' : ''}`;
    const currentHtml = siteVersion === 'real' ? lead.prototypeHtml : lead.htmlCode;
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
                <div className="flex-1 flex gap-2">
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if (siteVersion === 'real' && !isRealAvailable) {
                                fetch('/api/brand-blueprint/generate', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ leadId: lead.id, modelId })
                                }).then(res => res.json()).then(data => {
                                    if (data.success) {
                                        toast.success("Blueprint generation started!");
                                    } else {
                                        toast.error(data.message || "Gagal generate blueprint.");
                                    }
                                }).catch(err => toast.error("Error: " + err.message));
                                return;
                            }
                            window.open(currentUrl, '_blank'); 
                        }}
                        className={`flex-1 h-12 ${siteVersion === 'real' && !isRealAvailable ? 'bg-accent-gold hover:bg-yellow-600 text-black shadow-lg shadow-yellow-900/20' : 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-900/20'} font-black rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-widest active:scale-95`}
                    >
                        <ExternalLink size={14} />
                        {siteVersion === 'real' && !isRealAvailable ? 'Generate AI' : 'Visit Site'}
                    </button>

                    {siteVersion === 'real' && !isRealAvailable && (
                        <div className="relative group/select h-12">
                            <select 
                                value={modelId}
                                onChange={(e) => { e.stopPropagation(); setModelId(e.target.value); }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-full bg-white/5 border border-white/10 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest text-accent-gold outline-none focus:border-accent-gold/40 cursor-pointer appearance-none pr-8"
                            >
                                <optgroup label="Cross-Engine" className="bg-zinc-900">
                                    <option value="gemini-3-1-pro">Gemini 3.1</option>
                                    <option value="claude-sonnet-4-6">Claude 4.6</option>
                                    <option value="gpt-5-2">GPT 5.2</option>
                                </optgroup>
                                <optgroup label="OpenRouter" className="bg-zinc-900">
                                    <option value="deepseek-v4-pro">DeepSeek V4 Pro</option>
                                    <option value="qwen3.6-plus">Qwen 3.6</option>
                                </optgroup>
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                        </div>
                    )}
                </div>
                
                {currentHtml && (
                    <DownloadButton 
                        htmlCode={currentHtml} 
                        fileName={`${lead.name}-${siteVersion}`}
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

                <button 
                    onClick={(e) => { e.stopPropagation(); onOpenProposal(); }}
                    className="flex-1 h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-widest active:scale-95"
                    title="Make Proposal"
                >
                    <FileText size={14} className="text-orange-500" />
                    Proposal
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

function LeadTable({ leads, siteVersion, onOpenDetail, onOpenEdit, onOpenProposal, onSendToMonitoring, sendingId, allSent, selectedIds = [], onToggleSelect }: {
    leads: LiveLead[];
    siteVersion: 'dummy' | 'real';
    onOpenDetail: (l: LiveLead) => void;
    onOpenEdit: (l: LiveLead) => void;
    onOpenProposal: (l: LiveLead) => void;
    onSendToMonitoring?: (l: LiveLead) => void;
    sendingId?: string | null;
    allSent?: boolean;
    selectedIds?: string[];
    onToggleSelect?: (id: string) => void;
}) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-white/5 text-white/30 font-black uppercase tracking-widest">
                        <th className="py-3 px-4 w-10">
                            <div className="cursor-pointer" onClick={(e) => {
                                e.stopPropagation();
                                if (onToggleSelect) {
                                    if (selectedIds.length === leads.length) leads.forEach(l => onToggleSelect(l.id));
                                    else leads.forEach(l => { if(!selectedIds.includes(l.id)) onToggleSelect(l.id); });
                                }
                            }}>
                                {selectedIds.length === leads.length && leads.length > 0 ? <CheckSquare size={16} className="text-accent-gold" /> : <Square size={16} />}
                            </div>
                        </th>
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
                            className={`border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors group ${selectedIds.includes(lead.id) ? 'bg-accent-gold/[0.03]' : ''}`}>
                            <td className="py-3 px-4">
                                <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); if(onToggleSelect) onToggleSelect(lead.id); }}>
                                    {selectedIds.includes(lead.id) ? <CheckSquare size={16} className="text-accent-gold" /> : <Square size={16} className="text-white/10 group-hover:text-white/30" />}
                                </div>
                            </td>
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
                                    <button onClick={() => {
                                        const isRealAvailable = lead.prototypeHtml && lead.prototypeHtml.length > 0;
                                        if (siteVersion === 'real' && !isRealAvailable) {
                                            fetch('/api/brand-blueprint/generate', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ leadId: lead.id, modelId })
                                            }).then(res => res.json()).then(data => {
                                                if (data.success) {
                                                    toast.success("Blueprint generation started!");
                                                } else {
                                                    toast.error(data.message || "Gagal generate blueprint.");
                                                }
                                            }).catch(err => toast.error("Error: " + err.message));
                                            return;
                                        }
                                        window.open(`/${lead.slug || lead.id}${siteVersion === 'real' ? '?v=real' : ''}`, '_blank');
                                    }}
                                        className={`h-8 px-2.5 ${siteVersion === 'real' && (!lead.prototypeHtml || lead.prototypeHtml.length === 0) ? 'bg-accent-gold hover:bg-yellow-600 text-black' : 'bg-orange-600 hover:bg-orange-700 text-white'} rounded-lg text-[10px] font-black flex items-center gap-1 transition-all`}>
                                        <ExternalLink size={11} /> {siteVersion === 'real' && (!lead.prototypeHtml || lead.prototypeHtml.length === 0) ? 'Gen AI' : 'Visit'}
                                    </button>
                                    <button onClick={() => onOpenEdit(lead)}
                                        className="h-8 w-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center transition-all">
                                        <Sliders size={12} className="text-accent-gold" />
                                    </button>
                                    <button onClick={() => onOpenProposal(lead)}
                                        className="h-8 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all">
                                        <FileText size={11} className="text-orange-500" /> Prop
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
