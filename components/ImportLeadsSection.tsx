'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { toast } from 'react-hot-toast';
import { FileUp, FileText, UploadCloud, AlertCircle, CheckCircle2, Loader2, Info, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ImportLeadsSection() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [defaultStatus, setDefaultStatus] = useState('FRESH');

    const expectedHeaders = ['name', 'wa', 'category', 'city', 'address', 'status', 'outreachDraft', 'htmlCode'];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.json')) {
            toast.error('Hanya file CSV atau JSON yang didukung.');
            return;
        }

        setFile(selectedFile);

        if (selectedFile.name.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string);
                    if (!Array.isArray(data)) {
                        toast.error('Format JSON harus berupa Array.');
                        return;
                    }
                    setParsedData(data);
                } catch (error: any) {
                    toast.error(`Gagal parsing JSON: ${error.message}`);
                }
            };
            reader.readAsText(selectedFile);
            return;
        }

        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    toast.error('Terdapat error saat membaca file CSV');
                    console.error(results.errors);
                }
                setParsedData(results.data);
            },
            error: (error) => {
                toast.error(`Gagal parsing CSV: ${error.message}`);
            }
        });
    };

    const handleImport = async () => {
        if (parsedData.length === 0) {
            toast.error('Tidak ada data untuk diimpor.');
            return;
        }

        setIsImporting(true);
        const loadingToast = toast.loading(`Mengimpor ${parsedData.length} leads...`);

        // Map status if not provided in CSV
        const finalData = parsedData.map(row => ({
            ...row,
            status: row.status || defaultStatus
        }));

        try {
            const res = await fetch('/api/leads/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leads: finalData })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan server');

            toast.success(`Berhasil mengimpor ${data.count} leads!`, { id: loadingToast });
            setFile(null);
            setParsedData([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            setTimeout(() => {
                router.push('/dashboard/leads');
            }, 1500);

        } catch (error: any) {
            toast.error(error.message, { id: loadingToast });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="bg-zinc-950/40 border border-white/5 rounded-[32px] p-8 relative overflow-hidden glass shadow-2xl">
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                    <FileUp className="text-blue-400 shrink-0" size={20} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Bulk Import (CSV / JSON)</h2>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                        Bypass antrean AI dan langsung simpan ke Database
                    </p>
                </div>
            </div>

            <div className="space-y-6 relative z-10">
                
                <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3">
                    <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
                    <div className="text-sm">
                        <p className="text-blue-400/80 font-bold mb-1">Format CSV/JSON yang disarankan:</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {expectedHeaders.map(h => (
                                <span key={h} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-zinc-300">
                                    {h}
                                </span>
                            ))}
                        </div>
                        <p className="text-zinc-500 text-xs mt-3 italic">
                            * Kolom 'name' wajib. Jika 'status' kosong, menggunakan default. <br/>
                            <span className="text-warmTerracotta font-bold">PENTING:</span> Jika data kamu mengandung HTML/Teks panjang dengan baris baru (seperti htmlCode), <b>sangat disarankan menggunakan format .json</b> agar struktur file tidak rusak.
                        </p>
                        <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                            <p className="text-zinc-400 text-xs leading-relaxed">
                                <strong className="text-blue-400">💡 Tips Edit JSON:</strong> Teks panjang (seperti kode HTML) tidak boleh di-paste mentah ke file <code className="text-warmTerracotta">.json</code> karena akan merusak format (Error Parsing). Gunakan <b>"JSON String Escape Online"</b> di Google untuk mengubah baris baru (Enter) menjadi <code className="bg-zinc-800 px-1 rounded">\n</code> secara otomatis sebelum menempelkannya ke file template.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <a 
                                href="/dummy_leads.csv" 
                                download
                                className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <Download size={12} />
                                Template CSV
                            </a>
                            <a 
                                href="/dummy_leads.json" 
                                download
                                className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 bg-warmTerracotta/10 hover:bg-warmTerracotta/20 border border-warmTerracotta/30 rounded-lg text-warmTerracotta text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <Download size={12} />
                                Template JSON
                            </a>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* File Dropzone / Input */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${file ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 hover:border-white/30 bg-zinc-900/50 hover:bg-zinc-900/80'}`}
                    >
                        <input 
                            type="file" 
                            accept=".csv,.json" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        {file ? (
                            <>
                                <FileText className="text-blue-400 mb-3" size={32} />
                                <p className="text-white font-bold">{file.name}</p>
                                <p className="text-white/40 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB • {parsedData.length} baris data terbaca</p>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="text-white/40 mb-3" size={32} />
                                <p className="text-white/70 font-bold mb-1">Klik untuk memilih file CSV atau JSON</p>
                                <p className="text-white/40 text-xs uppercase tracking-widest">Maksimal 5MB</p>
                            </>
                        )}
                    </div>

                    {/* Settings & Import Action */}
                    <div className="space-y-4 flex flex-col justify-end">
                        <div className="space-y-2">
                            <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Default Status (Bypass AI)</label>
                            <select 
                                value={defaultStatus}
                                onChange={(e) => setDefaultStatus(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="FRESH">FRESH (Data mentah, butuh follow up / AI)</option>
                                <option value="LIVE">LIVE (Bypass AI penuh, langsung siap WA Blast!)</option>
                            </select>
                        </div>

                        <button
                            onClick={handleImport}
                            disabled={isImporting || parsedData.length === 0}
                            className="w-full h-[60px] bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50 disabled:hover:bg-blue-600"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Mengimpor...</span>
                                </>
                            ) : (
                                <>
                                    <FileUp size={20} />
                                    <span>Import {parsedData.length > 0 ? parsedData.length : ''} Leads</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Preview Table */}
                {parsedData.length > 0 && (
                    <div className="mt-6 border border-white/5 rounded-2xl overflow-hidden bg-zinc-900/50">
                        <div className="px-4 py-3 bg-white/5 border-b border-white/5">
                            <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Data Preview (Max 3 Baris)</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-zinc-400">
                                <thead>
                                    <tr className="border-b border-white/5 text-white/40 uppercase text-[10px] tracking-widest">
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">WA</th>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3">City</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.slice(0, 3).map((row, i) => (
                                        <tr key={i} className="border-b border-white/5 last:border-0">
                                            <td className="px-4 py-3 text-white font-medium truncate max-w-[150px]">{row.name || '-'}</td>
                                            <td className="px-4 py-3 font-mono text-xs">{row.wa || '-'}</td>
                                            <td className="px-4 py-3">{row.category || '-'}</td>
                                            <td className="px-4 py-3">{row.city || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
