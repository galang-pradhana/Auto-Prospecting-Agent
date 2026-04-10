'use client';

import React, { useState, useEffect } from 'react';
import { FilePlus2, Save, Loader2, Check, AlertCircle, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getUniqueCategories } from '@/lib/actions';

export default function LeadsManualPage() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        wa: '',
        city: '',
        province: '',
        address: '',
        website: ''
    });
    
    const [existingCategories, setExistingCategories] = useState<string[]>([]);
    const [isCustomCategory, setIsCustomCategory] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const categories = await getUniqueCategories();
                setExistingCategories(categories.filter(c => c && c.trim() !== ''));
            } catch (error) {
                console.error("Failed to fetch categories", error);
            }
        };
        fetchCategories();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            toast.error('Nama bisnis wajib diisi');
            return;
        }

        if (!formData.category.trim()) {
            toast.error('Kategori wajib diisi');
            return;
        }

        setIsSaving(true);
        const savingToast = toast.loading('Menyimpan ke database...');

        try {
            const response = await fetch('/api/leads-manual/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Gagal menyimpan data');
            }

            toast.success('Lead berhasil ditambahkan!', { id: savingToast });
            router.push('/dashboard/leads');
        } catch (error: any) {
            toast.error(error.message, { id: savingToast });
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-32 animate-in fade-in duration-500 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-end bg-premium-800/20 p-6 rounded-3xl border border-white/5">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                            <FilePlus2 className="text-blue-500 shrink-0" size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Leads Manual</h1>
                    </div>
                    <p className="text-white/40 text-sm font-bold uppercase tracking-widest mt-2">
                        Input data prospek secara manual ke dalam sistem
                    </p>
                </div>
            </div>

            {/* Form */}
            <div className="bg-premium-900 border border-white/5 rounded-[32px] p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3 mb-6">
                        <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={18} />
                        <div className="text-sm">
                            <p className="text-blue-200 font-bold mb-1">Panduan Pengisian:</p>
                            <p className="text-blue-200/70">
                                Isi informasi selengkap mungkin. Kolom dengan tanda bintang (*) wajib diisi. 
                                Nomor Kontak disarankan menggunakan format 08xx atau 628xx.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Nama Bisnis */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Nama Bisnis *</label>
                            <input 
                                value={formData.name} 
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-colors"
                                placeholder="Contoh: Studio Arsitek Jakarta"
                                required
                            />
                        </div>

                        {/* Kategori */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/50 font-bold uppercase tracking-widest flex justify-between items-center">
                                <span>Kategori Bisnis *</span>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setIsCustomCategory(!isCustomCategory);
                                        if (isCustomCategory) setFormData({...formData, category: ''});
                                    }}
                                    className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white/70 flex items-center gap-1 transition-colors"
                                >
                                    {isCustomCategory ? 'Pilih dari List' : <><Plus size={10} /> Tambah Baru</>}
                                </button>
                            </label>

                            {isCustomCategory ? (
                                <input 
                                    value={formData.category} 
                                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                                    className="w-full bg-black/40 border border-blue-500/30 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-colors"
                                    placeholder="Ketik kategori baru di sini..."
                                    required
                                />
                            ) : (
                                <select 
                                    value={formData.category} 
                                    onChange={(e) => {
                                        if (e.target.value === 'NEW') {
                                            setIsCustomCategory(true);
                                            setFormData({...formData, category: ''});
                                        } else {
                                            setFormData({...formData, category: e.target.value});
                                        }
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-colors appearance-none"
                                    required
                                >
                                    <option value="" disabled>Pilih Kategori</option>
                                    {existingCategories.map((cat, i) => (
                                        <option key={i} value={cat}>{cat}</option>
                                    ))}
                                    {existingCategories.length > 0 && <option disabled>──────────</option>}
                                    <option value="NEW">+ Tambah Kategori Baru</option>
                                </select>
                            )}
                        </div>

                        {/* Kontak & Lokasi Dasar */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Nomor Kontak / WA</label>
                                <input 
                                    value={formData.wa} 
                                    onChange={(e) => setFormData({...formData, wa: e.target.value})}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-colors"
                                    placeholder="Contoh: 08123456789 (Kosongkan jika tidak ada)"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Website</label>
                                <input 
                                    value={formData.website} 
                                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-colors"
                                    placeholder="Contoh: www.bisnisku.com"
                                />
                            </div>
                        </div>

                        {/* Alamat Detil */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Kota</label>
                                <input 
                                    value={formData.city} 
                                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-colors"
                                    placeholder="Contoh: Jakarta Selatan"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Provinsi</label>
                                <input 
                                    value={formData.province} 
                                    onChange={(e) => setFormData({...formData, province: e.target.value})}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-colors"
                                    placeholder="Contoh: DKI Jakarta"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Alamat Lengkap</label>
                            <textarea 
                                value={formData.address} 
                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition-colors h-24 resize-none"
                                placeholder="Detail alamat bisnis..."
                            ></textarea>
                        </div>

                        <div className="pt-6 flex gap-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => router.push('/dashboard/leads')}
                                className="px-6 py-4 border border-white/10 text-white/70 font-bold rounded-xl hover:bg-white/5 transition-all w-1/3"
                                disabled={isSaving}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 bg-blue-500 text-white font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <><Loader2 size={20} className="animate-spin" /> Menyimpan...</>
                                ) : (
                                    <><Save size={20} /> Simpan Data Lead</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
