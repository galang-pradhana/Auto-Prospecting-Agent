'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hammer, Wand2, Eye, Save, Loader2, X, Globe, Layout, Code2 } from 'lucide-react';
import { generateForgeCode } from '@/lib/actions/ai';
import { saveForgeCode } from '@/lib/actions/lead';

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
    const [htmlCode, setHtmlCode] = useState(lead.htmlCode || '');
    const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
                // We keep it open so they can see the success or preview
            } else {
                showMessage('error', result.message || 'Failed to save code');
            }
        } catch (error) {
            showMessage('error', 'An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const result = await generateForgeCode(lead.id);
            if (result.success && result.html) {
                setHtmlCode(result.html);
                setActiveTab('manual');
                showMessage('success', 'Website code generated successfully!');
            } else {
                showMessage('error', result.message || 'Failed to generate code');
            }
        } catch (error) {
            showMessage('error', 'An error occurred during generation.');
        } finally {
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
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
                                <Hammer className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tighter uppercase">The Forge</h2>
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-0.5">
                                    Project: <span className="text-white">{lead.name}</span>
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-3 hover:bg-white/5 rounded-2xl text-white/20 hover:text-white transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="px-8 pt-6">
                        <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit">
                            <button 
                                onClick={() => setActiveTab('manual')}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'manual' ? 'bg-orange-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                <Code2 size={14} /> Manual Editor
                            </button>
                            <button 
                                onClick={() => setActiveTab('ai')}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                <Wand2 size={14} /> AI Generator
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden p-8">
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
                                </div>



                                <button 
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="px-10 py-5 bg-orange-600 hover:bg-orange-500 shadow-[0_10px_40px_rgba(234,88,12,0.4)] text-black disabled:opacity-50 font-black rounded-2xl flex items-center gap-3 transition-all active:scale-95 uppercase text-xs tracking-widest"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Forging...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-5 h-5" />
                                            Generate with Kie.ai
                                        </>
                                    )}
                                </button>
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

