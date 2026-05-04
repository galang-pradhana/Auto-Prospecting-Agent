'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Hammer, Wand2, Eye, Save, Loader2, X, Globe, Layout, Code2 } from 'lucide-react';
import { generateForgeCode } from '@/lib/actions/ai';
import { saveForgeCode } from '@/lib/actions/lead';
import { getUserSettings } from '@/lib/actions/user-settings';

interface TheForgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: {
        id: string;
        name: string;
        htmlCode?: string | null;
        masterWebsitePrompt?: string | null;
        slug?: string | null;
    };
}

export default function TheForgeModal({ isOpen, onClose, lead }: TheForgeModalProps) {
    const router = useRouter();
    const [htmlCode, setHtmlCode] = useState(lead.htmlCode || '');
    const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [modelId, setModelId] = useState('gemini-3-1-pro');
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [blueprintData, setBlueprintData] = useState<any>(null);
    const [isLoadingBlueprint, setIsLoadingBlueprint] = useState(true);
    const [showBrief, setShowBrief] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            const settings = await getUserSettings();
            if (settings?.htmlModel) {
                setModelId(settings.htmlModel);
            }
        };

        const fetchBlueprint = async () => {
            try {
                const res = await fetch(`/api/leads/${lead.id}/blueprint`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.submission) {
                        setBlueprintData(data.submission);
                    }
                }
            } catch (error) {
                console.error("Error fetching blueprint:", error);
            } finally {
                setIsLoadingBlueprint(false);
            }
        };

        fetchSettings();
        fetchBlueprint();
    }, [lead.id]);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setStatusMessage({ type, text });
        setTimeout(() => setStatusMessage(null), 5000);
    };

    const handleSave = async () => {
        if (!htmlCode.trim()) {
            showMessage('error', 'Please provide some HTML code.');
            return;
        }

        setIsSaving(true);
        try {
            const result = await saveForgeCode(lead.id, htmlCode);
            if (result.success) {
                showMessage('success', `Website saved for ${lead.name}! Status is now LIVE.`);
                setTimeout(() => {
                    onClose();
                    router.push('/dashboard/live');
                }, 1500);
            } else {
                showMessage('error', result.message || 'Failed to save code');
            }
        } catch (error) {
            showMessage('error', 'An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerate = async (isReset: boolean = false) => {
        if (isReset) {
            setHtmlCode('');
        }

        setIsGenerating(true);
        try {
            const res = await fetch('/api/forge/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId: lead.id, modelId })
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
                        setIsGenerating(false);
                        // Fetch the updated lead to get the htmlCode
                        const leadRes = await fetch(`/api/leads/${lead.id}`);
                        const leadData = await leadRes.json();
                        if (leadData.lead?.htmlCode) {
                            setHtmlCode(leadData.lead.htmlCode);
                            setActiveTab('manual');
                            showMessage('success', 'Website code generated successfully!');
                            router.refresh(); // Refresh dashboard data
                        }
                    } else if (statusData.job?.status === 'FAILED') {
                        clearInterval(pollInterval);
                        setIsGenerating(false);
                        showMessage('error', statusData.job.message || 'Failed to generate code');
                    }
                } catch (e) {
                    console.error("Polling error:", e);
                }
            }, 3000);

            showMessage('success', 'AI Forge started in background...');
        } catch (error: any) {
            showMessage('error', error.message || 'An error occurred during generation.');
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
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
                    className="relative w-full max-w-5xl h-[85vh] bg-zinc-950 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="p-5 md:p-8 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-500/10 rounded-xl md:rounded-2xl flex items-center justify-center border border-orange-500/20 shrink-0">
                                <Hammer className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg md:text-2xl font-black text-white tracking-tighter uppercase truncate">The Forge</h2>
                                <p className="text-white/40 text-[8px] md:text-[10px] font-black uppercase tracking-widest mt-0.5 truncate">
                                    Project: <span className="text-white">{lead.name}</span>
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 md:p-3 hover:bg-white/5 rounded-xl md:rounded-2xl text-white/20 hover:text-white transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="px-5 md:px-8 pt-4 md:pt-6">
                        <div className="flex gap-1.5 md:gap-2 p-1 md:p-1.5 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl w-full sm:w-fit">
                            <button 
                                onClick={() => setActiveTab('manual')}
                                className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'manual' ? 'bg-orange-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                <Code2 size={14} /> <span className="hidden xs:inline">Manual Editor</span>
                                <span className="xs:hidden">Editor</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('ai')}
                                className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                <Wand2 size={14} /> <span className="hidden xs:inline">AI Generator</span>
                                <span className="xs:hidden">AI</span>
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden p-4 md:p-8">
                        {activeTab === 'manual' ? (
                            <div className="h-full flex flex-col gap-4">
                                <textarea
                                    value={htmlCode}
                                    onChange={(e) => setHtmlCode(e.target.value)}
                                    placeholder="Paste HTML code here... (Include Tailwind CDN for best styling)"
                                    className="flex-1 w-full bg-black/50 border border-white/5 rounded-[24px] p-6 text-xs font-mono text-amber-100/80 outline-none focus:border-orange-500/30 transition-all resize-none shadow-inner"
                                />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center gap-8 bg-purple-500/[0.02] border border-dashed border-purple-500/20 rounded-[40px]">
                                <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20 animate-pulse">
                                    <Wand2 className="w-10 h-10 text-purple-400" />
                                </div>
                                <div className="text-center space-y-3 max-w-sm">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">AI Website Synthesis</h3>
                                    <p className="text-sm text-white/40 leading-relaxed font-medium">
                                        We will synthesize the code using the <span className="text-white">Master Website Prompt</span>. This includes styling, structure, and conversion logic.
                                    </p>
                                </div>                                 <div className="w-full max-w-lg space-y-4 px-6 py-8 bg-zinc-900/50 border border-white/5 rounded-[32px]">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">AI Synthesis Engine</p>
                                        {!isLoadingBlueprint && blueprintData && (
                                            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5 animate-pulse">
                                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Blueprint DNA Detected</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <select 
                                        value={modelId}
                                        onChange={(e) => setModelId(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-4 text-xs font-black text-white outline-none focus:border-purple-500/50 transition-all cursor-pointer appearance-none text-center"
                                    >
                                        <optgroup label="── High-Performance ──">
                                            <option value="gemini-3-1-pro">🟢 Gemini 3.1 Pro (Recommended)</option>
                                            <option value="claude-sonnet-4-6">🔵 Claude Sonnet 4.6 (Visual Master)</option>
                                        </optgroup>
                                        <optgroup label="── OpenRouter ──">
                                            <option value="deepseek-v4-pro">🟣 DeepSeek V4 Pro</option>
                                            <option value="qwen3.6-plus">🟠 Qwen 3.6 Plus</option>
                                        </optgroup>
                                    </select>

                                    {blueprintData && (
                                        <div className="space-y-3">
                                            <button 
                                                onClick={() => setShowBrief(!showBrief)}
                                                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-black text-white/60 uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                                            >
                                                {showBrief ? <X size={12} /> : <Eye size={12} />}
                                                {showBrief ? 'Hide Design Brief' : 'View Design Brief (Blueprint)'}
                                            </button>
                                            
                                            {showBrief && (
                                                <motion.div 
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="p-4 bg-black/80 rounded-2xl border border-white/5 space-y-3 overflow-hidden"
                                                >
                                                    <div className="flex flex-wrap gap-2">
                                                        <div className="px-2 py-1 bg-white/5 rounded-md text-[8px] font-bold text-white/40 uppercase">Brand: {blueprintData.answers?.brand_name}</div>
                                                        <div className="px-2 py-1 bg-white/5 rounded-md text-[8px] font-bold text-white/40 uppercase">Vibe: {blueprintData.answers?.vibe?.join(', ')}</div>
                                                        <div className="px-2 py-1 bg-white/5 rounded-md text-[8px] font-bold text-white/40 uppercase">Logo: {blueprintData.logoPath ? 'Yes' : 'No'}</div>
                                                    </div>
                                                    <p className="text-[10px] text-white/60 leading-relaxed font-medium italic">
                                                        "{blueprintData.answers?.tagline}"
                                                    </p>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const prompt = lead.masterWebsitePrompt || "";
                                                            navigator.clipboard.writeText(prompt);
                                                            showMessage('success', 'Master Prompt copied to clipboard!');
                                                        }}
                                                        className="w-full py-2 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/20 rounded-lg text-[8px] font-black text-orange-400 uppercase tracking-widest flex items-center justify-center gap-2 transition-all mt-2"
                                                    >
                                                        <Copy size={10} /> Copy Master Prompt Template
                                                    </button>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center px-8">
                                    <button 
                                        onClick={() => handleGenerate(false)}
                                        disabled={isGenerating}
                                        className="flex-1 max-w-xs py-5 bg-purple-600 hover:bg-purple-500 shadow-[0_10px_40px_rgba(147,51,234,0.3)] text-white disabled:opacity-50 font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase text-xs tracking-widest"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Synthesizing...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-5 h-5" />
                                                {htmlCode ? 'Refine Website' : 'Forge Website'}
                                            </>
                                        )}
                                    </button>

                                    {htmlCode && (
                                        <button 
                                            onClick={() => {
                                                if (confirm("Reset current code and re-generate from Blueprint brief? This will delete current edits.")) {
                                                    handleGenerate(true);
                                                }
                                            }}
                                            disabled={isGenerating}
                                            className="flex-1 max-w-[200px] py-5 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/50 text-white/40 hover:text-red-400 disabled:opacity-50 font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase text-xs tracking-widest"
                                        >
                                            <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''} />
                                            Reset & Reforge
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-white/5 bg-zinc-900/50 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            {statusMessage && (
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${statusMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                                >
                                    {statusMessage.type === 'success' ? <Globe size={12} /> : <X size={12} />}
                                    {statusMessage.text}
                                </motion.div>
                            )}
                        </div>

                        <div className="flex gap-4">
                             {htmlCode && (
                                <div className="flex gap-2">
                                    <button 
                                        className="h-14 px-8 border border-white/10 hover:bg-white/5 text-white/40 hover:text-white font-black rounded-2xl flex items-center gap-3 transition-all text-[10px] uppercase tracking-widest"
                                    >
                                        <Eye size={16} /> Preview
                                    </button>
                                </div>
                            )}
                            
                            <button 
                                onClick={handleSave}
                                disabled={isSaving || !htmlCode}
                                className="h-14 px-10 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black rounded-2xl flex items-center gap-3 transition-all shadow-xl active:scale-[0.98] text-xs uppercase tracking-tighter"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Deploy to Live
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

