'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Search, MapPin, Star, Globe, Loader2,
    Zap, CheckCircle2, Navigation, 
    Building2, Map, Landmark,
    Sparkles, ChevronDown, X, RefreshCcw, ChevronsUpDown, Check, Circle, AlertTriangle
} from 'lucide-react';
import { 
    runScraper, checkScraperHealth, repairScraperPermissions
} from '@/lib/actions/scraper';
import { getRegionalAdvice } from '@/lib/actions/ai';
import { getProvinces, getCities, getDistricts } from '@/lib/actions/lead';
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
    const [results, setResults] = useState<any[]>([]);
    const [fetchingDistricts, setFetchingDistricts] = useState(false);
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
    const [stats, setStats] = useState({ new: 0, duplicate: 0, fresh: 0, aiRejected: 0 });

    // Health State
    const [health, setHealth] = useState<any>(null);
    const [repairing, setRepairing] = useState(false);

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

    // Health Polling
    useEffect(() => {
        const updateHealth = async () => {
            const h = await checkScraperHealth();
            setHealth(h);
        };
        updateHealth();
        const interval = setInterval(updateHealth, 5000);
        return () => clearInterval(interval);
    }, []);

    // AUTO-TOGGLE: Disable expansion if district is selected
    useEffect(() => {
        if (selectedDistrict) setIncludeDistricts(false);
    }, [selectedDistrict]);

    useEffect(() => {
        const fetchLatest = async () => {
            try {
                const res = await fetch('/api/scraper/results');
                if (res.ok) {
                    const latest: any[] = await res.json();
                    // Filter by session start time if active
                    const filtered = sessionStartTime 
                        ? latest.filter(l => new Date(l.createdAt).getTime() > sessionStartTime)
                        : latest;
                    setResults(filtered);
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
    }, [sessionStartTime]);

    const handleScrape = async () => {
        setResults([]);
        setSessionStartTime(Date.now());
        setLoading(true);

        if (health && !health.browserReady) {
            alert(health.message);
            setLoading(false);
            return;
        }
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
            alert('Surgical scraping initiated! Watch the live results below.');
        } catch (error: any) {
            alert(`Scraper Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRepair = async () => {
        setRepairing(true);
        try {
            const res = await repairScraperPermissions();
            alert(res.message);
            // Re-trigger health check
            const h = await checkScraperHealth();
            setHealth(h);
        } catch (e) {
            alert("Repair failed");
        } finally {
            setRepairing(false);
        }
    };


    // Health Indicator Helper
    const renderHealthIndicator = () => {
        if (!health) return null;

        const isOk = health.binaryExists && health.isExecutable && health.browserReady;
        const needsPerms = health.binaryExists && !health.isExecutable;

        return (
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center justify-between px-6 py-4 rounded-3xl border mb-8 ${
                    isOk ? 'bg-green-500/5 border-green-500/10 text-green-400' : 
                    needsPerms ? 'bg-amber-500/5 border-amber-500/10 text-amber-400' : 
                    'bg-red-500/5 border-red-500/10 text-red-400'
                }`}
            >
                <div className="flex items-center gap-3">
                    {isOk ? <CheckCircle2 size={18} /> : 
                     needsPerms ? <AlertTriangle size={18} /> : 
                     <X size={18} />}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">System Readiness</p>
                        <p className="text-sm font-bold">{health.message}</p>
                    </div>
                </div>

                {needsPerms && (
                    <button 
                        onClick={handleRepair}
                        disabled={repairing}
                        className="px-4 py-2 bg-amber-500 text-black text-[10px] font-black uppercase rounded-xl hover:bg-white transition-all disabled:opacity-50"
                    >
                        {repairing ? <Loader2 size={12} className="animate-spin" /> : "Fix Permissions"}
                    </button>
                )}
            </motion.div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto flex flex-col justify-start min-h-screen space-y-8 pb-32 pt-12">
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

            {renderHealthIndicator()}

            <div className="glass p-4 md:p-8 rounded-[32px] md:rounded-[40px] border-white/5 relative z-30 shadow-2xl bg-zinc-950/40">
                <form className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 items-end gap-4 md:gap-6" onSubmit={(e) => { e.preventDefault(); handleScrape(); }}>
                    <div className="md:col-span-1 lg:col-span-1 space-y-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-accent-gold flex items-center gap-2">
                            <Building2 size={14} /> Category
                        </label>
                        <SearchCombobox value={selectedCategory} onChange={setSelectedCategory} options={CATEGORIES} placeholder="Category" />
                    </div>
                    <div className="md:col-span-1 lg:col-span-1 space-y-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-accent-gold flex items-center gap-2">
                            <Landmark size={14} /> Province
                        </label>
                        <SearchCombobox value={selectedProvince} onChange={setSelectedProvince} options={provinces} placeholder="Province" />
                    </div>
                    <div className="md:col-span-1 lg:col-span-1 space-y-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-accent-gold flex items-center gap-2">
                            <MapPin size={14} /> City
                        </label>
                        <SearchCombobox value={selectedCity} onChange={setSelectedCity} options={cities} placeholder="City" />
                    </div>
                    <div className={`md:col-span-1 lg:col-span-1 space-y-3 transition-all ${!selectedCity ? 'opacity-30' : 'opacity-100'}`}>
                        <label className="text-xs font-bold uppercase tracking-widest text-accent-gold flex items-center gap-2">
                            <Navigation size={14} /> District
                        </label>
                        <SearchCombobox 
                            value={selectedDistrict} 
                            onChange={setSelectedDistrict} 
                            options={fetchingDistricts ? [] : districts} 
                            placeholder={fetchingDistricts ? "Fetching..." : (selectedCity ? "All Districts" : "Select City")} 
                        />
                    </div>

                    <div 
                        className={`md:col-span-1 lg:col-span-1 h-[60px] flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-6 group hover:border-zinc-600 transition-all cursor-pointer ${selectedDistrict ? 'opacity-40 grayscale cursor-not-allowed' : ''}`} 
                        onClick={() => !selectedDistrict && setIncludeDistricts(!includeDistricts)}
                    >
                        <div className="flex-1">
                            <p className="text-[9px] font-black text-accent-gold uppercase tracking-widest">Expansion</p>
                            <p className="text-[11px] text-white/60 font-bold truncate">Districts</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${includeDistricts ? 'bg-accent-gold text-black rotate-12' : 'bg-white/5 text-white/20'}`}>
                            <MapPin size={18} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || (health && !health.browserReady)}
                        className="md:col-span-1 lg:col-span-1 h-[60px] w-full bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-accent-gold transition-all shadow-2xl disabled:opacity-50 text-sm uppercase tracking-tighter"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                        Launch
                    </button>
                </form>
            </div>

            <div className="w-full">
                <div className="flex flex-col bg-white border border-zinc-200 rounded-[32px] overflow-hidden shadow-2xl relative min-h-[600px]">
                    <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-white/90 backdrop-blur-xl sticky top-0 z-20">
                        <h3 className="text-xl font-black flex items-center gap-2 text-zinc-900 tracking-tighter">
                            Scrape Results {loading && <Loader2 size={16} className="animate-spin text-accent-gold ml-2" />}
                        </h3>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Live Analytics Feed</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto overflow-y-visible">
                        <table className="w-full text-left border-collapse table-auto">
                            <thead className="sticky top-0 z-20 bg-zinc-50 border-b border-zinc-200">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-8">Target</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">Business Name</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">WhatsApp</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">Category</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">Address</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest pr-8 text-right">AI Insight</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                <AnimatePresence mode="popLayout">
                                    {results.length > 0 ? (
                                        results.map((lead) => (
                                            <motion.tr
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                key={lead.id}
                                                className="group hover:bg-zinc-50/80 transition-colors text-zinc-900 pointer-events-none"
                                            >
                                                <td className="px-6 py-4 pl-8">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${
                                                            lead.destination === 'LEAD' 
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                                : 'bg-amber-50 text-amber-700 border-amber-100'
                                                        }`}>
                                                            {lead.destination || 'UNKNOWN'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-sm text-zinc-900 truncate max-w-[180px]" title={lead.name}>
                                                        {lead.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-[13px] text-zinc-600 font-semibold">
                                                        {lead.wa}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-bold uppercase text-zinc-500 bg-zinc-100/50 px-2 py-1 rounded-md border border-zinc-200/50">
                                                        {lead.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-zinc-500 max-w-[200px] truncate" title={lead.address}>
                                                    {lead.address}
                                                </td>
                                                <td className="px-6 py-4 pr-8 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {lead.destination === 'LEAD' ? (
                                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-lg">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="text-[9px] font-black text-emerald-600 uppercase">High Potential</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded-lg">
                                                                <span className="text-[9px] font-black text-amber-600 uppercase">{lead.reason || "Analyzing..."}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-32 text-center text-zinc-300">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center">
                                                        <Search size={32} className="text-zinc-200 animate-pulse" />
                                                    </div>
                                                    <p className="text-sm font-bold text-zinc-400">Waiting for live data transmission...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    );
}
