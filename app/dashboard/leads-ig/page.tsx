'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Sparkles, AlertCircle, Instagram, Check, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ExtractedData {
    name: string | null;
    ig: string | null;
    category: string | null;
    bio: string | null;
    followers: string | null;
    location: string | null;
    contact: string | null;
    website: string | null;
}

interface LeadItem {
    id: string;
    file: File;
    previewUrl: string;
    status: 'idle' | 'extracting' | 'extracted' | 'saving' | 'saved' | 'error';
    data: ExtractedData | null;
    errorMessage?: string;
}

export default function LeadsIGPage() {
    const [items, setItems] = useState<LeadItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        addFiles(Array.from(files));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files) {
            addFiles(Array.from(files));
        }
    };

    const addFiles = (files: File[]) => {
        const validFiles = files.filter(f => {
            if (!f.type.startsWith('image/')) {
                toast.error(`${f.name} bukan gambar`);
                return false;
            }
            if (f.size > 5 * 1024 * 1024) {
                toast.error(`${f.name} terlalu besar (>5MB)`);
                return false;
            }
            return true;
        });

        const newItems: LeadItem[] = validFiles.map(file => ({
            id: Math.random().toString(36).substring(7),
            file,
            previewUrl: URL.createObjectURL(file),
            status: 'idle',
            data: null
        }));

        setItems(prev => [...prev, ...newItems]);
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const updateItemData = (id: string, field: keyof ExtractedData, value: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === id && item.data) {
                return { ...item, data: { ...item.data, [field]: value } };
            }
            return item;
        }));
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const extractSingle = async (item: LeadItem) => {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'extracting', errorMessage: undefined } : i));
        
        try {
            const base64 = await convertToBase64(item.file);
            const response = await fetch('/api/leads-ig/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64, mimeType: item.file.type })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Gagal mengekstrak');

            setItems(prev => prev.map(i => i.id === item.id ? { 
                ...i, 
                status: 'extracted', 
                data: data.extracted 
            } : i));
            
            toast.success('Selesai mengekstrak data');
        } catch (error: any) {
            setItems(prev => prev.map(i => i.id === item.id ? { 
                ...i, 
                status: 'error', 
                errorMessage: error.message 
            } : i));
            toast.error(`Gagal mengekstrak: ${error.message}`);
        }
    };

    const saveSingle = async (item: LeadItem) => {
        if (!item.data?.name) {
            toast.error('Nama bisnis wajib diisi');
            return;
        }

        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'saving', errorMessage: undefined } : i));

        try {
            const response = await fetch('/api/leads-ig/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.data)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Gagal menyimpan');

            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'saved' } : i));
            toast.success('Lead berhasil disimpan!');
        } catch (error: any) {
            setItems(prev => prev.map(i => i.id === item.id ? { 
                ...i, 
                status: 'error', 
                errorMessage: error.message 
            } : i));
            toast.error(error.message);
        }
    };

    const analyzeAll = async () => {
        const idleItems = items.filter(i => i.status === 'idle' || i.status === 'error');
        if (idleItems.length === 0) return;
        
        // Process sequentially to avoid rate limits
        for (const item of idleItems) {
            await extractSingle(item);
        }
    };

    const saveAll = async () => {
        const extractedItems = items.filter(i => i.status === 'extracted');
        if (extractedItems.length === 0) return;

        for (const item of extractedItems) {
            await saveSingle(item);
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-32 animate-in fade-in duration-500 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-end bg-premium-800/20 p-6 rounded-3xl border border-white/5">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center border border-pink-500/20">
                            <Instagram className="text-pink-500 shrink-0" size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Leads IG Batch</h1>
                    </div>
                    <p className="text-white/40 text-sm font-bold uppercase tracking-widest mt-2">
                        Upload banyak screenshot sekaligus, AI akan analisis satu per satu
                    </p>
                </div>
            </div>

            {/* Dropzone */}
            <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleDrop}
                className="w-full relative rounded-[32px] border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-accent-gold/50 transition-all duration-300 flex flex-col items-center justify-center gap-4 cursor-pointer group py-16"
            >
                <div className="absolute top-4 right-4 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full flex items-center gap-2">
                    <AlertCircle className="text-blue-400 shrink-0" size={14} />
                    <span className="text-xs text-blue-200">Gunakan screenshot jelas yang menampilkan foto profil & bio</span>
                </div>

                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-accent-gold/10 transition-all">
                    <Upload className="text-white/40 group-hover:text-accent-gold" size={40} />
                </div>
                <div className="text-center">
                    <p className="text-white font-bold text-xl">Upload Screenshot IG</p>
                    <p className="text-white/40 mt-2">Drag & drop banyak gambar sekaligus</p>
                    <p className="text-white/20 text-xs mt-1">JPG, PNG, WEBP (Max 5MB per gambar)</p>
                </div>
                <input 
                    type="file" 
                    multiple
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/jpeg, image/png, image/webp"
                    onChange={handleFileSelect}
                />
            </div>

            {/* Actions Bar */}
            {items.length > 0 && (
                <div className="sticky top-4 z-40 bg-zinc-950/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center justify-between shadow-2xl">
                    <div className="text-sm font-bold text-white">
                        {items.length} Gambar diantrikan
                    </div>
                    <div className="flex gap-3">
                        {items.some(i => i.status === 'idle' || i.status === 'error') && (
                            <button
                                onClick={analyzeAll}
                                className="px-6 py-2.5 bg-zinc-800 text-white font-black uppercase tracking-widest text-xs rounded-xl flex items-center gap-2 hover:bg-zinc-700 transition"
                            >
                                <Sparkles size={16} className="text-accent-gold" /> Analyze Semua
                            </button>
                        )}
                        {items.some(i => i.status === 'extracted') && (
                            <button
                                onClick={saveAll}
                                className="px-6 py-2.5 bg-accent-gold text-black font-black uppercase tracking-widest text-xs rounded-xl flex items-center gap-2 hover:bg-yellow-400 transition shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                            >
                                <Save size={16} /> Save Semua Ter-verifikasi
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* List */}
            <div className="space-y-6">
                {items.map((item, index) => (
                    <div key={item.id} className="bg-premium-900 border border-white/5 rounded-3xl overflow-hidden flex flex-col md:flex-row">
                        
                        {/* Kolom Kiri: Gambar & Status */}
                        <div className="md:w-1/3 bg-black/40 p-4 flex flex-col items-center relative group border-b md:border-b-0 md:border-r border-white/5">
                            <button 
                                onClick={() => removeItem(item.id)}
                                className="absolute top-2 right-2 p-1.5 bg-red-500/20 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                            >
                                <X size={16} />
                            </button>

                            <span className="absolute top-2 left-2 px-2.5 py-1 bg-white/10 backdrop-blur text-[10px] font-black tracking-widest text-white/50 rounded flex items-center justify-center">
                                #{index + 1}
                            </span>
                            
                            <img 
                                src={item.previewUrl} 
                                className="w-full h-auto max-h-[400px] object-contain rounded-xl"
                            />
                            
                            <div className="w-full mt-4 flex items-center justify-between bg-white/5 p-3 rounded-xl">
                                {item.status === 'idle' && <span className="text-xs font-bold text-white/50">Siap Dianalisis</span>}
                                {item.status === 'extracting' && (
                                    <span className="text-xs font-bold text-accent-gold flex items-center gap-2">
                                        <Loader2 size={14} className="animate-spin" /> Ekstraksi AI...
                                    </span>
                                )}
                                {item.status === 'extracted' && <span className="text-xs font-bold text-blue-400 flex items-center gap-2"><Check size={14} /> Berhasil Diekstrak</span>}
                                {item.status === 'saving' && (
                                    <span className="text-xs font-bold text-white flex items-center gap-2">
                                        <Loader2 size={14} className="animate-spin" /> Menyimpan...
                                    </span>
                                )}
                                {item.status === 'saved' && <span className="text-xs font-bold text-green-400 flex items-center gap-2"><Check size={14} /> Tersimpan ke DB</span>}
                                {item.status === 'error' && (
                                    <div className="text-xs font-bold text-red-400">
                                        Error! <button onClick={() => extractSingle(item)} className="underline ml-1">Coba lagi</button>
                                    </div>
                                )}
                                
                                {item.status === 'idle' && (
                                    <button onClick={() => extractSingle(item)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md text-white transition">
                                        <Sparkles size={14} />
                                    </button>
                                )}
                            </div>
                            
                            {item.errorMessage && (
                                <p className="text-[10px] text-red-400 mt-2 text-center">{item.errorMessage}</p>
                            )}
                        </div>

                        {/* Kolom Kanan: Form Data */}
                        <div className="flex-1 p-6 flex flex-col justify-center">
                            {item.status === 'idle' || item.status === 'extracting' ? (
                                <div className="h-full w-full flex flex-col items-center justify-center text-white/20">
                                    {item.status === 'extracting' ? (
                                        <>
                                            <Sparkles size={48} className="text-accent-gold mb-4 animate-pulse" />
                                            <p className="font-bold">Menganalisis screenshot...</p>
                                        </>
                                    ) : (
                                        <>
                                            <Instagram size={48} className="mb-4" />
                                            <p className="font-bold text-sm">Menunggu analisis</p>
                                        </>
                                    )}
                                </div>
                            ) : (item.data ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Nama Bisnis *</label>
                                            <input 
                                                value={item.data.name || ''} 
                                                onChange={(e) => updateItemData(item.id, 'name', e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold/50 outline-none disabled:opacity-50"
                                                disabled={item.status === 'saved' || item.status === 'saving'}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Username IG</label>
                                            <input 
                                                value={item.data.ig || ''} 
                                                onChange={(e) => updateItemData(item.id, 'ig', e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold/50 outline-none disabled:opacity-50"
                                                disabled={item.status === 'saved' || item.status === 'saving'}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Kontak / WA</label>
                                            <input 
                                                value={item.data.contact || ''} 
                                                onChange={(e) => updateItemData(item.id, 'contact', e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold/50 outline-none disabled:opacity-50"
                                                placeholder="Kosongkan jika tidak ada"
                                                disabled={item.status === 'saved' || item.status === 'saving'}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Kategori</label>
                                            <input 
                                                value={item.data.category || ''} 
                                                onChange={(e) => updateItemData(item.id, 'category', e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold/50 outline-none disabled:opacity-50"
                                                disabled={item.status === 'saved' || item.status === 'saving'}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Followers</label>
                                            <input 
                                                value={item.data.followers || ''} 
                                                onChange={(e) => updateItemData(item.id, 'followers', e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold/50 outline-none disabled:opacity-50"
                                                disabled={item.status === 'saved' || item.status === 'saving'}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Lokasi</label>
                                            <input 
                                                value={item.data.location || ''} 
                                                onChange={(e) => updateItemData(item.id, 'location', e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold/50 outline-none disabled:opacity-50"
                                                disabled={item.status === 'saved' || item.status === 'saving'}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Website</label>
                                            <input 
                                                value={item.data.website || ''} 
                                                onChange={(e) => updateItemData(item.id, 'website', e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold/50 outline-none disabled:opacity-50"
                                                disabled={item.status === 'saved' || item.status === 'saving'}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Bio IG</label>
                                        <textarea 
                                            value={item.data.bio || ''} 
                                            onChange={(e) => updateItemData(item.id, 'bio', e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold/50 outline-none h-16 resize-none disabled:opacity-50"
                                            disabled={item.status === 'saved' || item.status === 'saving'}
                                        ></textarea>
                                    </div>

                                    {/* Item Actions */}
                                    {item.status !== 'saved' && (
                                        <div className="pt-2 flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => saveSingle(item)}
                                                disabled={item.status === 'saving'}
                                                className="px-6 py-2 bg-accent-gold/10 text-accent-gold font-bold text-sm rounded-lg hover:bg-accent-gold hover:text-black transition-all flex items-center gap-2"
                                            >
                                                {item.status === 'saving' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                Simpan Item
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : null)}
                        </div>
                    </div>
                ))}
            </div>
            
            {items.length === 0 && (
                <div className="text-center opacity-30 pointer-events-none -mt-4">
                    <p className="font-bold text-lg">Batch Processing Leads</p>
                    <p className="text-sm">Tidak ada batasan jumlah upload</p>
                </div>
            )}
        </div>
    );
}
