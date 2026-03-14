'use client';

import { useState, useMemo } from 'react';
import { 
    Zap, Globe, Phone, Star, CheckCircle2, Loader2, 
    Trash2, Building2, MapPin, ChevronDown,
    Search, Square, CheckSquare, Sparkles, X, AlertTriangle,
    Check, Copy, Image as ImageIcon, Lightbulb, Settings2, Sliders, ChevronRight
} from 'lucide-react';
import { batchEnrichLeads, deleteLeads, getRecommendedStyles, tweakLeadStyle, getStyleModels, getLeads, getLeadsCount } from '@/lib/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

function isValidWhatsApp(phone: string): boolean {
    if (!phone || phone === 'N/A') return false;
    const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    const waRegex = /^(\+62|62|0)8[1-9][0-9]{7,11}$/;
    return waRegex.test(cleanPhone);
}

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
    reviews: any; // Added
    status: 'FRESH' | 'ENRICHED' | 'READY' | 'FINISH';
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
};

const CATEGORIES = [
    'ALL CATEGORIES',
    'Barber shop', 'Cafe', 'Coffee shop', 'Dental Clinic', 'Gym',
    'Restaurant', 'Bakery', 'Beauty Salon', 'Fabric Store', 'Paint Store',
    'Car Accessories Store', 'Auto Detailing Service', 'Hardware Store',
    'Law Firm', 'Interior Design', 'Wedding Organizer',
    'Pet Shop', 'Laundry Service', 'Photography Studio'
];

const STATUS_FILTERS = ['ALL STATUS', 'FRESH', 'ENRICHED', 'READY', 'FINISH'];

export default function LeadsClient({ initialLeads, forceStatus }: LeadsClientProps) {
    const [leads, setLeads] = useState<Lead[]>(initialLeads);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [enriching, setEnriching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Filter States
    const [filterCategory, setFilterCategory] = useState('ALL CATEGORIES');
    const [filterStatus, setFilterStatus] = useState<string>(forceStatus || 'ALL STATUS');
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalLeads, setTotalLeads] = useState(0);
    const pageSize = 10;

    // Tweak State
    const [tweakModalOpen, setTweakModalOpen] = useState(false);
    const [tweakingLead, setTweakingLead] = useState<Lead | null>(null);
    const [allStyles, setAllStyles] = useState<any[]>([]);
    const [recommendedStyleIds, setRecommendedStyleIds] = useState<string[]>([]);
    const [isRegenerating, setIsRegenerating] = useState(false);

    // Fetch leads when filters or page change
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const status = filterStatus === 'ALL STATUS' ? undefined : (filterStatus as any);
            const category = filterCategory === 'ALL CATEGORIES' ? undefined : filterCategory;
            
            const [fetchedLeads, count] = await Promise.all([
                getLeads({ 
                    status, 
                    category, 
                    search: searchTerm, 
                    page, 
                    pageSize 
                }),
                getLeadsCount({ 
                    status, 
                    category, 
                    search: searchTerm 
                })
            ]);
            
            setLeads(fetchedLeads as any);
            setTotalLeads(count);
            setIsLoading(false);
        };

        // Skip fetch on initial mount if initialLeads matches
        if (page === 1 && filterCategory === 'ALL CATEGORIES' && filterStatus === (forceStatus || 'ALL STATUS') && !searchTerm) {
            // But we still need totalCount
            getLeadsCount({ 
                status: filterStatus === 'ALL STATUS' ? undefined : (filterStatus as any), 
                category: filterCategory === 'ALL CATEGORIES' ? undefined : filterCategory, 
                search: searchTerm 
            }).then(setTotalLeads);
        } else {
            fetchData();
        }
    }, [page, filterCategory, filterStatus, searchTerm, forceStatus]);

    useEffect(() => {
        const loadStyles = async () => {
            const styles = await getStyleModels();
            if (styles) setAllStyles(styles);
        };
        loadStyles();
    }, []);

    const openTweakModal = async (lead: Lead) => {
        setTweakingLead(lead);
        setTweakModalOpen(true);
        const recommendations = await getRecommendedStyles(lead.category);
        setRecommendedStyleIds(recommendations);
    };

    const handleTweakStyle = async (styleId: string) => {
        if (!tweakingLead) return;
        setIsRegenerating(true);
        try {
            const res = await tweakLeadStyle(tweakingLead.id, styleId);
            if (res.success) {
                setLeads(prev => prev.map(l => 
                    l.id === tweakingLead.id ? { ...l, masterWebsitePrompt: res.masterWebsitePrompt } : l
                ));
                setTweakModalOpen(false);
            } else {
                alert(res.message);
            }
        } catch (e) {
            alert("Gagal mengubah style");
        } finally {
            setIsRegenerating(false);
        }
    };


    // Reactive Filtering (Not strictly needed with effect but kept for consistency)
    const filteredLeads = leads;
    const totalPages = Math.ceil(totalLeads / pageSize);

    const handleBatchEnrich = async () => {
        if (selectedIds.length === 0) return;
        setEnriching(true);
        try {
            await batchEnrichLeads(selectedIds);
            // Optimistic update: If we are in the main leads view (not forceStatus), 
            // enriched leads should disappear from the table.
            setLeads(prev => {
                if (!forceStatus) {
                    return prev.filter(l => !selectedIds.includes(l.id));
                }
                return prev.map(l => 
                    selectedIds.includes(l.id) ? { ...l, status: 'ENRICHED' as const } : l
                );
            });
            setSelectedIds([]);
            // Also update totalLeads count locally
            if (!forceStatus) setTotalLeads(prev => prev - selectedIds.length);
        } catch (e) {
            alert("Enrichment failed");
        } finally {
            setEnriching(false);
        }
    };

    const handleBulkDelete = async () => {
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
                        <span className="text-xl font-mono font-bold text-accent-gold">{leads.length}</span>
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

                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative group flex-1 md:w-48">
                            <select 
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 appearance-none outline-none focus:border-accent-gold/40 transition-all text-xs font-bold uppercase tracking-widest cursor-pointer"
                            >
                                {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-zinc-950">{cat}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={14} />
                        </div>

                    {!forceStatus && (
                        <div className="relative group flex-1 md:w-40">
                            <select 
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-4 appearance-none outline-none focus:border-accent-gold/40 transition-all text-xs font-bold uppercase tracking-widest cursor-pointer"
                            >
                                {STATUS_FILTERS.map(s => <option key={s} value={s} className="bg-zinc-950">{s}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={14} />
                        </div>
                    )}
                    </div>
                </div>
            </div>

            {/* Leads View */}
            {forceStatus === 'ENRICHED' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                        className={`glass p-6 rounded-[32px] border-white/5 hover:border-accent-gold/30 transition-all group relative ${selectedIds.includes(lead.id) ? 'border-accent-gold/40 bg-accent-gold/[0.03]' : ''} ${isEnriched(lead.status) ? 'opacity-90' : ''}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Checkbox */}
                                            <div
                                                onClick={() => !isEnriched(lead.status) && toggleSelect(lead.id)}
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
                                                            <p className="text-xs text-white/90 leading-relaxed font-medium">
                                                                {lead.resolvingIdea}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {lead.painPoints && (
                                                        <div className="pt-4 border-t border-white/5 space-y-4">
                                                            <div className="space-y-2">
                                                                <p className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest flex items-center gap-1.5">
                                                                    <AlertTriangle size={10} /> Core Pain Points
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {lead.painPoints.split(',').map((point, idx) => (
                                                                        <div key={idx} className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-[9px] text-zinc-300 flex items-center gap-1.5">
                                                                            <div className="w-1 h-1 rounded-full bg-amber-500" />
                                                                            {point.trim()}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {lead.resolutions && (lead.resolutions as any).length > 0 && (
                                                                <div className="space-y-3">
                                                                    <p className="text-[10px] font-black text-green-500/80 uppercase tracking-widest flex items-center gap-1.5">
                                                                        <Lightbulb size={10} /> Strategic Resolutions
                                                                    </p>
                                                                    <div className="space-y-2">
                                                                        {(lead.resolutions as any).map((res: any, idx: number) => (
                                                                            <div key={idx} className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl text-[10px] text-white/70 leading-relaxed italic">
                                                                                "{res}"
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {lead.suggestedAssets && (lead.suggestedAssets as any).length > 0 && (
                                                                <div className="space-y-2">
                                                                    <p className="text-[10px] font-black text-blue-500/80 uppercase tracking-widest flex items-center gap-1.5">
                                                                        <ImageIcon size={10} /> Suggested Assets
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {(lead.suggestedAssets as any).map((asset: any, idx: number) => (
                                                                            <div key={idx} className="bg-blue-500/5 border border-blue-500/10 px-2.5 py-1 rounded-full text-[9px] text-zinc-300 font-bold">
                                                                                {asset}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {lead.masterWebsitePrompt && (
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => handleCopyPrompt(lead.masterWebsitePrompt!, lead.id)}
                                                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-2 transition-all group/btn"
                                                                    >
                                                                        {copiedId === lead.id ? (
                                                                            <>
                                                                                <Check size={14} className="text-green-500" />
                                                                                <span className="text-[10px] font-black text-white/80 uppercase">Prompt Copied!</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Copy size={14} className="text-accent-gold group-hover/btn:scale-110 transition-transform" />
                                                                                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Copy Master Prompt</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => openTweakModal(lead)}
                                                                        className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-all group/tweak"
                                                                        title="Tweak Style"
                                                                    >
                                                                        <Settings2 size={16} className="text-white/40 group-hover:text-amber-400 transition-colors" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                        <div className="flex gap-2">
                                                            <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5 ${lead.website === 'N/A' || !lead.website ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                                                <Globe size={10} />
                                                                {lead.website === 'N/A' || !lead.website ? 'Missing' : 'Portal'}
                                                            </div>
                                                            <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5 ${isValidWhatsApp(lead.wa) ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-white/5 text-white/20'}`}>
                                                                <Phone size={10} className={isValidWhatsApp(lead.wa) ? "fill-current" : ""} />
                                                                {isValidWhatsApp(lead.wa) ? 'WhatsApp Valid' : 'No WA'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="col-span-full py-32 flex flex-col items-center gap-4 text-white/20 italic bg-white/[0.02] border border-dashed border-white/10 rounded-[40px]">
                                <Search size={40} className="opacity-50" />
                                <p className="text-lg">No candidates match your current filters.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            ) : (
                /* Paginated Table View */
                <div className="glass overflow-hidden rounded-[32px] border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
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
                                                className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors group ${selectedIds.includes(lead.id) ? 'bg-accent-gold/[0.03]' : ''}`}
                                            >
                                                <td className="p-5">
                                                    <div onClick={() => toggleSelect(lead.id)} className="cursor-pointer">
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
                                                        <MapPin size={12} className="text-accent-gold shrink-0 mt-0.5" />
                                                        <span className="text-[11px] text-white/60 line-clamp-2">{lead.address}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Star size={12} fill="currentColor" className="text-accent-gold" />
                                                        <span className="text-xs font-black text-white">{lead.rating}</span>
                                                        <span className="text-[10px] text-white/20 font-bold ml-1">({(lead.reviews as any)?.length || 0} Reviews)</span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${isValidWhatsApp(lead.wa) ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                        <Phone size={10} fill={isValidWhatsApp(lead.wa) ? "currentColor" : "none"} />
                                                        {lead.wa}
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <div className={`inline-block px-2 py-0.5 rounded-md text-[8px] font-black border border-current/20 ${STATUS_BADGES[lead.status].bg} ${STATUS_BADGES[lead.status].text}`}>
                                                        {lead.status}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="p-32 text-center">
                                                <Search size={40} className="text-white/10 mx-auto mb-4" />
                                                <p className="text-lg text-white/20 italic">No fresh leads found. Enrich or Scrape more.</p>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalLeads > pageSize && (
                        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                            <div className="text-xs font-bold text-white/40 uppercase tracking-widest">
                                Page <span className="text-white">{page}</span> of <span className="text-white">{totalPages}</span>
                                <span className="ml-4 opacity-50">({totalLeads} Total)</span>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || isLoading}
                                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || isLoading}
                                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, x: '-50%', opacity: 0 }}
                        animate={{ y: 0, x: '-50%', opacity: 1 }}
                        exit={{ y: 100, x: '-50%', opacity: 0 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-2 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    >
                        <div className="px-6 py-4 flex items-center gap-3 border-r border-white/5">
                            <span className="text-sm font-black text-accent-gold">{selectedIds.length}</span>
                            <span className="text-xs font-bold text-white/40 uppercase tracking-widest leading-none">Candidates<br />Selected</span>
                        </div>

                        <div className="flex items-center gap-2 p-1">
                            <button
                                onClick={handleBatchEnrich}
                                disabled={enriching}
                                className="h-14 px-8 bg-accent-gold text-black font-black rounded-2xl flex items-center gap-3 hover:bg-white transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 text-xs uppercase tracking-tighter"
                            >
                                {enriching ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
                                Ignite Enrichment
                            </button>

                            <button
                                onClick={handleBulkDelete}
                                className="h-14 px-8 bg-zinc-800 text-red-400 font-bold rounded-2xl flex items-center gap-3 hover:bg-red-500/10 transition-all text-xs uppercase tracking-tighter"
                            >
                                <Trash2 size={16} />
                                Delete Selected
                            </button>

                            <button
                                onClick={() => setSelectedIds([])}
                                className="h-14 w-14 bg-white/5 text-white/40 hover:text-white rounded-2xl flex items-center justify-center transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tweak Style Modal */}
            <AnimatePresence>
                {tweakModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isRegenerating && setTweakModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl max-h-[80vh] bg-zinc-950 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                                        <Settings2 className="text-amber-400" /> Tweak Website Style
                                    </h2>
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                                        Refining: <span className="text-white">{tweakingLead?.name}</span>
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setTweakModalOpen(false)}
                                    disabled={isRegenerating}
                                    className="p-3 hover:bg-white/5 rounded-2xl text-white/20 hover:text-white transition-all disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {allStyles
                                    .sort((a, b) => {
                                        const aRec = recommendedStyleIds.includes(a.id) ? 1 : 0;
                                        const bRec = recommendedStyleIds.includes(b.id) ? 1 : 0;
                                        return bRec - aRec;
                                    })
                                    .map((style) => {
                                        const isRecommended = recommendedStyleIds.includes(style.id);
                                        return (
                                            <button
                                                key={style.id}
                                                onClick={() => handleTweakStyle(style.id)}
                                                disabled={isRegenerating}
                                                className={`w-full group relative flex items-center gap-4 p-4 rounded-3xl transition-all text-left disabled:opacity-50 ${
                                                    isRecommended 
                                                    ? 'bg-amber-400/[0.05] border border-amber-400/30 hover:border-amber-400/60 hover:bg-amber-400/[0.08]' 
                                                    : 'bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                                                }`}
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                                    {style.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white group-hover:text-amber-400 transition-colors uppercase text-sm">{style.name}</span>
                                                        {isRecommended && (
                                                            <span className="px-2 py-0.5 bg-amber-400 text-black text-[8px] font-black uppercase rounded-md flex items-center gap-1">
                                                                <Zap size={8} fill="currentColor" /> AI RECOMMENDED
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-white/40 line-clamp-1 mt-0.5 font-medium">{style.description}</p>
                                                </div>
                                                <ChevronRight size={16} className={`transition-all ${isRecommended ? 'text-amber-400' : 'text-white/10'} group-hover:translate-x-1`} />
                                                
                                                {isRegenerating && tweakingLead?.id === style.id && (
                                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-3xl flex items-center justify-center">
                                                        <Loader2 className="animate-spin text-amber-400" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                            </div>

                            {isRegenerating && (
                                <div className="p-6 bg-amber-400/10 border-t border-amber-400/20 flex items-center justify-center gap-3">
                                    <Loader2 className="animate-spin text-amber-400" size={18} />
                                    <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Regenerating Master Prompt...</span>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
