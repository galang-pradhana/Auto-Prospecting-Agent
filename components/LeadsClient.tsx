'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { 
    Zap, Globe, Phone, Star, CheckCircle2, Loader2, 
    Trash2, Building2, MapPin, ChevronDown,
    Search, Square, CheckSquare, Sparkles, X, AlertTriangle,
    Check, Copy, Image as ImageIcon, Lightbulb, Settings2, Sliders, ChevronRight,
    Download, CircleDashed, Code2, Navigation
} from 'lucide-react';
import { getStyleModels } from '@/lib/actions/ai';
import { 
    deleteLeads, 
    getLeads, 
    getLeadsCount, 
    getUniqueCategories,
    getUniqueCities,
    archiveToGSheet
} from '@/lib/actions/lead';
import { generateWaLink } from '@/lib/actions/settings';
import { isValidWhatsApp } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import TheForgeModal from './TheForgeModal';
import { Hammer, ExternalLink, Clock } from 'lucide-react';
import { ActivityTimeline } from './ActivityTimeline';
import LeadDetailModal from './LeadDetailModal';
import LiveEditModal from './LiveEditModal';
import DesignTweakerModal from './DesignTweakerModal';

interface Lead {
    id: string;
    name: string;
    wa: string;
    category: string;
    province: string;
    city: string;
    address: string;
    rating: number;
    website: string;
    mapsUrl?: string | null;
    reviews: any; // Added
    status: 'FRESH' | 'ENRICHED' | 'READY' | 'FINISH' | 'LIVE';
    isPro?: boolean;
    htmlCode?: string | null;
    slug?: string | null;
    brandData: any;
    painPoints?: string;
    resolutions?: any; // Changed to any for Json compatibility
    suggestedAssets?: any; // Changed to any for Json compatibility
    masterWebsitePrompt?: string;
    resolvingIdea?: string;
    selectedStyle?: string;
    selectedLayout?: string;
    createdAt: string;
    updatedAt: string;
    // New Pipeline Fields
    followupStage: string;
    followupCount: number;
    lastContactAt: string;
    nextFollowupAt?: string | null;
    linkClickedAt?: string | null;
    qualifiedAt?: string | null;
    totalTimeOnPage: number;
    outreachDraft?: string | null;
    ig?: string | null;
    styleDNA?: string | null;
}

interface LeadsClientProps {
    initialLeads: Lead[];
    forceStatus?: string;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
    FRESH: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', label: 'FRESH' },
    ENRICHED: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'ENRICHED' },
    READY: { bg: 'bg-green-500/15', text: 'text-green-400', label: 'READY' },
    FINISH: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'FINISH' },
    LIVE: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'LIVE' },
    // Pipeline Stages
    sent: { bg: 'bg-sky-500/10', text: 'text-sky-400', label: 'SENT' },
    clicked: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', label: 'CLICKED' },
    qualified: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'QUALIFIED' },
    replied: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'REPLIED' },
    deal: { bg: 'bg-green-500/20', text: 'text-green-300', label: 'DEAL' },
    closed_lost: { bg: 'bg-rose-500/10', text: 'text-rose-400', label: 'LOST' },
};



const STATUS_FILTERS = ['ALL STATUS', 'FRESH', 'ENRICHED', 'READY', 'FINISH', 'LIVE'];

export default function LeadsClient({ initialLeads, forceStatus }: LeadsClientProps) {
    const [leads, setLeads] = useState<Lead[]>(initialLeads);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [enriching, setEnriching] = useState(false);
    const [forgingIds, setForgingIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [currentStage, setCurrentStage] = useState(0);

    const stages = [
        "Initializing Kie.ai Engine...",
        "Injecting UI/UX Pro Max Framework...",
        "Activating Web Search for Industry Trends...", 
        "Analyzing Brand Identity & Pain Points...",
        "Synthesizing Master Blueprint...",
        "Finalizing Architectural Specs..."
    ];

    // Logic buat muter stage pas lagi processing
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (processing) {
            setCurrentStage(0);
            interval = setInterval(() => {
                setCurrentStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
            }, 4000); // Ganti tiap 4 detik biar user gak bosen
        }
        return () => clearInterval(interval);
    }, [processing]);

    // Filter States
    const [filterCategory, setFilterCategory] = useState('ALL CATEGORIES');
    const [filterStatus, setFilterStatus] = useState<'FRESH' | 'ENRICHED' | 'LIVE'>(forceStatus as any || 'FRESH');
    const [filterCity, setFilterCity] = useState('ALL CITIES');
    const activeTab = filterStatus; // Alias for consistency with requested logic
    const setActiveTab = setFilterStatus; // Alias for consistency
    const [searchTerm, setSearchTerm] = useState('');
    const isSearching = searchTerm !== ''; // Requested alias
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalLeads, setTotalLeads] = useState(0);
    const pageSize = 10;

    const [allStyles, setAllStyles] = useState<any[]>([]);

    const [forgeModalOpen, setForgeModalOpen] = useState(false);
    const [forgeLead, setForgeLead] = useState<Lead | null>(null);
    const [dynamicCategories, setDynamicCategories] = useState<string[]>(['ALL CATEGORIES']);
    const [dynamicCities, setDynamicCities] = useState<string[]>(['ALL CITIES']);

    const [view, setView] = useState<'grid' | 'table'>(forceStatus === 'ENRICHED' ? 'grid' : 'table');

    const [detailLead, setDetailLead] = useState<Lead | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    const [editingHtmlLead, setEditingHtmlLead] = useState<Lead | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isTweakerOpen, setIsTweakerOpen] = useState(false);
    const [selectedLeadForTweak, setSelectedLeadForTweak] = useState<Lead | null>(null);

    // FIXED: Proper filtering dengan useMemo untuk stability
    const filteredLeads = useMemo(() => {
        let result = leads;
        
        // Apply category filter
        if (filterCategory !== 'ALL CATEGORIES') {
            result = result.filter(lead => lead.category === filterCategory);
        }
        
        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(lead => 
                lead.name.toLowerCase().includes(term) ||
                lead.address.toLowerCase().includes(term)
            );
        }
        
        return result;
    }, [leads, filterCategory, searchTerm]);

    // FIXED: Gunakan ref untuk hindari stale closure di useEffect
    const isAnyModalOpenRef = useRef(false);

    // Update ref setiap modal state berubah (tidak trigger re-render)
    useEffect(() => {
        isAnyModalOpenRef.current = isEditModalOpen || isDetailModalOpen || !!editingHtmlLead || forgeModalOpen;
    }, [isEditModalOpen, isDetailModalOpen, editingHtmlLead, forgeModalOpen]);

    // Debug logging untuk track state changes
    useEffect(() => {
        console.log('📊 State Monitor:', {
            activeTab,
            filteredLeadsLength: filteredLeads.length,
            leadsLength: leads.length,
            isSearching,
            modalStates: {
                isEditModalOpen,
                isDetailModalOpen,
                forgeModalOpen,
                editingHtmlLead: !!editingHtmlLead,
                detailLead: !!detailLead,
                forgeLead: !!forgeLead
            },
            isAnyModalOpenRef: isAnyModalOpenRef.current
        });
    }, [activeTab, filteredLeads.length, leads.length, isSearching, isEditModalOpen, isDetailModalOpen, forgeModalOpen, editingHtmlLead, detailLead, forgeLead]);

    const handleEditHtml = (lead: Lead) => {
        setEditingHtmlLead(lead);
        setIsEditModalOpen(true);
    };

    // Fetch leads when filters or page change
    useEffect(() => {
        // GUARD: Jangan fetch jika modal terbuka
        if (isAnyModalOpenRef.current) {
            console.log('🚫 Fetch skipped: modal open');
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            const status = filterStatus === 'ALL STATUS' as any ? undefined : (filterStatus as any);
            const category = filterCategory === 'ALL CATEGORIES' ? undefined : filterCategory;
            
            const [fetchedLeads, count] = await Promise.all([
                getLeads({ 
                    status, 
                    category, 
                    search: searchTerm, 
                    city: filterCity === 'ALL CITIES' ? undefined : filterCity,
                    page, 
                    pageSize 
                }),
                getLeadsCount({ 
                    status, 
                    category, 
                    search: searchTerm,
                    city: filterCity === 'ALL CITIES' ? undefined : filterCity,
                })
            ]);
            
            setLeads(fetchedLeads as any);
            setTotalLeads(count);
            setIsLoading(false);
        };

        // Skip fetch on initial mount if initialLeads matches
        if (page === 1 && filterCategory === 'ALL CATEGORIES' && filterStatus === (forceStatus || 'FRESH') && !searchTerm) {
            getLeadsCount({ 
                status: filterStatus === 'ALL STATUS' as any ? undefined : (filterStatus as any), 
                category: filterCategory === 'ALL CATEGORIES' ? undefined : filterCategory, 
                search: searchTerm 
            }).then(setTotalLeads);
        } else {
            fetchData();
        }
    }, [page, filterCategory, filterStatus, searchTerm, filterCity, forceStatus]); 

    useEffect(() => {
        // JANGAN GANTI TAB JIKA MODAL EDIT ATAU DETAIL SEDANG TERBUKA
        if (isEditModalOpen || editingHtmlLead) return; 

        if (activeTab === 'LIVE' && filteredLeads.length === 0 && !isSearching) {
            setActiveTab('ENRICHED');
        }
    }, [filteredLeads.length, activeTab, isEditModalOpen, editingHtmlLead, isSearching]); 

    useEffect(() => {
        const loadInitialData = async () => {
            const [styles, categories, citiesList] = await Promise.all([
                getStyleModels(),
                getUniqueCategories(filterStatus),
                getUniqueCities(filterStatus)
            ]);
            if (styles) setAllStyles(styles);
            if (categories) {
                setDynamicCategories(['ALL CATEGORIES', ...categories]);
            }
            if (citiesList) {
                setDynamicCities(['ALL CITIES', ...citiesList]);
            }
        };
        loadInitialData();
    }, [filterStatus]);



    // Reactive Filtering (Not strictly needed with effect but kept for consistency)
    const totalPages = Math.ceil(totalLeads / pageSize);

    const handleBatchEnrich = async () => {
        setProcessing(true);
        try {
            await fetch('/api/enrich/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            });
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            console.error('Failed to trigger background enrich:', e);
        }
        setProcessing(false);
        setSelectedIds([]);
    };

    const handleBatchForge = async () => {
        if (selectedIds.length === 0) return;
        
        setProcessing(true);
        // We will dispatch multiple jobs to the registry
        try {
            for (const id of selectedIds) {
                await fetch('/api/forge/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leadId: id })
                });
            }
            await new Promise(r => setTimeout(r, 1500));
        } catch (e: any) {
            console.error('Failed to trigger background forge:', e);
            alert(`Gagal trigger Forge: ${e.message}`);
        } finally {
            setProcessing(false);
            setSelectedIds([]);
        }
    };

    const handleArchive = async () => {
        if (selectedIds.length === 0) return;
        setIsArchiving(true);
        try {
            const res = await archiveToGSheet(selectedIds);
            if (res.success) {
                alert(res.message || "Berhasil archive ke GSheet");
                setSelectedIds([]);
            } else {
                alert(res.message || "Gagal archive leads");
            }
        } catch (e) {
            console.error("Archive error:", e);
            alert("Terjadi kesalahan saat archive!");
        } finally {
            setIsArchiving(false);
        }
    };

    const handleDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Hapus ${selectedIds.length} leads terpilih?`)) return;

        try {
            const res = await deleteLeads(selectedIds);
            if (res.success) {
                setLeads(prev => prev.filter(l => !selectedIds.includes(l.id)));
                setSelectedIds([]);
            }
        } catch (e) {
            alert("Gagal menghapus leads");
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const isEnriched = (status: string) => status !== 'FRESH';

    const handleCopyPrompt = (prompt: string, id: string) => {
        navigator.clipboard.writeText(prompt);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleGenerateWaLink = async (id: string) => {
        setIsLoading(true);
        try {
            const res = await generateWaLink(id);
            if (res.success && res.url) {
                window.open(res.url, '_blank');
            } else {
                alert(res.message);
            }
        } catch (e) {
            alert("Gagal membuat link WhatsApp");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = (htmlCode: string, fileName: string) => {
        const blob = new Blob([htmlCode], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName.replace(/\s+/g, '-').toLowerCase()}-website.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-8 pb-32">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black mb-2 tracking-tighter text-white">Lead Intelligence</h1>
                    <p className="text-white/40 italic font-medium">Database-powered repository. Filtered by status & category.</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20 leading-none">Total</span>
                        <span className="text-xl font-mono font-bold text-accent-gold">{totalLeads}</span>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20 leading-none">Fresh</span>
                        <span className="text-xl font-mono font-bold text-green-400">{leads.filter(l => l.status === 'FRESH').length}</span>
                    </div>
                </div>
            </div>

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
                                onChange={(e) => {
                                    setFilterCategory(e.target.value);
                                    setPage(1);
                                }}
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
                                onChange={(e) => {
                                    setFilterCity(e.target.value);
                                    setPage(1);
                                }}
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

            {/* Leads View */}
            <div className="space-y-8">
                {/* Content View Toggle */}
                <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 shrink-0">
                        <button 
                            onClick={() => setView('grid')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view === 'grid' ? 'bg-accent-gold text-black shadow-lg shadow-accent-gold/20' : 'text-white/40 hover:text-white'}`}
                        >
                            <Sliders size={12} /> Grid
                        </button>
                        <button 
                            onClick={() => setView('table')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view === 'table' ? 'bg-accent-gold text-black shadow-lg shadow-accent-gold/20' : 'text-white/40 hover:text-white'}`}
                        >
                            <Square size={12} /> Table
                        </button>
                    </div>

                    <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/5 shrink-0 ml-4">
                        <Clock size={14} className="text-accent-gold" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Auto-Refresh {view === 'table' ? 'Active' : 'Live'}</span>
                    </div>
                </div>
                
                {/* Status Tabs (New) */}
                {!forceStatus && (
                    <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto scrollbar-hide">
                        {STATUS_FILTERS.map(status => (
                            <button
                                key={status}
                                onClick={() => {
                                    setFilterStatus(status as any);
                                    setPage(1);
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    filterStatus === status 
                                    ? 'bg-white text-black shadow-lg' 
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                )}

                {view === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filteredLeads.length > 0 ? (
                                filteredLeads.map((lead, i) => {
                                    const badge = STATUS_BADGES[lead.status] || STATUS_BADGES.FRESH;
                                    return (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.2 }}
                                            key={lead.id}
                                            onClick={(e) => {
                                                // If it's FRESH, we might want to toggle select on card click
                                                // Otherwise, we open the detail modal.
                                                // Actually, let's make the card click open details, and checkbox click toggle selection.
                                                setDetailLead(lead);
                                                setIsDetailModalOpen(true);
                                            }}
                                            className={`glass p-6 rounded-[32px] border-white/5 hover:border-accent-gold/40 transition-all group relative cursor-pointer ${selectedIds.includes(lead.id) ? 'border-accent-gold/40 bg-accent-gold/[0.04] ring-1 ring-accent-gold/20' : ''} ${isEnriched(lead.status) ? 'opacity-90' : ''}`}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Checkbox */}
                                                <div 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isEnriched(lead.status)) toggleSelect(lead.id);
                                                    }}
                                                    className={`mt-1 ${isEnriched(lead.status) ? 'cursor-not-allowed opacity-20' : 'cursor-pointer'}`}
                                                >
                                                    {isEnriched(lead.status) ? (
                                                        <CheckCircle2 size={20} className="text-accent-gold" />
                                                    ) : selectedIds.includes(lead.id) ? (
                                                        <CheckSquare size={20} className="text-accent-gold" />
                                                    ) : (
                                                        <Square size={20} className="text-white/20 group-hover:text-white/40" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h3 className="font-bold text-white group-hover:text-accent-gold transition-colors truncate max-w-[150px]">{lead.name}</h3>
                                                                <div className={`px-2 py-0.5 ${badge.bg} ${badge.text} text-[8px] font-black uppercase rounded-md border border-current/20 flex items-center gap-1`}>
                                                                    <Sparkles size={8} /> {badge.label}
                                                                </div>
                                                                {lead.status === 'LIVE' && (
                                                                    <div className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase flex items-center gap-1 ${lead.isPro ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-white/5 text-white/40 border-white/10'}`}>
                                                                        {lead.isPro ? '✨ PRO' : 'STD'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                                                                <Building2 size={10} className="text-accent-gold" /> {lead.category || 'Lead'}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full border border-white/5">
                                                            <Star size={10} fill="currentColor" className="text-accent-gold" />
                                                            <span className="text-[10px] font-black tabular-nums text-white">{lead.rating || '0.0'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex items-start gap-2 text-[11px] text-white/60">
                                                            <MapPin size={12} className="text-accent-gold shrink-0 mt-0.5" />
                                                            <span className="line-clamp-2 leading-relaxed">{lead.address}</span>
                                                        </div>

                                                        {lead.resolvingIdea && (
                                                            <div className="p-4 bg-accent-gold/5 border border-accent-gold/20 rounded-2xl space-y-2">
                                                                <p className="text-[10px] font-black text-accent-gold uppercase tracking-widest flex items-center gap-1.5">
                                                                    <Zap size={10} fill="currentColor" /> Technical Solution
                                                                </p>
                                                                <p className="text-xs text-white/90 leading-relaxed font-medium">{lead.resolvingIdea}</p>
                                                            </div>
                                                        )}

                                                        {lead.masterWebsitePrompt && (
                                                            <div className="p-4 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-3">
                                                                <div className="flex justify-between items-center">
                                                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                                                                        <Sparkles size={10} className="text-accent-gold" /> Master Prompt
                                                                    </p>
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleCopyPrompt(lead.masterWebsitePrompt!, lead.id);
                                                                        }}
                                                                        className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all group/copy"
                                                                    >
                                                                        {copiedId === lead.id ? (
                                                                            <><Check size={10} className="text-green-400" /> <span className="text-[9px] font-bold text-green-400">Copied!</span></>
                                                                        ) : (
                                                                            <><Copy size={10} className="group-hover/copy:text-accent-gold" /> <span className="text-[9px] font-bold">Copy</span></>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                                <div className="relative group/prompt">
                                                                    <pre className="text-[10px] text-white/70 leading-relaxed font-mono overflow-y-auto max-h-[120px] custom-scrollbar whitespace-pre-wrap pr-2">
                                                                        {lead.masterWebsitePrompt}
                                                                    </pre>
                                                                    <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-zinc-950/80 to-transparent pointer-events-none rounded-b-xl" />
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                            <div className="flex gap-2">
                                                                <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5 ${lead.website === 'N/A' || !lead.website ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                                                    <Globe size={10} />
                                                                    {lead.website === 'N/A' || !lead.website ? 'Missing' : 'Portal'}
                                                                </div>
                                                                <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5 ${isValidWhatsApp(lead.wa) ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-white/20'}`}>
                                                                    <Phone size={10} className={isValidWhatsApp(lead.wa) ? "fill-current" : ""} />
                                                                    {isValidWhatsApp(lead.wa) ? 'WA Valid' : 'No WA'}
                                                                </div>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const url = lead.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name + ' ' + lead.address)}`;
                                                                        window.open(url, '_blank');
                                                                    }}
                                                                    className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5 transition-all"
                                                                    title="Open in Google Maps"
                                                                >
                                                                    <MapPin size={10} />
                                                                    Gmaps
                                                                </button>
                                                            </div>
                                                        </div>
                                                        
                                                        {isEnriched(lead.status) && (
                                                            <div className="pt-4 border-t border-white/5 flex gap-2">
                                                                 <button 
                                                                    onClick={(e) => { e.stopPropagation(); setForgeLead(lead); setForgeModalOpen(true); }}
                                                                    className="flex-1 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-center justify-center gap-2 transition-all group/forge"
                                                                >
                                                                    <Hammer size={12} className="text-orange-500" />
                                                                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Forge</span>
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedLeadForTweak(lead); setIsTweakerOpen(true); }}
                                                                    className="flex-1 py-3 bg-accent-gold/10 hover:bg-accent-gold/20 border border-accent-gold/30 rounded-xl flex items-center justify-center gap-2 transition-all group/tweak"
                                                                >
                                                                    <Settings2 size={12} className="text-accent-gold" />
                                                                    <span className="text-[10px] font-black text-accent-gold uppercase tracking-widest">Refine</span>
                                                                 </button>
                                                                 {lead.status === 'LIVE' && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => { 
                                                                            e.preventDefault();
                                                                            e.stopPropagation(); 
                                                                            setEditingHtmlLead(lead);
                                                                            setIsEditModalOpen(true);
                                                                        }}
                                                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-2 transition-all group/edit"
                                                                    >
                                                                        <Sliders size={16} className="text-accent-gold group-hover:rotate-12 transition-transform" />
                                                                        <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">Edit Page</span>
                                                                    </button>
                                                                 )}
                                                                 {lead.status !== 'LIVE' && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleGenerateWaLink(lead.id); }}
                                                                        className="flex items-center justify-center w-12 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-xl transition-all"
                                                                    >
                                                                        <Phone size={12} className="text-green-500" />
                                                                    </button>
                                                                 )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <div className="col-span-full py-20 flex flex-col items-center gap-4 text-white/20 bg-white/[0.02] border border-dashed border-white/10 rounded-[32px]">
                                    <Search size={40} className="opacity-50" />
                                    <p className="text-sm font-bold uppercase tracking-widest">No candidates matching these coordinates.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    /* Paginated Table View */
                    <div className="glass overflow-hidden rounded-[32px] border-white/5">
                        <div className="overflow-x-auto scrollbar-hide">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-white/[0.02] border-b border-white/5">
                                        <th className="p-5 w-12">
                                            <div 
                                                onClick={() => {
                                                    if (selectedIds.length === leads.length) setSelectedIds([]);
                                                    else setSelectedIds(leads.map(l => l.id));
                                                }}
                                                className="cursor-pointer"
                                            >
                                                {selectedIds.length === leads.length && leads.length > 0 ? (
                                                    <CheckSquare size={20} className="text-accent-gold" />
                                                ) : (
                                                    <Square size={20} className="text-white/20" />
                                                )}
                                            </div>
                                        </th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-white/40">Business Details</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-white/40">Category</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-white/40">Location</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-white/40">Engagement</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-white/40">Pipeline</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-white/40 text-center">Contact</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-white/40 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence mode="popLayout">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={7} className="p-20 text-center">
                                                    <Loader2 className="animate-spin text-accent-gold mx-auto mb-4" size={32} />
                                                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Querying Leads database...</p>
                                                </td>
                                            </tr>
                                        ) : leads.length > 0 ? (
                                            leads.map((lead, idx) => (
                                                <motion.tr 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    key={lead.id} 
                                                    onClick={() => {
                                                        setDetailLead(lead);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                    className={`border-b border-white/5 hover:bg-white/[0.04] transition-colors group cursor-pointer ${selectedIds.includes(lead.id) ? 'bg-accent-gold/[0.04]' : ''} ${forgingIds.has(lead.id) ? 'opacity-50 pointer-events-none' : ''}`}
                                                >
                                                    <td className="p-5">
                                                        <div 
                                                            className="cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleSelect(lead.id);
                                                            }}
                                                        >
                                                            {selectedIds.includes(lead.id) ? (
                                                                <CheckSquare size={20} className="text-accent-gold" />
                                                            ) : (
                                                                <Square size={20} className="text-white/20 group-hover:text-white/40" />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="font-bold text-white group-hover:text-accent-gold transition-colors">{lead.name}</div>
                                                        <div className="text-[10px] text-white/40 font-mono mt-0.5">{lead.id.slice(0, 8)}...</div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-[10px] font-bold text-zinc-300 inline-flex items-center gap-1.5 uppercase">
                                                            <Building2 size={10} className="text-accent-gold" /> {lead.category}
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex items-start gap-2 max-w-[200px]">
                                                            <MapPin size={12} className="text-white/20 shrink-0 mt-0.5" />
                                                            <span className="text-[11px] text-white/60 line-clamp-1">{lead.address}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <Star size={10} fill="currentColor" className="text-accent-gold" />
                                                                <span className="text-[11px] font-black text-white">{lead.rating || '0.0'}</span>
                                                            </div>
                                                            {lead.status === 'LIVE' && (
                                                                <div className="flex items-center gap-2">
                                                                    <Clock size={10} className="text-indigo-400" />
                                                                    <span className="text-[10px] font-bold text-indigo-400/80">{lead.totalTimeOnPage}s</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex flex-col gap-1">
                                                            <div className={`px-2 py-0.5 w-fit ${(STATUS_BADGES[lead.followupStage] || STATUS_BADGES.sent).bg} ${(STATUS_BADGES[lead.followupStage] || STATUS_BADGES.sent).text} text-[8px] font-black uppercase rounded-md border border-current/20`}>
                                                                {(STATUS_BADGES[lead.followupStage] || STATUS_BADGES.sent).label}
                                                            </div>
                                                            {lead.followupCount > 0 && (
                                                                <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">Follow-up #{lead.followupCount}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const url = lead.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name + ' ' + lead.address)}`;
                                                                    window.open(url, '_blank');
                                                                }}
                                                                className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center text-blue-400/50 hover:text-blue-400 transition-all"
                                                                title="Open in Google Maps"
                                                            >
                                                                <MapPin size={14} />
                                                            </button>
                                                            {lead.htmlCode && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDownload(lead.htmlCode!, lead.name);
                                                                    }}
                                                                    className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center text-white/20 hover:text-accent-gold transition-all"
                                                                    title="Download Source Code"
                                                                >
                                                                    <Download size={14} />
                                                                </button>
                                                            )}
                                                             {lead.status === 'ENRICHED' && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedLeadForTweak(lead); setIsTweakerOpen(true); }}
                                                                    className="w-8 h-8 hover:bg-accent-gold/10 rounded-lg flex items-center justify-center text-accent-gold/50 hover:text-accent-gold transition-all"
                                                                    title="Refine Design & Prompt"
                                                                >
                                                                     <Settings2 size={14} />
                                                                 </button>
                                                             )}
                                                             {lead.status === 'LIVE' && (
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => { 
                                                                        e.preventDefault();
                                                                        e.stopPropagation(); 
                                                                        setEditingHtmlLead(lead);
                                                                        setIsEditModalOpen(true);
                                                                    }}
                                                                    className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-accent-gold transition-all group/edit"
                                                                    title="Edit Page"
                                                                >
                                                                    <Sliders size={16} className="group-hover:rotate-12 transition-transform" />
                                                                </button>
                                                             )}
                                                             {isValidWhatsApp(lead.wa) ? (
                                                                <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500">
                                                                    <Phone size={14} fill="currentColor" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white/10">
                                                                    <CircleDashed size={14} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className={`px-2 py-1 rounded-md border border-current/20 inline-flex text-[9px] font-black uppercase ${STATUS_BADGES[lead.status]?.bg} ${STATUS_BADGES[lead.status]?.text}`}>
                                                                {STATUS_BADGES[lead.status]?.label}
                                                            </div>
                                                            {lead.status === 'LIVE' && (
                                                                <div className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase inline-flex items-center gap-1 ${lead.isPro ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-white/5 text-white/40 border-white/10'}`}>
                                                                    {lead.isPro ? '✨ PRO' : 'STD'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="p-20 text-center text-white/20 italic font-medium uppercase tracking-widest text-xs">
                                                    No intelligence matching these coordinates.
                                                </td>
                                            </tr>
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="p-5 border-t border-white/5 bg-white/[0.01] flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                                    Showing Page <span className="text-white">{page}</span> of <span className="text-white">{totalPages}</span> — {totalLeads} Prospects
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1 || isLoading}
                                        className="flex-1 md:flex-none px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages || isLoading}
                                        className="flex-1 md:flex-none px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* FLOATING ACTION BAR - FIX SURGICAL */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div 
                        initial={{ y: 50, x: '-50%', opacity: 0 }}
                        animate={{ y: 0, x: '-50%', opacity: 1 }}
                        exit={{ y: 50, x: '-50%', opacity: 0 }}
                        className="fixed bottom-10 left-1/2 z-[100] flex items-center gap-3 bg-zinc-950 border border-white/10 p-2 rounded-2xl shadow-2xl backdrop-blur-md"
                    >
                        {/* DELETE: Selalu muncul */}
                        <button 
                            onClick={handleDelete} 
                            className="h-12 w-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-95"
                            title="Hapus Terpilih"
                        >
                            <Trash2 size={18} />
                        </button>

                        <button 
                            onClick={handleArchive}
                            disabled={isArchiving}
                            className="h-12 w-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                            title="Archive to GSheet"
                        >
                            {isArchiving ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        </button>

                        <div className="h-8 w-[1px] bg-white/10 mx-1" />

                        {/* ACTION BUTTON */}
                        <button 
                            onClick={() => {
                                if (filterStatus === 'FRESH') {
                                    handleBatchEnrich();
                                } else {
                                    handleBatchForge();
                                }
                            }}
                            disabled={processing}
                            className="relative h-12 px-8 bg-white text-black rounded-xl font-black text-xs uppercase flex items-center gap-3 overflow-hidden transition-all disabled:w-[320px]"
                        >
                            {processing ? (
                                <>
                                    {/* PROGRESS BAR BACKGROUND */}
                                    <motion.div 
                                        className="absolute inset-0 bg-accent-gold/20"
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '0%' }}
                                        transition={{ duration: 25, ease: "linear" }} // Simulasi progress 25 detik
                                    />
                                    
                                    <Loader2 className="animate-spin relative z-10" size={16} />
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={stages[currentStage]}
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -20, opacity: 0 }}
                                            className="relative z-10 normal-case font-bold text-[11px] tracking-tight"
                                        >
                                            {stages[currentStage]}
                                        </motion.span>
                                    </AnimatePresence>
                                </>
                            ) : (
                                <>
                                    {filterStatus === 'FRESH' ? <Sparkles size={16} /> : <Hammer size={16} />}
                                    <span>{filterStatus === 'FRESH' ? `Enrich ${selectedIds.length} Leads` : `Batch Forge ${selectedIds.length}`}</span>
                                </>
                            )}
                        </button>

                        <button 
                            onClick={() => setSelectedIds([])} 
                            className="h-12 w-12 text-zinc-500 hover:text-white transition-colors flex items-center justify-center"
                            title="Batal"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Forge Modal */}
            {forgeLead && (
                <TheForgeModal 
                    isOpen={forgeModalOpen}
                    onClose={() => {
                        console.log('🔐 TheForgeModal closing, resetting state');
                        setForgeModalOpen(false);
                        setForgeLead(null); // ⚠️ WAJIB null
                    }}
                    lead={forgeLead}
                />
            )}

            {/* Detail Modal - PASTIKAN DI LUAR TABEL SCOPE */}
            {detailLead && (
                <LeadDetailModal 
                    isOpen={isDetailModalOpen}
                    onClose={() => {
                        console.log('🔐 LeadDetailModal closing, resetting state');
                        setIsDetailModalOpen(false);
                        setDetailLead(null); // ⚠️ WAJIB null
                    }}
                     lead={detailLead}
                     onDraftSave={(newDraft) => {
                         setLeads(prev => prev.map(l => 
                             l.id === detailLead.id 
                             ? { ...l, outreachDraft: newDraft } 
                             : l
                         ));
                     }}
                 />
             )}

            {/* Edit HTML Modal - Moved to most bottom level as requested */}
            {editingHtmlLead && (
                <LiveEditModal 
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        console.log('🔐 LiveEditModal closing, resetting state');
                        setIsEditModalOpen(false);
                        setEditingHtmlLead(null); // ⚠️ WAJIB null
                    }}
                    lead={editingHtmlLead}
                />
            )}

            {/* Design Tweaker Modal */}
            {selectedLeadForTweak && (
                <DesignTweakerModal 
                    isOpen={isTweakerOpen}
                    onClose={() => {
                        setIsTweakerOpen(false);
                        setSelectedLeadForTweak(null);
                    }}
                    onSuccess={(newPrompt) => {
                        if (selectedLeadForTweak) {
                            setLeads(prev => prev.map(l => 
                                l.id === selectedLeadForTweak.id 
                                ? { ...l, masterWebsitePrompt: newPrompt } 
                                : l
                            ));
                        }
                    }}
                    lead={selectedLeadForTweak}
                />
            )}
         </div>
     );
 }
