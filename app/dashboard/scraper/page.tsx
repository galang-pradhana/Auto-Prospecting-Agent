'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Search, MapPin, Star, Globe, Loader2,
    Zap, CheckCircle2, Navigation, 
    Building2, Map, Landmark, Trash2, CheckSquare, Square,
    Sparkles, ChevronDown, X, RefreshCcw, ChevronsUpDown, Check, Circle, AlertTriangle
} from 'lucide-react';
import { 
    runScraper, batchEnrichLeads, deleteLeads,
    getProvinces, getCities, getDistricts, cleanupOldLeads,
    getRegionalAdvice
} from '@/lib/actions';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
    'Barber shop', 'Cafe', 'Coffee shop', 'Dental Clinic', 'Gym',
    'Restaurant', 'Bakery', 'Beauty Salon', 'Fabric Store', 'Paint Store',
    'Car Accessories Store', 'Auto Detailing Service', 'Hardware Store',
    'Law Firm', 'Interior Design', 'Wedding Organizer',
    'Pet Shop', 'Laundry Service', 'Photography Studio'
];

// Searchable Combobox Component
function SearchCombobox({ value, onChange, options, placeholder }: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder: string;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setOpen(false);
            setSearch('');
        }
    };

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    if (!options || options.length === 0) {
        const isDistricts = placeholder.toLowerCase().includes('district');
        const isFetching = placeholder.toLowerCase().includes('fetching');
        return (
            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-500 text-sm italic flex items-center gap-2">
                {isFetching && <Loader2 size={14} className="animate-spin text-accent-gold" />}
                {isDistricts ? (isFetching ? placeholder : "No districts found") : "Loading regions..."}
            </div>
        );
    }

    return (
        <div ref={ref} className="relative w-full" onKeyDown={handleKeyDown}>
            <button
                type="button"
                onClick={() => { setOpen(!open); setSearch(''); }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-left outline-none focus:border-accent-gold/50 focus:ring-4 focus:ring-accent-gold/5 transition-all text-zinc-100 font-semibold text-sm flex items-center justify-between cursor-pointer hover:border-zinc-600"
            >
                <span className="truncate">{value || placeholder}</span>
                <ChevronsUpDown size={16} className={`shrink-0 ml-2 transition-colors ${open ? 'text-accent-gold' : 'text-zinc-500'}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 z-[9999] mt-2 w-full bg-zinc-950 border border-zinc-700 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] ring-1 ring-white/5"
                        style={{ top: '100%' }}
                    >
                        <div className="p-3 border-b-2 border-zinc-700/80 bg-zinc-950 rounded-t-2xl">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder={`Cari ${placeholder.toLowerCase()}...`}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/10 transition-all"
                                />
                            </div>
                        </div>
                        <div className="max-h-[220px] overflow-y-auto py-1">
                            {filtered.length > 0 ? filtered.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => { onChange(opt); setOpen(false); setSearch(''); }}
                                    className={`w-full text-left px-5 py-3 text-sm flex items-center justify-between transition-all ${
                                        opt === value
                                            ? 'bg-accent-gold/15 text-accent-gold font-bold'
                                            : 'text-zinc-200 hover:bg-zinc-800/80 hover:text-white'
                                    }`}
                                >
                                    <span className="truncate">{opt}</span>
                                    {opt === value && <Check size={14} className="text-accent-gold shrink-0" />}
                                </button>
                            )) : (
                                <div className="px-5 py-6 text-sm text-zinc-500 italic text-center flex flex-col items-center gap-2">
                                    <Search size={16} className="text-zinc-600" />
                                    Tidak ditemukan "{search}"
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function ScraperPage() {
    const [loading, setLoading] = useState(false);
    const [provinces, setProvinces] = useState<string[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [districts, setDistricts] = useState<string[]>([]);
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
    const [includeDistricts, setIncludeDistricts] = useState(false);
    const [previewLeads, setPreviewLeads] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [enriching, setEnriching] = useState(false);
    const [fetchingDistricts, setFetchingDistricts] = useState(false);
    const [stats, setStats] = useState({ new: 0, duplicate: 0, fresh: 0, aiRejected: 0 });
    const [advice, setAdvice] = useState<any>(null);
    const [loadingAdvice, setLoadingAdvice] = useState(false);

    useEffect(() => {
        const loadProvinces = async () => {
            const list = await getProvinces();
            setProvinces(list);
            if (list.length > 0) setSelectedProvince(list[0]);
        };
        loadProvinces();
    }, []);

    useEffect(() => {
        const loadCities = async () => {
            if (!selectedProvince) return;
            const list = await getCities(selectedProvince);
            setCities(list);
            if (list.length > 0) setSelectedCity(list[0]);
            setSelectedDistrict('');
            setDistricts([]);
        };
        loadCities();
    }, [selectedProvince]);

    useEffect(() => {
        const loadDistricts = async () => {
            if (!selectedProvince || !selectedCity) return;
            console.log(`[ScraperPage] Fetching districts for: ${selectedProvince} -> ${selectedCity}`);
            setFetchingDistricts(true);
            try {
                const list = await getDistricts(selectedProvince, selectedCity);
                console.log(`[ScraperPage] Received ${list?.length || 0} districts`);
                setDistricts(list || []);
            } catch (error) {
                console.error("[ScraperPage] Failed to fetch districts:", error);
                setDistricts([]);
            } finally {
                setFetchingDistricts(false);
            }
        };
        loadDistricts();
    }, [selectedProvince, selectedCity]);

    // AUTO-TOGGLE: Disable expansion if district is selected
    useEffect(() => {
        if (selectedDistrict) setIncludeDistricts(false);
    }, [selectedDistrict]);

    useEffect(() => {
        const fetchLatest = async () => {
            try {
                const res = await fetch('/api/leads?status=FRESH');
                if (res.ok) {
                    const latest = await res.json();
                    setPreviewLeads(latest.slice(0, 15));
                }
                const statsRes = await fetch('/api/stats');
                if (statsRes.ok) {
                    setStats(await statsRes.json());
                }
            } catch (e) {
                console.error("Polling error:", e);
            }
        };

        fetchLatest();
        const interval = setInterval(fetchLatest, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleScrape = async () => {
        setLoading(true);
        try {
            // Refined surgical keyword
            const keyword = selectedDistrict 
                ? `${selectedCategory} in ${selectedDistrict}, ${selectedCity}, ${selectedProvince}`
                : `${selectedCategory} in ${selectedCity}, ${selectedProvince}`;

            const result = await runScraper(
                keyword, 
                10, 
                0, 
                5, 
                false, 
                25000, // radius meter
                false, 
                selectedCategory,
                selectedCity,
                selectedProvince,
                includeDistricts,
                selectedDistrict
            );

            if (!(result as any).success) {
                throw new Error((result as any).message || 'Scraper failed to start');
            }
            alert('Surgical scraping initiated! Watch the live FRESH feed.');
        } catch (error: any) {
            alert(`Scraper Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Hapus ${selectedIds.length} leads terpilih?`)) return;

        try {
            const res = await deleteLeads(selectedIds);
            if (res.success) {
                setPreviewLeads(prev => prev.filter(l => !selectedIds.includes(l.id)));
                setSelectedIds([]);
            }
        } catch (e) {
            alert("Gagal menghapus leads");
        }
    };

    const handleBatchEnrich = async () => {
        if (selectedIds.length === 0) return;
        setEnriching(true);
        try {
            await batchEnrichLeads(selectedIds);
            alert(`${selectedIds.length} leads enriched! Check Leads page.`);
            setSelectedIds([]);
        } catch (e) {
            alert("Enrichment failed");
        } finally {
            setEnriching(false);
        }
    };

    const handleCleanup = async () => {
        if (!confirm('Hapus semua lead FRESH yang sudah lebih dari 14 hari?')) return;
        setLoading(true);
        try {
            const res = await cleanupOldLeads();
            alert(res.message);
        } catch (e) {
            alert("Cleanup failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGetAdvice = async () => {
        if (!selectedProvince || !selectedCity) {
            alert("Pilih Provinsi dan Kota terlebih dahulu!");
            return;
        }
        setLoadingAdvice(true);
        try {
            const res = await getRegionalAdvice(selectedProvince, selectedCity, selectedCategory);
            setAdvice(res);
        } catch (e) {
            alert("Gagal mengambil saran AI.");
        } finally {
            setLoadingAdvice(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-32">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black mb-2 tracking-tighter flex items-center gap-3 text-white">
                        Scraper Hub 
                        <span className="text-xs bg-accent-gold/20 text-accent-gold px-3 py-1 rounded-full uppercase tracking-[0.2em]">DB-SYNC v5.0</span>
                    </h1>
                    <p className="text-white/40 italic font-medium">Data flows directly to Supabase. Real-time lead ingestion.</p>
                </div>

                <div className="flex gap-4">
                    <div className="glass px-6 py-3 rounded-2xl flex items-center gap-6 border-white/5 bg-zinc-900/40">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Fresh in DB</span>
                            <span className="font-mono text-zinc-100 font-bold">{stats.fresh}</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={12} className="text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">AI Rejected</span>
                            <span className="font-mono text-amber-500 font-bold">{stats.aiRejected || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass p-8 rounded-[40px] border-white/5 relative z-30 shadow-2xl bg-zinc-950/40">
                <form className="relative z-10 flex flex-col md:flex-row items-end gap-6" onSubmit={(e) => { e.preventDefault(); handleScrape(); }}>
                    <div className="flex-1 w-full space-y-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-accent-gold flex items-center gap-2">
                            <Building2 size={14} /> Category
                        </label>
                        <SearchCombobox value={selectedCategory} onChange={setSelectedCategory} options={CATEGORIES} placeholder="Category" />
                    </div>
                    <div className="flex-1 w-full space-y-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-accent-gold flex items-center gap-2">
                            <Landmark size={14} /> Province
                        </label>
                        <SearchCombobox value={selectedProvince} onChange={setSelectedProvince} options={provinces} placeholder="Province" />
                    </div>
                    <div className="flex-1 w-full space-y-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-accent-gold flex items-center gap-2">
                            <MapPin size={14} /> City
                        </label>
                        <SearchCombobox value={selectedCity} onChange={setSelectedCity} options={cities} placeholder="City" />
                    </div>
                    <div className={`flex-1 w-full space-y-3 transition-all ${!selectedCity ? 'opacity-30' : 'opacity-100'}`}>
                        <label className="text-xs font-bold uppercase tracking-widest text-accent-gold flex items-center gap-2">
                            <Navigation size={14} /> District
                        </label>
                        <SearchCombobox 
                            value={selectedDistrict} 
                            onChange={setSelectedDistrict} 
                            options={fetchingDistricts ? [] : districts} 
                            placeholder={fetchingDistricts ? "Fetching from cloud..." : (selectedCity ? "All Districts" : "Select City First")} 
                        />
                    </div>

                    <div 
                        className={`h-[60px] flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-6 group hover:border-zinc-600 transition-all cursor-pointer ${selectedDistrict ? 'opacity-40 grayscale cursor-not-allowed' : ''}`} 
                        onClick={() => !selectedDistrict && setIncludeDistricts(!includeDistricts)}
                    >
                        <div className="flex-1">
                            <p className="text-[9px] font-black text-accent-gold uppercase tracking-widest">Expansion Mode</p>
                            <p className="text-[11px] text-white/60 font-bold truncate">Include Districts</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${includeDistricts ? 'bg-accent-gold text-black rotate-12' : 'bg-white/5 text-white/20'}`}>
                            <MapPin size={18} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="h-[60px] px-10 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-accent-gold transition-all shadow-2xl disabled:opacity-50 text-sm uppercase tracking-tighter"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                        Ignite Engine
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 flex flex-col bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl relative min-h-[600px]">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md sticky top-0 z-20">
                        <h3 className="font-bold flex items-center gap-2 text-white">
                            Live Fresh Stream {loading && <Loader2 size={16} className="animate-spin text-accent-gold ml-2" />}
                        </h3>
                        <div className="flex items-center gap-4">
                            {selectedIds.length > 0 && (
                                <span className="text-[10px] bg-accent-gold text-black px-2 py-0.5 rounded-full font-black animate-pulse">
                                    {selectedIds.length} SELECTED
                                </span>
                            )}
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Operational Feed</span>
                        </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AnimatePresence mode="popLayout">
                            {previewLeads.length > 0 ? (
                                previewLeads.map((lead) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        key={lead.id}
                                        className={`glass p-6 rounded-[32px] border-white/5 hover:border-accent-gold/30 transition-all group relative ${selectedIds.includes(lead.id) ? 'border-accent-gold/40 bg-accent-gold/[0.03]' : ''}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div onClick={() => toggleSelect(lead.id)} className="mt-1 cursor-pointer">
                                                {selectedIds.includes(lead.id) ? <CheckSquare size={20} className="text-accent-gold" /> : <Square size={20} className="text-white/20 group-hover:text-white/40" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-white group-hover:text-accent-gold transition-colors text-sm truncate">{lead.name}</div>
                                                <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1 mb-3 flex items-center gap-1">
                                                    <Building2 size={10} className="text-accent-gold" /> {lead.category}
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-white/60 mb-4">
                                                    <MapPin size={12} className="text-accent-gold shrink-0" />
                                                    <span className="line-clamp-1">{lead.address}</span>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                                    <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5 ${lead.website === 'N/A' || !lead.website ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                                        <Globe size={10} /> {lead.website === 'N/A' ? 'Missing' : 'Portal'}
                                                    </div>
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full border border-white/5">
                                                        <Star size={10} fill="currentColor" className="text-accent-gold" />
                                                        <span className="text-[10px] font-black text-white">{lead.rating}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="col-span-full py-32 flex flex-col items-center justify-center text-white/10 italic">
                                    <Search size={40} className="mb-4 animate-pulse" />
                                    <p>Awaiting live database stream...</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass p-8 rounded-[40px] border-white/5 bg-zinc-950/40">
                        <h3 className="text-lg font-black text-white mb-6 tracking-tighter flex items-center gap-2">
                            <Zap size={20} className="text-accent-gold" /> 
                            MAINTENANCE
                        </h3>
                        
                        <div className="space-y-4">
                            <button 
                                onClick={handleCleanup}
                                disabled={loading}
                                className="w-full p-6 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-white/10 transition-all group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black text-accent-gold uppercase tracking-widest">Stale Purge</span>
                                    <Trash2 size={16} className="text-white/20 group-hover:text-red-400 transition-colors" />
                                </div>
                                <p className="text-sm font-bold text-white">Cleanup Old Leads</p>
                                <p className="text-[10px] text-white/40 mt-1">Hapus lead FRESH yang sudah {'>'} 14 hari.</p>
                            </button>

                            <div className="p-6 bg-accent-gold/5 border border-accent-gold/10 rounded-3xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-accent-gold flex items-center justify-center text-black">
                                        <Sparkles size={16} />
                                    </div>
                                    <span className="text-xs font-black text-white uppercase tracking-widest">Auto Compression</span>
                                </div>
                                <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                                    Data ulasan mentah otomatis dihapus setelah AI Enrichment untuk menghemat storage database.
                                </p>
                            </div>

                            <button 
                                onClick={handleGetAdvice}
                                disabled={loadingAdvice || !selectedCity}
                                className="w-full p-6 bg-accent-gold/10 border border-accent-gold/20 rounded-3xl text-left hover:bg-accent-gold/20 transition-all group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black text-accent-gold uppercase tracking-widest">AI Strategist</span>
                                    {loadingAdvice ? (
                                        <Loader2 size={16} className="animate-spin text-accent-gold" />
                                    ) : (
                                        <Sparkles size={16} className="text-accent-gold group-hover:scale-110 transition-transform" />
                                    )}
                                </div>
                                <p className="text-sm font-bold text-white">AI Regional Advice</p>
                                <p className="text-[10px] text-white/40 mt-1">Saran area potensial untuk {selectedCategory}.</p>
                            </button>

                            <button className="w-full p-6 border border-white/5 bg-zinc-900 rounded-3xl text-left opacity-50 cursor-not-allowed">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black text-white/40 uppercase tracking-widest">Archive</span>
                                    <Globe size={16} className="text-white/10" />
                                </div>
                                <p className="text-sm font-bold text-white/40">Google Sheets Ops</p>
                                <p className="text-[10px] text-white/20 mt-1">Coming soon: Export FINISH leads.</p>
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {advice && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="glass p-8 rounded-[40px] border-white/10 bg-zinc-950/80 backdrop-blur-3xl shadow-3xl relative overflow-hidden"
                            >
                                <button 
                                    onClick={() => setAdvice(null)}
                                    className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
                                >
                                    <X size={18} />
                                </button>
                                
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-2xl bg-accent-gold flex items-center justify-center text-black">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-widest">AI Analysis</h4>
                                        <p className="text-[10px] font-bold text-accent-gold/60">{selectedCity}, {selectedProvince}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {advice.recommendations?.map((rec: any, i: number) => (
                                        <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                            <p className="text-xs font-black text-accent-gold uppercase mb-1 tracking-tighter">{rec.area}</p>
                                            <p className="text-[11px] text-white/60 leading-relaxed">{rec.reason}</p>
                                        </div>
                                    ))}
                                    {advice.summary && (
                                        <div className="pt-4 border-t border-white/5 mt-4">
                                            <p className="text-[11px] text-white/40 italic leading-relaxed">
                                                "{advice.summary}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="glass p-8 rounded-[40px] border-white/5 bg-zinc-900/20">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle size={14} className="text-amber-500" />
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Retention Policy</span>
                        </div>
                        <ul className="space-y-3">
                            <li className="text-[11px] text-white/40 flex items-start gap-2">
                                <CheckCircle2 size={12} className="text-green-500/40 mt-0.5" />
                                <span>FRESH Leads kept for 14 days max</span>
                            </li>
                            <li className="text-[11px] text-white/40 flex items-start gap-2">
                                <CheckCircle2 size={12} className="text-green-500/40 mt-0.5" />
                                <span>Enriched leads are compressed</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, x: '-50%', opacity: 0 }}
                        animate={{ y: 0, x: '-50%', opacity: 1 }}
                        exit={{ y: 100, x: '-50%', opacity: 0 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-2 rounded-[32px] shadow-2xl"
                    >
                        <div className="px-6 py-4 border-r border-white/5">
                            <span className="text-sm font-black text-accent-gold">{selectedIds.length}</span>
                        </div>
                        <div className="flex gap-2 p-1">
                            <button onClick={handleBatchEnrich} disabled={enriching} className="h-14 px-8 bg-accent-gold text-black font-black rounded-2xl flex items-center gap-3 hover:bg-white transition-all text-xs uppercase tracking-tighter">
                                {enriching ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Enrich AI
                            </button>
                            <button onClick={handleBulkDelete} className="h-14 px-8 bg-zinc-800 text-red-400 font-bold rounded-2xl flex items-center gap-3 hover:bg-red-500/10 transition-all text-xs uppercase tracking-tighter">
                                <Trash2 size={16} /> Delete
                            </button>
                            <button onClick={() => setSelectedIds([])} className="h-14 w-14 bg-white/5 text-white/40 rounded-2xl flex items-center justify-center">
                                <X size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
