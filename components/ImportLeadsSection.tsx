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

        // Use status directly from file data — no override
        const finalData = parsedData;

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
        <div className="bg-zinc-950/40 border border-white/5 rounded-[24px] md:rounded-[32px] p-5 md:p-8 relative overflow-hidden glass shadow-2xl">
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                    <FileUp className="text-blue-400 shrink-0" size={20} />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase leading-tight">Bulk Import (CSV / JSON)</h2>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                        Bypass antrean AI & Simpan ke Database
                    </p>
                </div>
            </div>

            <div className="space-y-6 relative z-10">
                
                <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl md:rounded-2xl flex items-start gap-3">
                    <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs">
                        <p className="text-blue-400/80 font-bold mb-2 uppercase tracking-tighter">Format yang disarankan:</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {expectedHeaders.map(h => (
                                <span key={h} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-zinc-300">
                                    {h}
                                </span>
                            ))}
                        </div>
                        <p className="text-zinc-500 text-[10px] mt-4 leading-relaxed italic">
                            * Kolom <code className="text-blue-400 font-bold">name</code> wajib. <br/>
                            <span className="text-warmTerracotta font-bold">PENTING:</span> Gunakan <code className="text-white/60">.json</code> untuk data HTML yang kompleks.
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                            <a 
                                href="/dummy_leads.csv" 
                                download
                                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                                <Download size={12} />
                                CSV Template
                            </a>
                            <a 
                                href="/dummy_leads.json" 
                                download
                                className="inline-flex items-center gap-2 px-3 py-2 bg-warmTerracotta/10 hover:bg-warmTerracotta/20 border border-warmTerracotta/30 rounded-lg text-warmTerracotta text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                                <Download size={12} />
                                JSON Template
                            </a>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* File Dropzone / Input */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${file ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 hover:border-white/30 bg-zinc-900/50 hover:bg-zinc-900/80'}`}
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
                                <p className="text-white font-bold text-sm truncate max-w-full">{file.name}</p>
                                <p className="text-white/40 text-[10px] mt-1 uppercase tracking-tighter">{(file.size / 1024).toFixed(1)} KB • {parsedData.length} Rows</p>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="text-white/40 mb-3" size={32} />
                                <p className="text-white/70 font-bold text-sm mb-1">Klik untuk pilih file</p>
                                <p className="text-white/30 text-[10px] uppercase tracking-widest">CSV / JSON (Max 5MB)</p>
                            </>
                        )}
                    </div>

                    {/* Import Action */}
                    <div className="flex flex-col justify-end">
                        <button
                            onClick={handleImport}
                            disabled={isImporting || parsedData.length === 0}
                            className="w-full h-14 md:h-[60px] bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50 text-xs md:text-sm"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>Importing...</span>
                                </>
                            ) : (
                                <>
                                    <FileUp size={18} />
                                    <span>Import {parsedData.length > 0 ? parsedData.length : ''} Leads</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Preview Table */}
                {parsedData.length > 0 && (
                    <div className="mt-4 border border-white/5 rounded-xl overflow-hidden bg-zinc-900/50">
                        <div className="px-4 py-2.5 bg-white/5 border-b border-white/5">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Data Preview</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-zinc-400">
                                <thead>
                                    <tr className="border-b border-white/5 text-white/30 uppercase text-[9px] font-black tracking-widest">
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">WA</th>
                                        <th className="px-4 py-3">City</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.slice(0, 3).map((row, i) => (
                                        <tr key={i} className="border-b border-white/5 last:border-0">
                                            <td className="px-4 py-3 text-white font-bold truncate max-w-[120px]">{row.name || '-'}</td>
                                            <td className="px-4 py-3 font-mono text-[10px]">{row.wa || '-'}</td>
                                            <td className="px-4 py-3 truncate max-w-[100px]">{row.city || '-'}</td>
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
