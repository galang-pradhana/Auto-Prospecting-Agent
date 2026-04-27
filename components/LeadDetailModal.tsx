'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Building2, MapPin, Star, Globe, Phone, 
    Sparkles, Copy, Check, Zap, Lightbulb,
    Target, Layout, Palette, Code2, AlertCircle, Save, Edit2,
    Instagram, MessageCircle, ExternalLink, ChevronRight, Loader2
} from 'lucide-react';
import { ActivityTimeline } from './ActivityTimeline';
import { updateLeadEnrichmentData, logActivity, saveOutreachDraft } from '@/lib/actions/lead';
import { enrichLead, generateOutreachDraft } from '@/lib/actions/ai';
import { PERSONA_OPTIONS } from '@/lib/prompts';


interface LeadDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any;
    onDraftSave?: (newDraft: string) => void;
}

export default function LeadDetailModal({ isOpen, onClose, lead, onDraftSave }: LeadDetailModalProps) {
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [enriching, setEnriching] = useState(false);
    const [generatingDraft, setGeneratingDraft] = useState(false);
    const [outreachDraft, setOutreachDraft] = useState(lead?.outreachDraft || '');
    const [selectedPersona, setSelectedPersona] = useState('professional');
    const [savingDraft, setSavingDraft] = useState(false);
    
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
            setOutreachDraft(lead?.outreachDraft || '');
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

    const handleSave = async () => {
        setSaving(true);
        try {
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
    
    const handleGenerateDraft = async () => {
        if (generatingDraft) return;
        setGeneratingDraft(true);
        try {
            const res = await generateOutreachDraft(lead.id, selectedPersona);
            if (res.success) {
                setOutreachDraft(res.draft);
                if (onDraftSave) onDraftSave(res.draft);
                showToast("Outreach draft generated!");
            } else {
                alert("Generation failed: " + res.message);
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setGeneratingDraft(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!outreachDraft) return;
        setSavingDraft(true);
        try {
            const res = await saveOutreachDraft(lead.id, outreachDraft);
            if (res.success) {
                showToast("Draft saved successfully!");
                if (onDraftSave) onDraftSave(outreachDraft);
            } else {
                alert("Save failed: " + res.message);
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setSavingDraft(false);
        }
    };

    const handleEnrich = async () => {
        if (enriching) return;
        setEnriching(true);
        try {
            const res = await enrichLead(lead.id);
            if (res.success) {
                showToast("Intelligence enriched successfully!");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                alert("Enrichment failed: " + res.message);
            }
        } catch (e: any) {
            alert("Error during enrichment: " + e.message);
        } finally {
            setEnriching(false);
        }
    };

    const handleSendWA = () => {
        if (!outreachDraft) {
            alert("Generate atau tulis pesan dulu bos!");
            return;
        }
        const text = encodeURIComponent(outreachDraft);
        const url = `https://wa.me/${lead.wa || lead.phone}?text=${text}`;
        window.open(url, '_blank');
        logActivity(lead.id, 'WA_SENT', 'Sent outreach message to client');
    };

    const isEnriched = lead.status !== 'FRESH';
    const isLive = lead.status === 'LIVE';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                    />

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
                                {isEditing && (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setIsEditing(false)}
                                            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white/40 font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest border border-white/10"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-6 py-3 bg-accent-gold text-black font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            Save Changes
                                        </button>
                                    </div>
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
                            <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
                                {/* Left Column: Intelligence / Preview */}
                                <div className={`${isLive ? 'lg:col-span-12' : 'lg:col-span-8'} p-8 space-y-10 border-r border-white/5`}>
                                    
                                    {/* PROMPT (Exclusive for LIVE) */}
                                    {isLive && lead.masterWebsitePrompt && (
                                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-accent-gold/10 rounded-xl border border-accent-gold/20">
                                                        <Code2 className="text-accent-gold" size={18} />
                                                    </div>
                                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Master Website Prompt</h3>
                                                </div>
                                                <button 
                                                    onClick={handleCopy}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl transition-all text-[10px] uppercase tracking-widest border border-white/10"
                                                >
                                                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                    {copied ? 'Copied!' : 'Copy Prompt'}
                                                </button>
                                            </div>
                                            <div className="w-full h-[600px] bg-zinc-900 rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative p-6">
                                                <textarea 
                                                    readOnly
                                                    value={lead.masterWebsitePrompt}
                                                    className="w-full h-full bg-transparent text-sm text-zinc-300 font-mono outline-none resize-none custom-scrollbar"
                                                />
                                            </div>
                                        </section>
                                    )}

                                    {!isLive && (
                                        <>
                                            {/* Brand Identity Branding (Editable) */}
                                            {isEnriched && (
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
                                            )}

                                            {/* Strategic Analysis (Editable) */}
                                            {isEnriched && (
                                                <section className="space-y-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                                            <Lightbulb className="text-purple-400" size={18} />
                                                        </div>
                                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Strategic Analysis</h3>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black text-white/20 uppercase tracking-widest px-1">Pain Points</label>
                                                            {isEditing ? (
                                                                <textarea 
                                                                    rows={3}
                                                                    value={editData.painPoints}
                                                                    onChange={(e) => setEditData({...editData, painPoints: e.target.value})}
                                                                    className="w-full bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-accent-gold/50 focus:bg-white/5 transition-all resize-none shadow-inner"
                                                                    placeholder="What are they struggling with?"
                                                                />
                                                            ) : (
                                                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-white/70 text-sm leading-relaxed">
                                                                    {lead.painPoints || 'No pain points analyzed yet.'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black text-white/20 uppercase tracking-widest px-1">Resolving Idea</label>
                                                            {isEditing ? (
                                                                <textarea 
                                                                    rows={3}
                                                                    value={editData.resolvingIdea}
                                                                    onChange={(e) => setEditData({...editData, resolvingIdea: e.target.value})}
                                                                    className="w-full bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-accent-gold/50 focus:bg-white/5 transition-all resize-none shadow-inner"
                                                                    placeholder="How can we help?"
                                                                />
                                                            ) : (
                                                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-white/70 text-sm leading-relaxed">
                                                                    {lead.resolvingIdea || 'No solution blueprint generated.'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </section>
                                            )}

                                            {/* Scraped Data Intelligence */}
                                            {!isEnriched && (
                                                <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-accent-gold/10 rounded-xl border border-accent-gold/20">
                                                            <Building2 className="text-accent-gold" size={18} />
                                                        </div>
                                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Scraped Data Intelligence</h3>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[32px] space-y-4 hover:border-accent-gold/20 transition-all group">
                                                            <div className="flex items-center gap-3 text-accent-gold">
                                                                <Globe size={20} />
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Official Website</span>
                                                            </div>
                                                            <p className="text-lg font-bold text-white truncate group-hover:text-accent-gold transition-colors">
                                                                {lead.website !== 'N/A' ? lead.website : 'No Website Found'}
                                                            </p>
                                                        </div>

                                                        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[32px] space-y-4 hover:border-pink-500/20 transition-all group">
                                                            <div className="flex items-center gap-3 text-pink-500">
                                                                <Instagram size={20} />
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Instagram Profile</span>
                                                            </div>
                                                            <p className="text-lg font-bold text-white truncate group-hover:text-pink-400 transition-colors">
                                                                {lead.ig || 'Searching Socials...'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-accent-gold/5 border border-accent-gold/10 p-8 rounded-[40px] flex flex-col items-center justify-center text-center gap-6 py-12">
                                                        <div className="w-20 h-20 bg-accent-gold/10 rounded-full flex items-center justify-center border border-accent-gold/20 shadow-2xl shadow-accent-gold/10">
                                                            <Zap size={32} className="text-accent-gold fill-accent-gold animate-pulse" />
                                                        </div>
                                                        <h4 className="text-xl font-black text-white uppercase tracking-tight">Ready for Enrichment</h4>
                                                        <button 
                                                            onClick={handleEnrich}
                                                            disabled={enriching}
                                                            className="px-10 py-5 bg-accent-gold text-black font-black rounded-full transition-all text-xs uppercase tracking-[0.2em]"
                                                        >
                                                            {enriching ? 'Enriching...' : 'Fire Enrichment AI'}
                                                        </button>
                                                    </div>
                                                </section>
                                            )}

                                            {/* Technical Metadata */}
                                            {(isEnriched || isEditing) && (
                                                <section className="space-y-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                                            <Palette className="text-blue-400" size={18} />
                                                        </div>
                                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Technical Metadata (JSON)</h3>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl font-mono text-[10px] text-white/30 h-[160px] overflow-y-auto">
                                                            <pre>{JSON.stringify(lead.brandData, null, 2)}</pre>
                                                        </div>
                                                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl font-mono text-[10px] text-white/30 h-[160px] overflow-y-auto">
                                                            <pre>{JSON.stringify(lead.aiAnalysis, null, 2)}</pre>
                                                        </div>
                                                    </div>
                                                </section>
                                            )}
                                        </>
                                    )}

                                    {/* Outreach Section (Shown for both, always at bottom for LIVE) */}
                                    {isLive && (
                                        <section className="space-y-6 pt-10 border-t border-white/10">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                                                        <Zap className="text-green-400" size={18} />
                                                    </div>
                                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">🚀 Outreach & Delivery Center</h3>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="hidden md:flex items-center">
                                                        <select 
                                                            value={selectedPersona}
                                                            onChange={(e) => setSelectedPersona(e.target.value)}
                                                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-accent-gold/50 cursor-pointer appearance-none"
                                                        >
                                                            {PERSONA_OPTIONS.map(opt => (
                                                                <option key={opt.value} value={opt.value} className="bg-zinc-900">{opt.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <button 
                                                        onClick={handleGenerateDraft}
                                                        disabled={generatingDraft}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                            generatingDraft 
                                                            ? 'bg-white/10 text-white/40 cursor-not-allowed' 
                                                            : 'bg-accent-gold text-black hover:scale-105 active:scale-95'
                                                        }`}
                                                    >
                                                        {generatingDraft ? (
                                                            <>
                                                                <Loader2 size={14} className="animate-spin" /> Generating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles size={14} /> Generate Draft
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-6">
                                                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[32px] flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Live Preview Link</p>
                                                        <p className="text-sm font-bold text-white uppercase tracking-tight">
                                                            {process.env.NEXT_PUBLIC_APP_URL || 'https://auto-forge.pro'}/{lead.slug || lead.id}
                                                        </p>
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL || 'https://auto-forge.pro'}/${lead.slug || lead.id}`);
                                                            showToast("Link Copied!");
                                                        }}
                                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/40"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                                <textarea 
                                                    rows={8}
                                                    value={outreachDraft}
                                                    onChange={(e) => setOutreachDraft(e.target.value)}
                                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-[32px] p-8 text-sm text-zinc-300 outline-none focus:border-green-500/50 resize-none shadow-2xl"
                                                    placeholder="Message draft goes here..."
                                                />
                                                <button 
                                                    onClick={handleSaveDraft}
                                                    disabled={savingDraft || !outreachDraft}
                                                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {savingDraft ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                    {savingDraft ? "Saving..." : "Save Selection to DB"}
                                                </button>

                                                <button 
                                                    onClick={handleSendWA}
                                                    className="w-full h-16 bg-green-500 hover:bg-green-400 text-black font-black rounded-[24px] transition-all flex items-center justify-center gap-4 group"
                                                >
                                                    <MessageCircle size={24} />
                                                    <span className="text-sm uppercase tracking-[0.2em]">Send to Client</span>
                                                    <ChevronRight size={20} />
                                                </button>
                                            </div>
                                        </section>
                                    )}
                                </div>

                                {/* Right Column: Meta & Logs */}
                                {!isLive && (
                                    <div className="lg:col-span-4 bg-zinc-900/20 p-8 space-y-10">
                                        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-3">
                                            <div className="flex items-center gap-2 text-white/40">
                                                <Star size={14} className="text-accent-gold" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Market Status</span>
                                            </div>
                                            <p className="text-2xl font-black text-white">{lead.rating || '0.0'} <span className="text-xs text-white/20">Rating</span></p>
                                        </div>
                                        <section className="space-y-4">
                                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">Core Contact</h3>
                                            <div className="space-y-2">
                                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[11px] font-mono text-white/60">
                                                    {lead.wa}
                                                </div>
                                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[11px] text-white/60">
                                                    {lead.address}
                                                </div>
                                            </div>
                                        </section>
                                        <section className="space-y-4">
                                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">Operational History</h3>
                                            <div className="max-h-[300px] overflow-y-auto">
                                                <ActivityTimeline leadId={lead.id} />
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-white/5 bg-zinc-900/50 flex justify-between items-center">
                            <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                Lead ID: {lead.id}
                            </div>
                            <button 
                                onClick={onClose}
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest border border-white/10"
                            >
                                Close
                            </button>
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
