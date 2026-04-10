'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Save, Sparkles, Wand2, Palette, Edit3, 
    Check, Loader2, Bot, Type, Layers 
} from 'lucide-react';
import { updateLeadHtml } from '@/lib/actions/lead';
import { tweakLeadStyleStrict, getStyleModels } from '@/lib/actions/ai';

interface EditPageModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any;
}

export default function EditPageModal({ isOpen, onClose, lead }: EditPageModalProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [styles, setStyles] = useState<any[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<string>('');
    const [magicPrompt, setMagicPrompt] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [isDirectEditEnabled, setIsDirectEditEnabled] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string>(lead?.htmlCode || '');
    const [revisionKey, setRevisionKey] = useState(0);

    useEffect(() => {
        async function load() {
            try {
                const s = await getStyleModels();
                if (s) setStyles(s);
            } catch (e) {
                console.error(e);
            }
        }
        if (isOpen) {
            load();
            setIsDirectEditEnabled(false);
            setMagicPrompt('');
            setPreviewHtml(lead?.htmlCode || '');
            setRevisionKey(r => r + 1);
        }
    }, [isOpen]);

    const isModified = previewHtml !== (lead?.htmlCode || '');

    const handleRevert = () => {
        if (window.confirm("Discards all preview changes. Are you sure?")) {
            setPreviewHtml(lead?.htmlCode || '');
            setRevisionKey(r => r + 1);
            showToast("Reverted to original state");
        }
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleEnableDirectEdit = () => {
        if (!iframeRef.current || !iframeRef.current.contentDocument) return;
        
        try {
            const doc = iframeRef.current.contentDocument;
            
            // Toggle edit mode
            const newState = !isDirectEditEnabled;
            
            if (newState) {
                // Enable contentEditable only for text nodes (p, h1, h2, h3, a, span)
                const textElements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, li');
                textElements.forEach((el: any) => {
                    el.contentEditable = "true";
                    el.style.outline = "1px dashed rgba(255,255,255,0.3)";
                    el.style.cursor = "text";
                });
                showToast("Direct Edit Enabled. Click texts to edit.");
            } else {
                // Disable contentEditable
                const textElements = doc.querySelectorAll('[contenteditable="true"]');
                textElements.forEach((el: any) => {
                    el.contentEditable = "false";
                    el.style.outline = "none";
                    el.style.cursor = "default";
                });
            }
            
            setIsDirectEditEnabled(newState);
        } catch (e) {
            console.error("Could not enable direct edit:", e);
            showToast("Failed to enable editor. Maybe a cross-origin error?");
        }
    };

    const handleSaveDirectHTML = async () => {
        if (!iframeRef.current || !iframeRef.current.contentDocument) return;
        setIsSaving(true);
        try {
            const doc = iframeRef.current.contentDocument;
            
            // Clean up contentEditables before saving
            const textElements = doc.querySelectorAll('[contenteditable="true"]');
            textElements.forEach((el: any) => {
                el.removeAttribute('contenteditable');
                el.style.outline = "none";
                el.style.cursor = "";
            });
            setIsDirectEditEnabled(false);

            const newHtml = doc.documentElement.outerHTML;
            const res = await updateLeadHtml(lead.id, newHtml);
            
            if (res.success) {
                showToast("Text Changes Saved!");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                alert("Save failed");
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAIRegenerate = async () => {
        if (isRegenerating) return;
        setIsRegenerating(true);
        try {
            const res = await tweakLeadStyleStrict(lead.id, selectedStyle, magicPrompt, true);
            if (res.success) {
                showToast("Style Preview ready! Click Save HTML to apply.");
                setPreviewHtml(res.htmlCode || '');
                setRevisionKey(r => r + 1);
            } else {
                alert("AI Regeneration failed: " + res.message);
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsRegenerating(false);
        }
    };

    if (!isOpen || !lead) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/95 backdrop-blur-xl"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-7xl h-[95vh] bg-zinc-950 border border-white/10 rounded-[32px] overflow-hidden flex flex-col md:flex-row shadow-2xl"
                >
                    {/* LEFT PANEL: 70% Iframe */}
                    <div className="flex-1 border-r border-white/5 relative flex flex-col bg-black">
                        <div className="h-16 border-b border-white/5 bg-zinc-900/50 flex items-center justify-between px-6 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent-gold/10 flex items-center justify-center border border-accent-gold/20">
                                    <Layers size={14} className="text-accent-gold" />
                                </div>
                                <h2 className="text-sm font-black text-white uppercase tracking-widest truncate">{lead.name} • Live Preview</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleEnableDirectEdit}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                        isDirectEditEnabled 
                                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' 
                                        : 'bg-white/5 text-white/60 hover:text-white border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    <Type size={14} /> {isDirectEditEnabled ? "Editing Enabled" : "Enable Text Editor"}
                                </button>
                                {isModified && (
                                    <button
                                        onClick={handleRevert}
                                        className="flex items-center gap-2 px-4 py-2 text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        <X size={14} /> Revert
                                    </button>
                                )}
                                <button
                                    onClick={handleSaveDirectHTML}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-2 bg-accent-gold text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                                >
                                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Save HTML
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 w-full h-full relative p-4 bg-[url('/grid-pattern.svg')] lg:p-8 overflow-hidden">
                            <div className="w-full h-full bg-white rounded-2xl md:rounded-[32px] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                                {previewHtml ? (
                                    <iframe 
                                        key={revisionKey}
                                        ref={iframeRef}
                                        srcDoc={previewHtml}
                                        className="w-full h-full border-none bg-white"
                                        title="Live Editor"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold uppercase tracking-widest text-xs">No HTML Content Built Yet</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: 30% Tools Hub */}
                    <div className="w-full h-auto md:w-[400px] shrink-0 bg-zinc-950 flex flex-col h-full">
                        {/* Header Panel */}
                        <div className="h-16 border-b border-white/5 bg-zinc-900/50 flex items-center justify-between px-6 shrink-0 relative overflow-hidden">
                            <div className="flex items-center gap-2 relative z-10">
                                <Edit3 size={16} className="text-white/40" />
                                <span className="text-xs font-black text-white/50 uppercase tracking-widest">Editing Center</span>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all z-10"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                            
                            {/* SECTION: Direct Editor Info */}
                            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-3">
                                <div className="flex items-center gap-3 text-blue-400">
                                    <Type size={18} />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest">Quick Text Edition</h3>
                                </div>
                                <p className="text-xs text-white/50 leading-relaxed font-medium">
                                    To quickly fix typos or change copywriting without AI credits, use the "Enable Text Editor" button above and click directly on texts inside the live preview.
                                </p>
                            </div>

                            <hr className="border-white/5" />

                            {/* SECTION: AI Magic Tools */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                        <Bot size={14} className="text-purple-400" />
                                    </div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">AI Style Overhaul</h3>
                                </div>

                                <div className="p-6 bg-purple-500/[0.02] border border-purple-500/10 rounded-[28px] space-y-5 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                                            <Palette size={12} /> Target Style
                                        </label>
                                        <select 
                                            value={selectedStyle}
                                            onChange={(e) => setSelectedStyle(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
                                        >
                                            <option value="" className="bg-zinc-900 italic text-white/40">None / Pure Magic Override</option>
                                            {styles.map(s => (
                                                <option key={s.id} value={s.id} className="bg-zinc-900">{s.icon} {s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                                            <Wand2 size={12} /> Magic Overrides (Optional)
                                        </label>
                                        <textarea 
                                            value={magicPrompt}
                                            onChange={(e) => setMagicPrompt(e.target.value)}
                                            rows={3}
                                            placeholder="Example: Change button color to pastel pink, re-arrange hero to left..."
                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-xs font-medium text-white/80 outline-none focus:border-purple-500/50 resize-none"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button 
                                            onClick={handleAIRegenerate}
                                            disabled={isRegenerating}
                                            className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                                isRegenerating
                                                ? 'bg-purple-500/20 text-purple-400 cursor-not-allowed border border-purple-500/30'
                                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20'
                                            }`}
                                        >
                                            {isRegenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                            {isRegenerating ? 'Consulting Kie.ai...' : 'Force AI Regeneration'}
                                        </button>
                                        <p className="text-[8px] text-white/30 text-center mt-3 uppercase tracking-widest">
                                            Strict Constraint applied unless overridden.
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Toast Notification */}
                    <AnimatePresence>
                        {toast && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, x: '-50%' }}
                                animate={{ opacity: 1, y: 0, x: '-50%' }}
                                exit={{ opacity: 0, y: 20, x: '-50%' }}
                                className="absolute bottom-6 left-1/2 z-[300] bg-zinc-900 border border-white/10 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 whitespace-nowrap"
                            >
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <p className="text-xs font-black uppercase tracking-widest text-white">{toast}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
