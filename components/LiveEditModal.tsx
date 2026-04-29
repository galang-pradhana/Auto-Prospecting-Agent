'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Code2, Eye, Save, RotateCcw, 
    Monitor, Tablet, Smartphone, Search,
    Download, Check, AlertCircle, Maximize2, Minimize2
} from 'lucide-react';
import { updateLeadHtml } from '@/lib/actions/lead';

interface LiveEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any;
}

export default function LiveEditModal({ isOpen, onClose, lead }: LiveEditModalProps) {
    const [html, setHtml] = useState(lead?.htmlCode || '');
    const [previewMode, setPreviewMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        if (lead?.htmlCode) {
            setHtml(lead.htmlCode);
        }
    }, [lead]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await updateLeadHtml(lead.id, html);
            if (res.success) {
                setShowToast(true);
                setTimeout(() => {
                    setShowToast(false);
                    window.location.reload();
                }, 1000);
            } else {
                alert('Gagal menyimpan: ' + res.message);
            }
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (!lead) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex flex-col bg-zinc-950 text-white">
                    {/* Toolbar Header */}
                    <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-white/10 bg-zinc-900/50 backdrop-blur-xl gap-4 md:gap-0">
                        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                            <div className="p-2 bg-accent-gold/10 rounded-xl border border-accent-gold/20 shrink-0">
                                <Code2 className="text-accent-gold" size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-2 truncate">
                                    Edit: <span className="text-accent-gold truncate">{lead.name}</span>
                                </h2>
                                <p className="text-[9px] md:text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5 hidden xs:block">Live Editor & Code Preview</p>
                            </div>
                        </div>

                        {/* View Controls (Desktop only) */}
                        <div className="hidden lg:flex items-center gap-1 p-1 bg-white/5 rounded-2xl border border-white/5">
                            <button 
                                onClick={() => { setPreviewMode(true); setViewMode('desktop'); }}
                                className={`p-2 rounded-xl transition-all ${viewMode === 'desktop' && previewMode ? 'bg-accent-gold text-black shadow-lg shadow-accent-gold/20' : 'text-white/40 hover:text-white'}`}
                            >
                                <Monitor size={16} />
                            </button>
                            <button 
                                onClick={() => { setPreviewMode(true); setViewMode('tablet'); }}
                                className={`p-2 rounded-xl transition-all ${viewMode === 'tablet' && previewMode ? 'bg-accent-gold text-black shadow-lg shadow-accent-gold/20' : 'text-white/40 hover:text-white'}`}
                            >
                                <Tablet size={16} />
                            </button>
                            <button 
                                onClick={() => { setPreviewMode(true); setViewMode('mobile'); }}
                                className={`p-2 rounded-xl transition-all ${viewMode === 'mobile' && previewMode ? 'bg-accent-gold text-black shadow-lg shadow-accent-gold/20' : 'text-white/40 hover:text-white'}`}
                            >
                                <Smartphone size={16} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            <button 
                                onClick={() => setPreviewMode(!previewMode)}
                                className={`flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest border flex-1 md:flex-none ${previewMode ? 'bg-white/10 text-white border-white/20' : 'bg-accent-gold text-black border-accent-gold/20'}`}
                            >
                                {previewMode ? <><Code2 size={12} /> Code</> : <><Eye size={12} /> Preview</>}
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-green-500 hover:bg-green-400 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 flex-1 md:flex-none"
                            >
                                {saving ? <RotateCcw className="animate-spin" size={12} /> : <Save size={12} />}
                                <span>{saving ? 'Saving' : 'Save'}</span>
                            </button>
                            <button 
                                onClick={onClose}
                                className="p-2 md:p-2.5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all ml-1"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Editor / Preview Area */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Side Editor (if split or code mode) */}
                        {!previewMode ? (
                            <div className="flex-1 relative flex flex-col lg:flex-row">
                                <div className="flex-1 flex flex-col">
                                    <div className="flex items-center justify-between px-6 py-2 bg-zinc-950 border-b border-white/5">
                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">index.html</span>
                                        <div className="flex gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                                        </div>
                                    </div>
                                    <textarea 
                                        className="flex-1 w-full bg-zinc-950 text-blue-300 p-8 font-mono text-sm leading-relaxed outline-none focus:ring-1 focus:ring-accent-gold/20 resize-none custom-scrollbar transition-all"
                                        spellCheck={false}
                                        value={html}
                                        onChange={(e) => setHtml(e.target.value)}
                                        placeholder="Paste your HTML here..."
                                    />
                                </div>
                            </div>
                        ) : (
                            /* Full Preview */
                            <div className="flex-1 bg-zinc-800 flex items-center justify-center p-8 transition-all duration-500 overflow-hidden">
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`bg-white shadow-2xl rounded-sm overflow-hidden transition-all duration-300 h-full ${
                                        viewMode === 'mobile' ? 'w-[375px]' : 
                                        viewMode === 'tablet' ? 'w-[768px]' : 
                                        'w-full'
                                    }`}
                                >
                                    <iframe 
                                        srcDoc={html}
                                        className="w-full h-full border-none"
                                        title="Preview"
                                    />
                                </motion.div>
                            </div>
                        )}
                    </div>

                    {/* Footer Status */}
                    <div className="px-8 py-3 border-t border-white/10 bg-zinc-900/50 flex justify-between items-center text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5"><Monitor size={12} /> Line Count: {html.split('\n').length}</span>
                            <span className="flex items-center gap-1.5"><Search size={12} /> Status: Ready for Live Deployment</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>Tailwind CSS Integrated</span>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        </div>
                    </div>

                    {/* Floating Toast */}
                    <AnimatePresence>
                        {showToast && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, x: '-50%' }}
                                animate={{ opacity: 1, y: 0, x: '-50%' }}
                                exit={{ opacity: 0, y: 20, x: '-50%' }}
                                className="fixed bottom-12 left-1/2 z-[300] bg-green-500 text-black px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase tracking-widest text-xs"
                            >
                                <Check size={18} />
                                HTML Code Updated Successfully!
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </AnimatePresence>
    );
}
