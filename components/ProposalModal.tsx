'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    FileText, 
    Zap, 
    Download, 
    Edit3, 
    Check, 
    ChevronRight, 
    ChevronLeft, 
    Loader2, 
    DollarSign,
    Palette,
    Eye
} from 'lucide-react';
import { generateProposalDraft, getStyleModels } from '@/lib/actions/ai';
import { getProposalByLeadId, saveProposal } from '@/lib/actions/proposal';
import { toast } from 'sonner';

interface ProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any;
}

export default function ProposalModal({ isOpen, onClose, lead }: ProposalModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [styles, setStyles] = useState<any[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<any>(null);
    
    // Client & Proposal Data
    const [prices, setPrices] = useState({
        tier1: '1.500.000',
        tier2: '3.500.000',
        tier3: '7.500.000'
    });
    const [clientData, setClientData] = useState({
        businessName: '',
        category: '',
        address: '',
        city: '',
        rating: '',
        reviewsCount: '',
        currentWebsite: '',
        igUsername: '',
        painPoints: '',
        brandTagline: '',
        styleDNA: '',
        myBusinessName: '',
        myWa: '',
        myIg: ''
    });

    const [generatedProposal, setGeneratedProposal] = useState('');
    const [editedProposal, setEditedProposal] = useState('');
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [isSaving, setIsSaving] = useState(false);
    const [hasExistingProposal, setHasExistingProposal] = useState(false);

    useEffect(() => {
        if (isOpen && lead) {
            checkExistingProposal();
            fetchStyles();
            setGeneratedProposal('');
            setEditedProposal('');
            
            // Pre-fill client data from lead
            const data = {
                businessName: lead.name || '',
                category: lead.category || '',
                address: lead.address || '',
                city: lead.city || '',
                rating: lead.rating?.toString() || '',
                reviewsCount: lead.reviewCount?.toString() || '',
                currentWebsite: lead.website !== 'N/A' ? lead.website : '',
                igUsername: lead.ig || '',
                painPoints: lead.painPoints || '',
                brandTagline: (lead.brandData as any)?.tagline || '',
                styleDNA: lead.styleDNA || '',
                myBusinessName: '', 
                myWa: '',
                myIg: ''
            };
            setClientData(data);
        }
    }, [isOpen, lead]);

    const checkExistingProposal = async () => {
        setLoading(true);
        try {
            const existing = await getProposalByLeadId(lead.id);
            if (existing) {
                setGeneratedProposal(existing.html);
                setEditedProposal(existing.html);
                setHasExistingProposal(true);
                setStep(3); // Jump straight to editor
                setViewMode('preview');
                
                // If we have saved data, update the form states too
                if (existing.prices) setPrices(existing.prices as any);
                if (existing.clientOverrides) setClientData(existing.clientOverrides as any);
            } else {
                setHasExistingProposal(false);
                setStep(1);
            }
        } catch (e) {
            console.error("Error checking existing proposal:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStyles = async () => {
        const data = await getStyleModels();
        if (data) {
            setStyles(data);
            // Default select the one matching lead's styleDNA or the first one
            const matching = data.find((s: any) => s.id === lead.selectedStyle);
            setSelectedStyle(matching || data[0]);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/proposal/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    leadId: lead.id,
                    inputs: { prices, overrides: clientData, selectedStyleId: selectedStyle?.id || 'clean-minimal' }
                })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message || 'Failed to start generation');

            // Polling for status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/jobs/status?id=${data.jobId}`);
                    const statusData = await statusRes.json();

                    if (statusData.job?.status === 'COMPLETED') {
                        clearInterval(pollInterval);
                        setLoading(false);
                        const draft = statusData.job.data?.draft;
                        if (draft) {
                            setGeneratedProposal(draft);
                            setEditedProposal(draft);
                            setStep(3);
                            setViewMode('preview'); // Default to preview for the "WOW" effect
                            toast.success("Proposal ready!");
                        }
                    } else if (statusData.job?.status === 'FAILED') {
                        clearInterval(pollInterval);
                        setLoading(false);
                        toast.error(statusData.job.message || "Failed to generate proposal");
                    }
                } catch (e) {
                    console.error("Polling error:", e);
                }
            }, 3000);

            toast.info("Generating your premium proposal in the background...");
        } catch (error: any) {
            toast.error(error.message || "Something went wrong during generation");
            setLoading(false);
        }
    };

    // Renderer is now simpler because AI provides the HTML
    const renderStyledProposal = (content: string) => {
        return content; // AI already provides the HTML with inline CSS
    };

    const handleSaveManual = async () => {
        setIsSaving(true);
        try {
            const res = await saveProposal({
                leadId: lead.id,
                html: editedProposal,
                styleId: selectedStyle?.id,
                prices,
                clientOverrides: clientData
            });
            if (res.success) {
                toast.success("Perubahan proposal berhasil disimpan ke DB!");
                setHasExistingProposal(true);
            } else {
                toast.error(res.message || "Gagal menyimpan perubahan");
            }
        } catch (error) {
            toast.error("Terjadi kesalahan saat menyimpan");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = () => {
        if (!editedProposal) return;

        const fullHtml = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Proposal — ${clientData.businessName}</title></head><body style="margin:0;padding:0;">${editedProposal}</body></html>`;
        
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Proposal_${clientData.businessName.replace(/\s+/g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Proposal berhasil diunduh sebagai HTML!');
    };

    const handleDownloadPdf = async () => {
        if (!editedProposal) return;
        
        toast.loading('Menyiapkan PDF Premium...', { id: 'pdf-toast' });
        
        try {
            // @ts-ignore
            const html2pdf = (await import('html2pdf.js')).default;
            
            const element = document.createElement('div');
            element.innerHTML = editedProposal;
            element.style.width = '720px'; // Precision fit for Letter size (7.5 inches @ 96 DPI)
            element.style.padding = '20px';
            element.style.boxSizing = 'border-box';
            element.style.backgroundColor = '#ffffff'; 
            
            const opt = {
                margin:       [0.5, 0.5], 
                filename:     `Proposal_${clientData.businessName.replace(/\s+/g, '_')}.pdf`,
                image:        { type: 'jpeg', quality: 1.0 },
                html2canvas:  { 
                    scale: 3, 
                    useCORS: true, 
                    letterRendering: true,
                    logging: false,
                    width: 720,
                    windowWidth: 720
                },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
                pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
            };

            await html2pdf().set(opt).from(element).save();
            toast.success('Proposal PDF berhasil diunduh!', { id: 'pdf-toast' });
        } catch (error) {
            console.error('PDF Error:', error);
            toast.error('Gagal mengunduh PDF. Silakan coba HTML download.', { id: 'pdf-toast' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0f1115] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                            <FileText size={20} className="text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">AI Proposal Generator</h2>
                            <p className="text-xs text-white/40 uppercase tracking-widest font-black">Lead: {lead.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-white/40" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-white/5 w-full">
                    <motion.div 
                        className="h-full bg-orange-500"
                        initial={{ width: '33.33%' }}
                        animate={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Data Pre-fill & Missing Data */}
                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500">📋 Data Klien (Pre-filled)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/40 uppercase">Nama Bisnis</label>
                                            <input 
                                                type="text" 
                                                value={clientData.businessName}
                                                onChange={(e) => setClientData({...clientData, businessName: e.target.value})}
                                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/40 uppercase">Kategori</label>
                                            <input 
                                                type="text" 
                                                value={clientData.category}
                                                onChange={(e) => setClientData({...clientData, category: e.target.value})}
                                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/40 uppercase">Alamat</label>
                                            <input 
                                                type="text" 
                                                value={clientData.address}
                                                onChange={(e) => setClientData({...clientData, address: e.target.value})}
                                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-white/40 uppercase">Rating</label>
                                                <input 
                                                    type="text" 
                                                    value={clientData.rating}
                                                    onChange={(e) => setClientData({...clientData, rating: e.target.value})}
                                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-white/40 uppercase">Reviews</label>
                                                <input 
                                                    type="text" 
                                                    value={clientData.reviewsCount}
                                                    onChange={(e) => setClientData({...clientData, reviewsCount: e.target.value})}
                                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500">🔍 Insight Tambahan</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/40 uppercase">Website Saat Ini</label>
                                            <input 
                                                type="text" 
                                                value={clientData.currentWebsite}
                                                onChange={(e) => setClientData({...clientData, currentWebsite: e.target.value})}
                                                placeholder="Belum ada / URL"
                                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/40 uppercase">Instagram</label>
                                            <input 
                                                type="text" 
                                                value={clientData.igUsername}
                                                onChange={(e) => setClientData({...clientData, igUsername: e.target.value})}
                                                placeholder="@namabisnis"
                                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-white/40 uppercase">Pain Points (Masalah Utama)</label>
                                        <textarea 
                                            value={clientData.painPoints}
                                            onChange={(e) => setClientData({...clientData, painPoints: e.target.value})}
                                            placeholder="Misal: Belum ada website resmi, susah ditemukan di Google..."
                                            className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-orange-500 transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500">💰 Harga Paket (Rp)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/40 uppercase">Paket 1</label>
                                            <input 
                                                type="text" 
                                                value={prices.tier1}
                                                onChange={(e) => setPrices({...prices, tier1: e.target.value})}
                                                placeholder="1.500.000"
                                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/40 uppercase">Paket 2 (Opsional)</label>
                                            <input 
                                                type="text" 
                                                value={prices.tier2}
                                                onChange={(e) => setPrices({...prices, tier2: e.target.value})}
                                                placeholder="3.500.000"
                                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/40 uppercase">Paket 3 (Opsional)</label>
                                            <input 
                                                type="text" 
                                                value={prices.tier3}
                                                onChange={(e) => setPrices({...prices, tier3: e.target.value})}
                                                placeholder="7.500.000"
                                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Style */}
                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {styles.map((s: any) => (
                                        <button
                                            key={s.id}
                                            onClick={() => setSelectedStyle(s)}
                                            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                                                selectedStyle?.id === s.id 
                                                    ? 'bg-orange-500/10 border-orange-500 shadow-lg shadow-orange-500/10' 
                                                    : 'bg-white/5 border-white/10 hover:border-white/30'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-2xl">{s.icon}</span>
                                                {selectedStyle?.id === s.id && (
                                                    <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                                        <Check size={12} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors">{s.name}</h4>
                                            <div className="mt-2 flex gap-1">
                                                {s.colorPalette && (
                                                    <div className="flex gap-1">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.colorPalette.primary }} />
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.colorPalette.accent }} />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Editor & Preview */}
                        {step === 3 && (
                            <motion.div 
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6 flex flex-col"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Edit3 size={16} className="text-orange-500" />
                                            Content Strategy
                                        </h3>
                                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                            <button 
                                                onClick={() => setViewMode('edit')}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'edit' ? 'bg-orange-500 text-white' : 'text-white/40 hover:text-white'}`}
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => setViewMode('preview')}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'preview' ? 'bg-orange-500 text-white' : 'text-white/40 hover:text-white'}`}
                                            >
                                                Preview
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2">
                                            <Palette size={14} className="text-orange-500" />
                                            <span className="text-[10px] font-bold text-white/60 uppercase">{selectedStyle?.name}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-[500px] relative overflow-hidden rounded-2xl border border-white/10" style={{ backgroundColor: selectedStyle?.colorPalette?.background || '#000' }}>
                                    {viewMode === 'edit' ? (
                                        <textarea 
                                            value={editedProposal}
                                            onChange={(e) => setEditedProposal(e.target.value)}
                                            className="w-full h-full bg-zinc-950 p-8 text-white/80 text-sm leading-relaxed focus:outline-none transition-all font-medium font-mono resize-none custom-scrollbar"
                                            placeholder="Generated proposal text will appear here..."
                                        />
                                    ) : (
                                        <div className="w-full h-full overflow-y-auto custom-scrollbar">
                                            <div dangerouslySetInnerHTML={{ __html: renderStyledProposal(editedProposal) }} />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white/5 border-t border-white/10 flex items-center justify-between">
                    <div className="flex gap-3">
                        {step > 1 && (
                            <button 
                                onClick={() => setStep(prev => prev - 1)}
                                className="h-12 px-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl flex items-center gap-2 transition-all text-xs uppercase tracking-widest border border-white/10"
                            >
                                <ChevronLeft size={16} />
                                Back
                            </button>
                        )}
                    </div>
                    
                    <div className="flex gap-3">
                        {step === 1 && (
                            <button 
                                onClick={() => setStep(2)}
                                className="h-12 px-8 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center gap-2 transition-all text-xs uppercase tracking-widest"
                            >
                                Next
                                <ChevronRight size={16} />
                            </button>
                        )}
                        {step === 2 && (
                            <button 
                                onClick={handleGenerate}
                                disabled={loading}
                                className="h-12 px-8 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all text-xs uppercase tracking-widest shadow-lg shadow-orange-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                {loading ? 'Magic in Progress...' : 'Generate with AI'}
                            </button>
                        )}
                        {step === 3 && (
                            <>
                                <button 
                                    onClick={handleSaveManual}
                                    disabled={isSaving}
                                    className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    Simpan Perubahan
                                </button>
                                <button 
                                    onClick={() => {
                                        setHasExistingProposal(false);
                                        setStep(1);
                                    }}
                                    disabled={loading}
                                    className="h-12 px-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl flex items-center gap-2 transition-all text-xs uppercase tracking-widest border border-white/10"
                                >
                                    <Zap size={16} className="text-orange-500" />
                                    Buat Baru
                                </button>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleDownload}
                                        className="h-12 px-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl flex items-center gap-2 transition-all text-xs uppercase tracking-widest border border-white/10"
                                    >
                                        <Download size={16} />
                                        HTML
                                    </button>
                                    <button 
                                        onClick={handleDownloadPdf}
                                        className="h-12 px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20"
                                    >
                                        <FileText size={16} />
                                        Download PDF
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
