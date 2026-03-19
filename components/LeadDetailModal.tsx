'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Building2, MapPin, Star, Globe, Phone, 
    Sparkles, Copy, Check, Zap, Lightbulb,
    Target, Layout, Palette, Code2, AlertCircle, Save, Edit2
} from 'lucide-react';
import { ActivityTimeline } from './ActivityTimeline';
import { updateLeadEnrichmentData } from '@/lib/actions';

interface LeadDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any;
}

export default function LeadDetailModal({ isOpen, onClose, lead }: LeadDetailModalProps) {
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Editable states
    const [editData, setEditData] = useState({
        brandTitle: lead?.brandData?.title || '',
        brandTagline: lead?.brandData?.tagline || '',
        brandDescription: lead?.brandData?.description || '',
        painPoints: lead?.painPoints || '',
        resolvingIdea: lead?.resolvingIdea || '',
        masterWebsitePrompt: lead?.masterWebsitePrompt || '',
        rawBrandData: lead?.brandData ? JSON.stringify(lead.brandData, null, 2) : '',
        rawAiAnalysis: lead?.aiAnalysis ? JSON.stringify(lead.aiAnalysis, null, 2) : ''
    });

    React.useEffect(() => {
        if (lead) {
            setEditData({
                brandTitle: lead?.brandData?.title || '',
                brandTagline: lead?.brandData?.tagline || '',
                brandDescription: lead?.brandData?.description || '',
                painPoints: lead?.painPoints || '',
                resolvingIdea: lead?.resolvingIdea || '',
                masterWebsitePrompt: lead?.masterWebsitePrompt || '',
                rawBrandData: lead?.brandData ? JSON.stringify(lead.brandData, null, 2) : '',
                rawAiAnalysis: lead?.aiAnalysis ? JSON.stringify(lead.aiAnalysis, null, 2) : ''
            });
        }
    }, [lead]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    if (!lead) return null;

    const handleCopy = () => {
        if (!lead.masterWebsitePrompt) return;
        navigator.clipboard.writeText(lead.masterWebsitePrompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyFullBlueprint = () => {
        const fullBlueprint = `
[ENRICHMENT DATA]
Business: ${lead.name}
Category: ${lead.category}
Pain Points: ${lead.painPoints}
Resolving Idea: ${lead.resolvingIdea}

[SELECTED STYLE DNA]
Style ID: ${lead.selectedStyle || 'N/A'}

[TECHNICAL RULES]
- Output MUST be 100% Bahasa Indonesia.
- Hero: Cinematic Hero (min-h-screen, bg-cover).
- Visual Fallbacks: Grodient overlay + Solid background.

[MASTER PROMPT]
${lead.masterWebsitePrompt}
`.trim();
        navigator.clipboard.writeText(fullBlueprint);
        showToast("Full Blueprint Copied!");
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Parse raw JSONs if we are in technical mode or just sync them
            let finalBrandData = lead.brandData;
            let finalAiAnalysis = lead.aiAnalysis;

            try {
                if (editData.rawBrandData) finalBrandData = JSON.parse(editData.rawBrandData);
                if (editData.rawAiAnalysis) finalAiAnalysis = JSON.parse(editData.rawAiAnalysis);
            } catch (jsonErr) {
                alert("Invalid JSON format in raw fields. Please check your syntax.");
                setSaving(false);
                return;
            }

            const res = await updateLeadEnrichmentData(lead.id, {
                brandData: {
                    ...finalBrandData,
                    title: editData.brandTitle,
                    tagline: editData.brandTagline,
                    description: editData.brandDescription
                },
                aiAnalysis: finalAiAnalysis,
                painPoints: editData.painPoints,
                resolvingIdea: editData.resolvingIdea,
                masterWebsitePrompt: editData.masterWebsitePrompt
            });

            if (res.success) {
                showToast("Changes saved successfully!");
                setIsEditing(false);
                // Optionally reload or sync with parent state
                setTimeout(() => window.location.reload(), 1000);
            } else {
                alert("Failed to save: " + res.message);
            }
        } catch (e: any) {
            alert("Error saving: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const isEnriched = lead.status !== 'FRESH';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-6xl h-[90vh] bg-zinc-950 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-accent-gold/10 rounded-[28px] flex items-center justify-center border border-accent-gold/20 shadow-lg shadow-accent-gold/5">
                                    <Building2 className="w-8 h-8 text-accent-gold" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{lead.name}</h2>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current/20 ${lead.status === 'FRESH' ? 'bg-zinc-500/10 text-zinc-400' : 'bg-green-500/10 text-green-400'}`}>
                                            {lead.status}
                                        </div>
                                    </div>
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Target size={14} className="text-accent-gold" />
                                        {lead.category} • {lead.city}, {lead.province}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isEditing && isEnriched && (
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest border border-white/10"
                                    >
                                        <Edit2 size={14} /> Edit Data
                                    </button>
                                )}
                                <button 
                                    onClick={onClose}
                                    className="p-4 hover:bg-white/5 rounded-[24px] text-white/20 hover:text-white transition-all border border-transparent hover:border-white/10"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Scrolling Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-12">
                                {/* Left Column: Intelligence */}
                                <div className="lg:col-span-8 p-8 space-y-10 border-r border-white/5">
                                    
                                    {/* Brand Identity Branding (Editable) */}
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-accent-gold/10 rounded-xl border border-accent-gold/20">
                                                <Sparkles className="text-accent-gold" size={18} />
                                            </div>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Brand Persona</h3>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-white/20 uppercase tracking-widest px-1">Website Title</label>
                                                {isEditing ? (
                                                    <input 
                                                        type="text"
                                                        value={editData.brandTitle}
                                                        onChange={(e) => setEditData({...editData, brandTitle: e.target.value})}
                                                        className="w-full bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-accent-gold/50 focus:bg-white/5 transition-all shadow-inner"
                                                    />
                                                ) : (
                                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-white font-black text-xl uppercase tracking-tight">
                                                        {lead.brandData?.title || lead.name}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-white/20 uppercase tracking-widest px-1">Tagline</label>
                                                {isEditing ? (
                                                    <input 
                                                        type="text"
                                                        value={editData.brandTagline}
                                                        onChange={(e) => setEditData({...editData, brandTagline: e.target.value})}
                                                        className="w-full bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 text-white font-medium outline-none focus:border-accent-gold/50 focus:bg-white/5 transition-all font-italic shadow-inner"
                                                    />
                                                ) : (
                                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-white/60 font-medium italic">
                                                        "{lead.brandData?.tagline || 'No tagline generated.'}"
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-white/20 uppercase tracking-widest px-1">Brand Narrative</label>
                                                {isEditing ? (
                                                    <textarea 
                                                        rows={4}
                                                        value={editData.brandDescription}
                                                        onChange={(e) => setEditData({...editData, brandDescription: e.target.value})}
                                                        className="w-full bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 text-white text-sm leading-relaxed outline-none focus:border-accent-gold/50 focus:bg-white/5 transition-all resize-none shadow-inner"
                                                    />
                                                ) : (
                                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-white/70 text-sm leading-relaxed">
                                                        {lead.brandData?.description || 'No description available.'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </section>

                                    {/* Technical JSON Metadata (Editable) */}
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                                <Palette className="text-blue-400" size={18} />
                                            </div>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Technical Metadata (JSON)</h3>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-white/20 uppercase tracking-widest px-1">Raw Brand Data</label>
                                                {isEditing ? (
                                                    <textarea 
                                                        rows={8}
                                                        value={editData.rawBrandData}
                                                        onChange={(e) => setEditData({...editData, rawBrandData: e.target.value})}
                                                        className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-4 font-mono text-[10px] text-blue-300 outline-none focus:border-blue-500/50 transition-all resize-none"
                                                    />
                                                ) : (
                                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl font-mono text-[10px] text-white/30 h-[160px] overflow-y-auto custom-scrollbar">
                                                        <pre>{JSON.stringify(lead.brandData, null, 2)}</pre>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-white/20 uppercase tracking-widest px-1">Raw AI Analysis</label>
                                                {isEditing ? (
                                                    <textarea 
                                                        rows={8}
                                                        value={editData.rawAiAnalysis}
                                                        onChange={(e) => setEditData({...editData, rawAiAnalysis: e.target.value})}
                                                        className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-4 font-mono text-[10px] text-purple-300 outline-none focus:border-purple-500/50 transition-all resize-none"
                                                    />
                                                ) : (
                                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl font-mono text-[10px] text-white/30 h-[160px] overflow-y-auto custom-scrollbar">
                                                        <pre>{JSON.stringify(lead.aiAnalysis, null, 2)}</pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </section>

                                    {/* The Blueprint Section */}
                                    <section className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                                    <Code2 className="text-purple-400" size={18} />
                                                </div>
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Master Prompt / Code Structure</h3>
                                            </div>
                                            {isEnriched && lead.masterWebsitePrompt && (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={handleCopy}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/10'}`}
                                                    >
                                                        {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Master</>}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative group">
                                            {isEditing ? (
                                                <div className="space-y-4">
                                                    <textarea 
                                                        rows={12}
                                                        value={editData.masterWebsitePrompt}
                                                        onChange={(e) => setEditData({...editData, masterWebsitePrompt: e.target.value})}
                                                        className="w-full bg-zinc-900/50 border border-white/10 rounded-[32px] p-8 font-mono text-xs leading-relaxed text-blue-300 outline-none focus:border-purple-500/50 transition-all resize-none shadow-2xl"
                                                        placeholder="Edit the Master Website Prompt here..."
                                                    />
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                                        <Sparkles size={12} />
                                                        Manual refactor: Changes here will directly affect the final website structure.
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={`w-full min-h-[300px] bg-zinc-900/50 border rounded-[32px] p-8 font-mono text-xs leading-relaxed transition-all ${isEnriched ? 'border-white/5 text-zinc-300' : 'border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-4'}`}>
                                                    {isEnriched && lead.masterWebsitePrompt ? (
                                                        <div className="whitespace-pre-wrap">{lead.masterWebsitePrompt}</div>
                                                    ) : (
                                                        <>
                                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                                                                <AlertCircle className="text-white/20" size={32} />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-white font-bold uppercase tracking-tight text-sm">Design Blueprint Unready</p>
                                                                <p className="text-white/30 font-medium text-[11px] max-w-[240px]">Enrich data terlebih dahulu untuk melihat prompt dan blueprint website.</p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* Resolutions / Solutions */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                                                <Lightbulb className="text-green-400" size={18} />
                                            </div>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Winning Solution</h3>
                                        </div>
                                        {isEditing ? (
                                            <textarea 
                                                rows={3}
                                                value={editData.resolvingIdea}
                                                onChange={(e) => setEditData({...editData, resolvingIdea: e.target.value})}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-green-500/50 transition-all resize-none"
                                            />
                                        ) : (
                                            <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[32px]">
                                                <p className="text-sm text-white/70 leading-relaxed italic font-medium">"{lead.resolvingIdea || 'No solution generated yet.'}"</p>
                                            </div>
                                        )}
                                    </section>
                                </div>

                                {/* Right Column: Meta & Logs */}
                                <div className="lg:col-span-4 bg-zinc-900/20 p-8 space-y-10">
                                    {/* Intelligence Summary */}
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-3">
                                            <div className="flex items-center gap-2 text-white/40">
                                                <Star size={14} className="text-accent-gold" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Market Status</span>
                                            </div>
                                            <p className="text-2xl font-black text-white">{lead.rating || '0.0'} <span className="text-xs text-white/20">Rating</span></p>
                                        </div>
                                    </div>

                                    {/* Contact Card */}
                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">Core Contact</h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                                                <div className="flex items-center gap-3 text-white/60">
                                                    <Phone size={14} />
                                                    <span className="text-[11px] font-mono">{lead.wa}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl">
                                                <MapPin size={14} className="text-white/40 mt-1 shrink-0" />
                                                <p className="text-[11px] text-white/60 leading-relaxed font-medium">{lead.address}</p>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Timeline */}
                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">Operational History</h3>
                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                            <ActivityTimeline leadId={lead.id} />
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="p-8 border-t border-white/5 bg-zinc-900/50 flex justify-between items-center">
                            <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                Lead ID: {lead.id}
                            </div>
                            <div className="flex gap-3">
                                {isEditing ? (
                                    <>
                                        <button 
                                            onClick={() => setIsEditing(false)}
                                            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest border border-white/10"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-8 py-4 bg-green-500 text-black font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest shadow-xl shadow-green-900/10 flex items-center gap-2"
                                        >
                                            <Save size={14} /> {saving ? 'Saving...' : 'Save Refinement'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            onClick={onClose}
                                            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest border border-white/10"
                                        >
                                            Close
                                        </button>
                                        {lead.status === 'FRESH' && (
                                            <button 
                                                className="px-8 py-4 bg-accent-gold text-black font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest shadow-xl shadow-accent-gold/5 flex items-center gap-2"
                                            >
                                                <Zap size={14} fill="currentColor" />
                                                Enrich Now
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <AnimatePresence>
                            {toast && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20, x: '-50%' }}
                                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                                    exit={{ opacity: 0, y: 20, x: '-50%' }}
                                    className="fixed bottom-12 left-1/2 z-[300] bg-zinc-900 border border-white/10 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
                                >
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <p className="text-xs font-black uppercase tracking-widest text-white">{toast}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
