'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Network, TrendingUp, TrendingDown, MapPin, Phone, Star, Plus, ChevronRight, Ship, Building2, Loader2, X, CheckCircle, ArrowRight } from 'lucide-react';
import { B2B_CATEGORIES, B2B_ECOSYSTEM } from '@/lib/b2b-ecosystem';
import { getB2BConnections, createB2BDeal, getB2BDeals, updateB2BDealStatus, deleteB2BDeal, getB2BRevenueSummary } from '@/lib/actions/b2b';
import { toast } from 'react-hot-toast';

const DEAL_STAGES = ['DISCOVERED', 'VERIFIED', 'INTRODUCED', 'NEGOTIATING', 'CLOSED'];
const STAGE_COLORS: Record<string, string> = {
    DISCOVERED: 'bg-zinc-700 text-zinc-300',
    VERIFIED: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    INTRODUCED: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    NEGOTIATING: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    CLOSED: 'bg-green-500/20 text-green-400 border border-green-500/30',
};
const TIER_BADGE: Record<number, { label: string; cls: string; icon?: React.ReactNode }> = {
    1: { label: 'Dalam Kota', cls: 'bg-green-500/10 text-green-400 border border-green-500/20' },
    2: { label: 'Luar Kota', cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
    3: { label: 'Luar Pulau', cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
};

type Lead = { id: string; name: string; city: string; province: string; wa: string | null; rating: number; status: string; category: string; locationTier: 1 | 2 | 3 };
type ConnMatch = { connection: any; leads: Lead[]; totalInDb: number };
type Deal = any;

export default function LinkedB2BPage() {
    const [activeTab, setActiveTab] = useState<'matcher' | 'pipeline'>('matcher');
    const [category, setCategory] = useState('');
    const [city, setCity] = useState('');
    const [province, setProvince] = useState('');
    const [connections, setConnections] = useState<{ demand: ConnMatch[]; supply: ConnMatch[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedConn, setSelectedConn] = useState<{ type: 'demand' | 'supply'; match: ConnMatch } | null>(null);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [revenue, setRevenue] = useState<any>(null);
    const [dealModal, setDealModal] = useState<{ buyer: Lead | null; seller: Lead | null; link: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        loadDeals();
    }, []);

    const loadDeals = async () => {
        const [d, r] = await Promise.all([getB2BDeals(), getB2BRevenueSummary()]);
        setDeals(d);
        setRevenue(r);
    };

    const handleSearch = async () => {
        if (!category) { toast.error('Pilih kategori fokus dulu'); return; }
        setLoading(true);
        setSelectedConn(null);
        const result = await getB2BConnections(category, city, province);
        setConnections(result);
        setLoading(false);
    };

    const handleCreateDeal = async () => {
        if (!dealModal?.buyer || !dealModal?.seller) return;
        const tier = Math.max(dealModal.buyer.locationTier, dealModal.seller.locationTier) as 1 | 2 | 3;
        const t = toast.loading('Membuat deal...');
        const res = await createB2BDeal({ buyerLeadId: dealModal.buyer.id, sellerLeadId: dealModal.seller.id, categoryLink: dealModal.link, locationTier: tier });
        if (res.success) {
            toast.success('Deal berhasil dibuat!', { id: t });
            setDealModal(null);
            await loadDeals();
        } else {
            toast.error(res.message || 'Gagal', { id: t });
        }
    };

    const handleStatusChange = async (dealId: string, status: string) => {
        await updateB2BDealStatus(dealId, status);
        await loadDeals();
    };

    const statusDot = (n: number) => n > 2 ? '🟢' : n > 0 ? '🟡' : '🔴';

    return (
        <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between bg-premium-800/20 p-6 rounded-3xl border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent-gold/10 rounded-2xl flex items-center justify-center border border-accent-gold/20">
                        <Network className="text-accent-gold" size={22} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Linked B2B</h1>
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">B2B Broker Matchmaking Engine</p>
                    </div>
                </div>
                {/* Revenue Mini Stats */}
                {revenue && (
                    <div className="flex gap-4">
                        {[
                            { label: 'Total Deals', val: revenue.totalDeals },
                            { label: 'Closed', val: revenue.pipeline.CLOSED },
                            { label: 'Total Fee', val: `Rp ${revenue.totalFee.toLocaleString('id-ID')}` },
                        ].map(s => (
                            <div key={s.label} className="text-right">
                                <div className="text-2xl font-black text-accent-gold">{s.val}</div>
                                <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit">
                {(['matcher', 'pipeline'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-accent-gold text-black' : 'text-white/40 hover:text-white'}`}>
                        {t === 'matcher' ? '🔗 Matcher' : '📋 Pipeline'}
                    </button>
                ))}
            </div>

            {activeTab === 'matcher' && (
                <>
                    {/* Search Controls */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2 space-y-2">
                            <label className="text-xs text-white/40 font-bold uppercase tracking-widest">Kategori Fokus</label>
                            <select value={category} onChange={e => setCategory(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-accent-gold/50">
                                <option value="">-- Pilih Kategori --</option>
                                {B2B_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-white/40 font-bold uppercase tracking-widest">Kota Kamu</label>
                            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Surabaya"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-accent-gold/50" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-white/40 font-bold uppercase tracking-widest">&nbsp;</label>
                            <button onClick={handleSearch} disabled={loading}
                                className="w-full h-[46px] bg-accent-gold text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Network size={16} />}
                                {loading ? 'Scanning...' : 'Cari Koneksi'}
                            </button>
                        </div>
                    </div>

                    {/* Results Grid */}
                    {connections && (
                        <div className="grid grid-cols-2 gap-6">
                            {/* DEMAND Side */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingDown size={16} className="text-blue-400" />
                                    <h2 className="text-sm font-black uppercase tracking-widest text-blue-400">DEMAND — {category} Butuh</h2>
                                </div>
                                {connections.demand.map((match, i) => (
                                    <ConnectionCard key={i} match={match} type="demand"
                                        selected={selectedConn?.match.connection.category === match.connection.category}
                                        onSelect={() => setSelectedConn({ type: 'demand', match })}
                                        statusDot={statusDot} />
                                ))}
                            </div>
                            {/* SUPPLY Side */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp size={16} className="text-emerald-400" />
                                    <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">SUPPLY — Yang Butuh {category}</h2>
                                </div>
                                {connections.supply.map((match, i) => (
                                    <ConnectionCard key={i} match={match} type="supply"
                                        selected={selectedConn?.match.connection.category === match.connection.category}
                                        onSelect={() => setSelectedConn({ type: 'supply', match })}
                                        statusDot={statusDot} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lead Detail Panel */}
                    {selectedConn && (
                        <div className="bg-zinc-950/60 border border-white/10 rounded-3xl p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">{selectedConn.match.connection.label}</h3>
                                    <p className="text-white/40 text-xs mt-1">{selectedConn.match.connection.description}</p>
                                </div>
                                <button onClick={() => setSelectedConn(null)} className="p-2 hover:bg-white/5 rounded-xl text-white/30 hover:text-white"><X size={18} /></button>
                            </div>

                            {selectedConn.match.leads.length === 0 ? (
                                <div className="text-center py-8 border border-dashed border-zinc-700 rounded-2xl">
                                    <p className="text-white/40 text-sm font-bold">Belum ada leads di DB untuk kategori ini</p>
                                    <p className="text-accent-gold text-xs mt-2 font-bold">Keyword Scrape: <span className="font-mono">{selectedConn.match.connection.scrapeKeyword}</span></p>
                                    <button className="mt-4 px-6 py-2 bg-accent-gold/10 border border-accent-gold/30 text-accent-gold text-xs font-black uppercase rounded-xl hover:bg-accent-gold/20 transition-all">
                                        → Buka Menu Scraper
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedConn.match.leads.map(lead => (
                                        <div key={lead.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-2 hover:border-accent-gold/30 transition-all">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-white font-bold text-sm truncate max-w-[160px]">{lead.name}</p>
                                                    <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5"><MapPin size={10} />{lead.city}</p>
                                                </div>
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${TIER_BADGE[lead.locationTier].cls}`}>
                                                    {lead.locationTier === 3 && '🚢 '}{TIER_BADGE[lead.locationTier].label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-white/50">
                                                <span className="flex items-center gap-1"><Star size={10} className="text-yellow-400" />{lead.rating}</span>
                                                {lead.wa && <span className="flex items-center gap-1"><Phone size={10} />WA</span>}
                                            </div>
                                            <button onClick={() => setDealModal({ buyer: selectedConn.type === 'demand' ? lead : null, seller: selectedConn.type === 'supply' ? lead : null, link: `${category} → ${selectedConn.match.connection.label}` })}
                                                className="w-full py-2 bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-[10px] font-black uppercase rounded-xl hover:bg-accent-gold/20 transition-all flex items-center justify-center gap-1">
                                                <Plus size={10} /> Buat Deal
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'pipeline' && (
                <PipelineView deals={deals} onStatusChange={handleStatusChange} onDelete={async (id) => { await deleteB2BDeal(id); await loadDeals(); }} revenue={revenue} />
            )}

            {/* Deal Creation Modal */}
            {dealModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setDealModal(null)} />
                    <div className="relative bg-zinc-950 border border-white/10 rounded-3xl p-8 w-full max-w-lg space-y-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><Network size={18} className="text-accent-gold" /> Buat B2B Deal</h3>
                        <div className="bg-accent-gold/5 border border-accent-gold/20 rounded-2xl p-4">
                            <p className="text-accent-gold text-xs font-bold uppercase tracking-widest mb-2">Koneksi</p>
                            <p className="text-white font-bold">{dealModal.link}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-3">
                                <p className="text-blue-400 text-[10px] font-black uppercase mb-1">BUYER (Yang Butuh)</p>
                                <p className="text-white text-sm font-bold">{dealModal.buyer?.name || <span className="text-white/30 italic">Pilih dari panel</span>}</p>
                            </div>
                            <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-3">
                                <p className="text-green-400 text-[10px] font-black uppercase mb-1">SELLER (Yang Supply)</p>
                                <p className="text-white text-sm font-bold">{dealModal.seller?.name || <span className="text-white/30 italic">Pilih dari panel</span>}</p>
                            </div>
                        </div>
                        <p className="text-white/40 text-xs">Status awal: <span className="text-accent-gold font-bold">DISCOVERED</span>. Update manual setelah verifikasi harga.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDealModal(null)} className="flex-1 py-3 border border-white/10 rounded-2xl text-white/40 hover:text-white text-xs font-black uppercase transition-all">Batal</button>
                            <button onClick={handleCreateDeal} disabled={!dealModal.buyer && !dealModal.seller}
                                className="flex-1 py-3 bg-accent-gold text-black font-black text-xs uppercase rounded-2xl hover:bg-yellow-400 transition-all disabled:opacity-40">
                                Simpan Deal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ConnectionCard({ match, type, selected, onSelect, statusDot }: any) {
    const n = match.totalInDb;
    return (
        <button onClick={onSelect} className={`w-full text-left p-4 rounded-2xl border transition-all ${selected ? 'border-accent-gold/50 bg-accent-gold/5' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-600'}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">{statusDot(n)}</span>
                        <p className="text-white font-bold text-sm truncate">{match.connection.label}</p>
                    </div>
                    <p className="text-white/30 text-xs mt-1 truncate">{match.connection.description}</p>
                </div>
                <div className="ml-3 text-right shrink-0">
                    <span className={`text-xs font-black px-2 py-1 rounded-full ${n > 0 ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                        {n} leads
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
                {'●'.repeat(match.connection.strength).split('').map((_: any, i: number) => (
                    <div key={i} className={`h-1.5 w-6 rounded-full ${i < match.connection.strength ? (type === 'demand' ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-zinc-700'}`} />
                ))}
                <span className="text-white/30 text-[10px] ml-1">Tier {match.connection.tier}</span>
            </div>
        </button>
    );
}

function PipelineView({ deals, onStatusChange, onDelete, revenue }: any) {
    if (deals.length === 0) return (
        <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl">
            <Network size={40} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/40 font-bold">Belum ada deals. Mulai dari tab Matcher.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Pipeline Funnel */}
            {revenue && (
                <div className="grid grid-cols-5 gap-2">
                    {DEAL_STAGES.map(s => (
                        <div key={s} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 text-center">
                            <div className="text-2xl font-black text-white">{revenue.pipeline[s] || 0}</div>
                            <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">{s}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Deal Cards */}
            <div className="space-y-3">
                {deals.map((deal: Deal) => (
                    <div key={deal.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex items-center gap-6">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full ${STAGE_COLORS[deal.status]}`}>{deal.status}</span>
                                {deal.locationTier === 3 && <span className="text-[10px] text-red-400 font-bold">🚢 Luar Pulau</span>}
                            </div>
                            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">{deal.categoryLink}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-white text-sm font-bold">{deal.buyer?.name}</span>
                                <ArrowRight size={12} className="text-white/30 shrink-0" />
                                <span className="text-white text-sm font-bold">{deal.seller?.name}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <select value={deal.status} onChange={e => onStatusChange(deal.id, e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs outline-none">
                                {DEAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => onDelete(deal.id)} className="p-2 hover:bg-red-500/10 rounded-xl text-white/20 hover:text-red-400 transition-all"><X size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
