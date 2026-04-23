'use client';

import React, { useState } from 'react';
import { FilePlus2, Search, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import ImportLeadsSection from '@/components/ImportLeadsSection';

export default function LeadsManualPage() {
    const router = useRouter();
    const [isScraping, setIsScraping] = useState(false);
    const [url, setUrl] = useState('');
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!url.trim() || !url.includes('google.com/maps')) {
            toast.error('Masukkan URL Google Maps yang valid');
            return;
        }

        setIsScraping(true);
        const loadingToast = toast.loading('Sedang mengekstrak data dari Google Maps...');

        try {
            const response = await fetch('/api/scraper/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal mengekstrak data');
            }

            toast.success(`Berhasil! Lead "${data.lead.name}" ditambahkan.`, { id: loadingToast });
            setTimeout(() => {
                router.push('/dashboard/leads');
            }, 1500);
        } catch (error: any) {
            toast.error(error.message, { id: loadingToast });
            setIsScraping(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-32 animate-in fade-in duration-500 max-w-4xl mx-auto pt-12">
            {/* Header & Tabs */}
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-4xl font-black mb-2 tracking-tighter text-white uppercase">Leads Input Manual</h1>
                    <p className="text-white/40 text-sm font-bold uppercase tracking-widest mt-2">
                        Pilih metode input manual untuk database Leads
                    </p>
                </div>
                
                <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 w-fit">
                    <button 
                        onClick={() => setActiveTab('single')}
                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'single' 
                            ? 'bg-accent-gold text-black shadow-lg' 
                            : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Single URL Scrape
                    </button>
                    <button 
                        onClick={() => setActiveTab('bulk')}
                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'bulk' 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                            : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Bulk Import (CSV)
                    </button>
                </div>
            </div>

            {/* Single Scrape Tab */}
            {activeTab === 'single' && (
                <div className="bg-zinc-950/40 border border-white/5 rounded-[32px] p-8 relative overflow-hidden glass shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent-gold/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
                    
                    <div className="flex items-center gap-3 mb-8 relative z-10">
                        <div className="w-10 h-10 bg-accent-gold/10 rounded-xl flex items-center justify-center border border-accent-gold/20">
                            <MapPin className="text-accent-gold shrink-0" size={20} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Single URL Scrape</h2>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                                Ekstrak satu titik lokasi Google Maps ke Database
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    
                    <div className="bg-accent-gold/5 border border-accent-gold/20 p-4 rounded-2xl flex items-start gap-3 mb-6">
                        <AlertCircle className="text-accent-gold shrink-0 mt-0.5" size={18} />
                        <div className="text-sm">
                            <p className="text-accent-gold/80 font-bold mb-1">Panduan Penggunaan:</p>
                            <p className="text-zinc-400">
                                Cukup masukkan URL tempat dari Google Maps. Sistem akan otomatis menjalankan 
                                engine scraper untuk menarik nama bisnis, nomor WA, rating, kategori, dan alamat. 
                                Data akan langsung tersimpan dengan status <strong>FRESH</strong>.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Google Maps URL *</label>
                            <input 
                                value={url} 
                                onChange={(e) => setUrl(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-accent-gold/50 focus:ring-4 focus:ring-accent-gold/5 outline-none transition-all"
                                placeholder="Contoh: https://www.google.com/maps/place/..."
                                required
                            />
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <button
                                type="submit"
                                disabled={isScraping}
                                className="w-full h-[60px] bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-accent-gold transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50"
                            >
                                {isScraping ? (
                                    <><Loader2 size={20} className="animate-spin" /> Sedang Mengekstrak...</>
                                ) : (
                                    <><Search size={20} /> Ekstrak & Simpan Data</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            )}

            {/* Bulk Import Section */}
            {activeTab === 'bulk' && (
                <div className="animate-in slide-in-from-bottom-4 duration-300">
                    <ImportLeadsSection />
                </div>
            )}
        </div>
    );
}
