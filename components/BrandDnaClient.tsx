'use client';

import React, { useState, useEffect } from 'react';
import { 
    Search, Filter, MapPin, Building2, ExternalLink, 
    Copy, Check, Loader2, Sparkles, Dna, Share2, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBrandDnaLeads, generateBrandDnaLink } from '@/lib/actions/brand-dna';
import { DISTRICTS_BY_CITY } from '@/lib/districts';

interface BrandDnaClientProps {
    initialLeads: any[];
    categories: string[];
}

export function BrandDnaClient({ initialLeads, categories }: BrandDnaClientProps) {
    const [leads, setLeads] = useState(initialLeads);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const availableCities = Array.from(new Set(initialLeads.map(l => l.city).filter(Boolean)));
    const availableDistricts = selectedCity ? DISTRICTS_BY_CITY[selectedCity] || [] : [];

    const handleSearch = async () => {
        setLoading(true);
        try {
            const results = await getBrandDnaLeads({
                query: searchQuery,
                category: selectedCategory,
                city: selectedCity,
                district: selectedDistrict
            });
            setLeads(results);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (leadId: string) => {
        setGeneratingId(leadId);
        try {
            const res = await generateBrandDnaLink(leadId);
            if (res.success) {
                // Update local state to show the link or status
                handleSearch(); // Refresh list
            }
        } finally {
            setGeneratingId(null);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-8">
            {/* Search & Filter Panel */}
            <div className="glass p-6 rounded-[32px] border-white/5 bg-zinc-950/40 shadow-2xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input 
                            type="text"
                            placeholder="Cari nama bisnis..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:border-accent-gold/40 transition-all text-sm font-semibold"
                        />
                    </div>

                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-zinc-900 border border-white/5 rounded-2xl px-4 py-3.5 outline-none focus:border-accent-gold/40 transition-all text-sm font-semibold text-white/60 appearance-none cursor-pointer"
                    >
                        <option value="">Semua Kategori</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select 
                        value={selectedCity}
                        onChange={(e) => {
                            setSelectedCity(e.target.value);
                            setSelectedDistrict('');
                        }}
                        className="bg-zinc-900 border border-white/5 rounded-2xl px-4 py-3.5 outline-none focus:border-accent-gold/40 transition-all text-sm font-semibold text-white/60 appearance-none cursor-pointer"
                    >
                        <option value="">Semua Kota</option>
                        {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select 
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        disabled={!selectedCity}
                        className="bg-zinc-900 border border-white/5 rounded-2xl px-4 py-3.5 outline-none focus:border-accent-gold/40 transition-all text-sm font-semibold text-white/60 appearance-none cursor-pointer disabled:opacity-30"
                    >
                        <option value="">Semua Kecamatan</option>
                        {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                <button 
                    onClick={handleSearch}
                    disabled={loading}
                    className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-accent-gold flex items-center justify-center gap-3 shadow-xl"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Filter size={16} />}
                    Apply Filter & Dive Data
                </button>
            </div>

            {/* Results Table */}
            <div className="glass rounded-[40px] border-white/5 bg-zinc-950/40 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-3">
                        <Dna className="text-accent-gold" size={20} /> Lead Discovery Reservoir
                    </h3>
                    <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-white/20 uppercase tracking-widest">
                        {leads.length} Leads Found
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/5">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30">Business Identity</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30">Location Context</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30 text-center">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30 text-center">BrandDNA Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/30 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {leads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-white/10">
                                            <Search size={48} strokeWidth={1} />
                                            <p className="text-xs font-black uppercase tracking-[0.3em]">No Leads Dive Deep Enough</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead) => (
                                    <motion.tr 
                                        key={lead.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="group hover:bg-white/[0.02] transition-all"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-white font-black text-sm group-hover:text-accent-gold transition-colors">{lead.name}</span>
                                                <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-1 flex items-center gap-1">
                                                    <Building2 size={10} /> {lead.category}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-white/60 text-xs font-bold">{lead.city || lead.province}</span>
                                                <span className="text-[10px] text-white/20 font-medium italic mt-1 flex items-center gap-1">
                                                    <MapPin size={10} /> {lead.district || 'All Districts'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                lead.status === 'LIVE' ? 'bg-emerald-500/10 text-emerald-500' :
                                                lead.status === 'ENRICHED' ? 'bg-accent-gold/10 text-accent-gold' :
                                                'bg-white/5 text-white/40'
                                            }`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            {!lead.brandDna ? (
                                                <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">Belum Ada</span>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                        lead.brandDna.status === 'SUBMITTED' ? 'bg-emerald-500/10 text-emerald-500' :
                                                        lead.brandDna.status === 'VIEWED' ? 'bg-blue-500/10 text-blue-500' :
                                                        'bg-amber-500/10 text-amber-500'
                                                    }`}>
                                                        {lead.brandDna.status}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-2">
                                                {lead.brandDna ? (
                                                    <>
                                                        <button 
                                                            onClick={() => copyToClipboard(`${window.location.origin}/b/${lead.brandDna.token}`, lead.id)}
                                                            className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                                                            title="Salin Link Link"
                                                        >
                                                            {copiedId === lead.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                            {copiedId === lead.id ? 'Tersalin' : 'Copy'}
                                                        </button>
                                                        <a 
                                                            href={`/b/${lead.brandDna.token}`} 
                                                            target="_blank"
                                                            className="p-2 rounded-xl bg-accent-gold/10 text-accent-gold hover:bg-accent-gold hover:text-black transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                                                            title="Buka untuk melihat atau meneruskan pengisian data/file"
                                                        >
                                                            <Eye size={14} /> Buka / Teruskan
                                                        </a>
                                                    </>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleGenerate(lead.id)}
                                                        disabled={generatingId === lead.id}
                                                        className="px-4 py-2 rounded-xl bg-accent-gold text-black font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-accent-gold/20 hover:scale-105 transition-all"
                                                    >
                                                        {generatingId === lead.id ? <Loader2 className="animate-spin" size={14} /> : <Share2 size={14} />}
                                                        Generate Link
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
