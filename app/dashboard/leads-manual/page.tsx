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
    const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'manual'>('single');

    // Kategori Google Maps Terstruktur
    const CATEGORY_MAP: Record<string, string[]> = {
        'Kuliner & Makanan': [
            'Restoran', 'Restoran Padang', 'Restoran Seafood', 'Cafe', 'Kedai Kopi', 
            'Toko Roti & Kue (Bakery)', 'Catering', 'Toko Minuman'
        ],
        'Toko & Ritel': [
            'Toko Kelontong', 'Supermarket', 'Minimarket', 'Toko Pakaian', 
            'Toko Sepatu', 'Toko Perhiasan', 'Toko Elektronik', 'Toko Komputer', 
            'Toko Ponsel', 'Toko Buku', 'Toko Alat Tulis', 'Toko Bunga (Florist)', 
            'Pet Shop', 'Toko Bahan Bangunan', 'Distributor Sembako'
        ],
        'Jasa & Kesehatan': [
            'Klinik Medis', 'Apotek', 'Klinik Gigi', 'Salon Kecantikan', 
            'Klinik Kecantikan', 'Klinik Hewan', 'Barber Shop', 'Laundry Service', 
            'Photography Studio', 'Wedding Organizer', 'Law Firm (Konsultan Hukum)'
        ],
        'Otomotif': [
            'Bengkel Mobil', 'Bengkel Motor', 'Dealer Mobil Bekas', 
            'Toko Suku Cadang', 'Tempat Cuci Mobil (Car Wash)', 'Auto Detailing'
        ],
        'Perumahan & Industri': [
            'Agen Properti (Real Estat)', 'Kontraktor Umum', 'Jasa Renovasi', 
            'Tukang Listrik', 'Tukang Ledeng', 'Desain Interior', 'Jasa Konstruksi',
            'Pabrik', 'Gudang'
        ],
        'Agrikultur & Peternakan': [
            'Pertanian', 'Perkebunan', 'Pertanian Organik',
            'Peternakan Sapi', 'Peternakan Ayam', 'Peternakan Kambing', 'Peternakan Babi',
            'Perikanan Tambak', 'Perikanan Laut', 'Budidaya Ikan Lele', 'Budidaya Udang',
            'Distributor Pupuk', 'Toko Pupuk & Pestisida', 'Supplier Bibit Tanaman',
            'Distributor Pakan Ternak', 'Distributor Pakan Ikan', 'Supplier DOC Ayam',
            'Distributor Obat Hewan & Vaksin', 'Kios Pertanian', 'Toko Alat Pertanian',
            'Rental Traktor & Alat Pertanian', 'Pengepul Hasil Pertanian',
            'Cold Storage & Pengolahan Ikan', 'Pengolahan Hasil Ternak'
        ],
        'Pendidikan & Hiburan': [
            'Sekolah Swasta', 'Taman Kanak-kanak', 'Tempat Bimbel / Kursus', 
            'Gym & Pusat Kebugaran', 'Studio Yoga', 'Lapangan Futsal / Olahraga', 
            'Hotel & Penginapan', 'Villa', 'Taman Wisata'
        ]
    };

    const [manualData, setManualData] = useState({
        name: '',
        mainCategory: '',
        subCategory: '',
        wa: '',
        city: '',
        province: '',
        address: '',
        website: '',
        rating: '4.5'
    });

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!manualData.name || !manualData.subCategory) {
            toast.error('Nama Bisnis dan Kategori wajib diisi');
            return;
        }

        setIsScraping(true);
        const loadingToast = toast.loading('Sedang menyimpan data...');

        try {
            const response = await fetch('/api/leads-manual/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...manualData,
                    category: manualData.subCategory
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Gagal menyimpan data');
            }

            toast.success(`Berhasil! Lead "${manualData.name}" ditambahkan.`, { id: loadingToast });
            setTimeout(() => {
                router.push('/dashboard/leads');
            }, 1500);
        } catch (error: any) {
            toast.error(error.message, { id: loadingToast });
            setIsScraping(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedUrl = url.trim();
        const isValidGmapsUrl = trimmedUrl.includes('google.com/maps') || 
                                trimmedUrl.includes('maps.app.goo.gl') || 
                                trimmedUrl.includes('goo.gl/maps') ||
                                trimmedUrl.includes('maps.google.com');
        
        if (!trimmedUrl || !isValidGmapsUrl) {
            toast.error('Masukkan URL Google Maps yang valid (termasuk link share)');
            return;
        }

        setIsScraping(true);
        const loadingToast = toast.loading('Sedang mengekstrak data dari Google Maps...');

        try {
            const response = await fetch('/api/scraper/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: trimmedUrl })
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
                        onClick={() => setActiveTab('manual')}
                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'manual' 
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                            : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Input Manual (Form)
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

            {/* Manual Form Tab */}
            {activeTab === 'manual' && (
                <div className="bg-zinc-950/40 border border-white/5 rounded-[32px] p-8 relative overflow-hidden glass shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-3 mb-8 relative z-10">
                        <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center border border-emerald-600/20">
                            <FilePlus2 className="text-emerald-500 shrink-0" size={20} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Input Manual Form</h2>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                                Isi data bisnis secara manual tanpa scraping
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleManualSubmit} className="space-y-6 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Nama Bisnis */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Nama Bisnis *</label>
                                <input 
                                    value={manualData.name} 
                                    onChange={(e) => setManualData({...manualData, name: e.target.value})}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-emerald-500/50 outline-none transition-all"
                                    placeholder="Contoh: Cafe Senja Bali"
                                    required
                                />
                            </div>

                            {/* Dropdown Kategori Utama */}
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Kategori Utama *</label>
                                <select 
                                    value={manualData.mainCategory}
                                    onChange={(e) => setManualData({...manualData, mainCategory: e.target.value, subCategory: ''})}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-emerald-500/50 outline-none transition-all appearance-none"
                                    required
                                >
                                    <option value="">Pilih Kategori...</option>
                                    {Object.keys(CATEGORY_MAP).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dropdown Sub Kategori */}
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Sub Kategori *</label>
                                <select 
                                    value={manualData.subCategory}
                                    disabled={!manualData.mainCategory}
                                    onChange={(e) => setManualData({...manualData, subCategory: e.target.value})}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-emerald-500/50 outline-none transition-all appearance-none disabled:opacity-30"
                                    required
                                >
                                    <option value="">Pilih Sub Kategori...</option>
                                    {manualData.mainCategory && CATEGORY_MAP[manualData.mainCategory].map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>

                            {/* WhatsApp */}
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Nomor WhatsApp</label>
                                <input 
                                    value={manualData.wa} 
                                    onChange={(e) => setManualData({...manualData, wa: e.target.value})}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-emerald-500/50 outline-none transition-all"
                                    placeholder="Contoh: 08123456789"
                                />
                            </div>

                            {/* Website */}
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Website / Instagram</label>
                                <input 
                                    value={manualData.website} 
                                    onChange={(e) => setManualData({...manualData, website: e.target.value})}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-emerald-500/50 outline-none transition-all"
                                    placeholder="https://..."
                                />
                            </div>

                            {/* Kota */}
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Kota</label>
                                <input 
                                    value={manualData.city} 
                                    onChange={(e) => setManualData({...manualData, city: e.target.value})}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-emerald-500/50 outline-none transition-all"
                                    placeholder="Denpasar"
                                />
                            </div>

                            {/* Provinsi */}
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Provinsi</label>
                                <input 
                                    value={manualData.province} 
                                    onChange={(e) => setManualData({...manualData, province: e.target.value})}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-emerald-500/50 outline-none transition-all"
                                    placeholder="Bali"
                                />
                            </div>

                            {/* Alamat */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Alamat Lengkap</label>
                                <textarea 
                                    value={manualData.address} 
                                    onChange={(e) => setManualData({...manualData, address: e.target.value})}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-emerald-500/50 outline-none transition-all min-h-[100px]"
                                    placeholder="Jl. Raya Canggu No. 123..."
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                            <button
                                type="submit"
                                disabled={isScraping}
                                className="w-full h-[60px] bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50"
                            >
                                {isScraping ? (
                                    <><Loader2 size={20} className="animate-spin" /> Sedang Menyimpan...</>
                                ) : (
                                    <><FilePlus2 size={20} /> Simpan Lead Manual</>
                                )}
                            </button>
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
