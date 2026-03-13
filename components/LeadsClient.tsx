'use client';

import { useState, useMemo } from 'react';
import { 
    Zap, Globe, Phone, Star, CheckCircle2, Loader2, 
    Trash2, Building2, MapPin, ChevronDown,
    Search, Square, CheckSquare, Sparkles, X, AlertTriangle
} from 'lucide-react';
import { batchEnrichLeads, deleteLeads } from '@/lib/actions';
import { motion, AnimatePresence } from 'framer-motion';

function isValidWhatsApp(phone: string): boolean {
    if (!phone || phone === 'N/A') return false;
    const waRegex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
    return waRegex.test(phone.replace(/\s+/g, '').replace(/-/g, ''));
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
    status: 'FRESH' | 'ENRICHED' | 'READY' | 'FINISH';
    brandData: any;
    painPoints?: string;
    createdAt: string;
    updatedAt: string;
}

interface LeadsClientProps {
    initialLeads: Lead[];
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

export default function LeadsClient({ initialLeads }: LeadsClientProps) {
    const [leads, setLeads] = useState<Lead[]>(initialLeads);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [enriching, setEnriching] = useState(false);

    // Filter States
    const [filterCategory, setFilterCategory] = useState('ALL CATEGORIES');
    const [filterStatus, setFilterStatus] = useState('ALL STATUS');
    const [searchTerm, setSearchTerm] = useState('');

    // Reactive Filtering
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const matchesCategory = filterCategory === 'ALL CATEGORIES' || lead.category === filterCategory;
            const matchesStatus = filterStatus === 'ALL STATUS' || lead.status === filterStatus;
            const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                (lead.address && lead.address.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesCategory && matchesStatus && matchesSearch;
        });
    }, [leads, filterCategory, filterStatus, searchTerm]);

    const handleBatchEnrich = async () => {
        if (selectedIds.length === 0) return;
        setEnriching(true);
        try {
            await batchEnrichLeads(selectedIds);
            // Optimistic update
            setLeads(prev => prev.map(l => 
                selectedIds.includes(l.id) ? { ...l, status: 'ENRICHED' as const } : l
            ));
            setSelectedIds([]);
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
                    </div>
                </div>
            </div>

            {/* Leads Card Grid */}
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

                                                {lead.painPoints && (
                                                    <div className="pt-4 border-t border-white/5 space-y-2">
                                                        <p className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest flex items-center gap-1.5">
                                                            <AlertTriangle size={10} /> Core Pain Points
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {lead.painPoints.split(',').map((point, idx) => (
                                                                <div key={idx} className="bg-amber-500/5 border border-amber-500/10 px-2 py-1 rounded-lg text-[9px] text-zinc-300 flex items-center gap-1.5">
                                                                    <div className="w-1 h-1 rounded-full bg-amber-500" />
                                                                    {point.trim()}
                                                                </div>
                                                            ))}
                                                        </div>
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
                                                    
                                                    <span className="text-[10px] text-white/20 font-mono">#{i + 1}</span>
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
        </div>
    );
}
