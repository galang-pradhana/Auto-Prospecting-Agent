'use client';

import { useState } from 'react';
import { Send, CheckCircle2, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateWaLink } from '@/lib/actions/settings';

interface WaTemplate {
    id: string;
    title: string;
    category?: string | null;
    isDefault: boolean;
}

interface SendWaButtonProps {
    leadId: string;
    leadName: string;
    templates: WaTemplate[];
}

export default function SendWaButton({ leadId, leadName, templates }: SendWaButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<{ message: string; templateName: string } | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    const handleSend = async (templateId?: string) => {
        setLoading(templateId || 'default');
        try {
            const res = await generateWaLink(leadId, templateId);
            if (res.success && res.url) {
                window.open(res.url, '_blank');
            } else {
                alert(res.message || 'Failed to generate WhatsApp link');
            }
        } catch (error) {
            console.error('Send WA error:', error);
            alert('An unexpected error occurred');
        } finally {
            setLoading(null);
            setIsOpen(false);
        }
    };

    const handleMouseEnter = async () => {
        setShowPreview(true);
        if (!previewData && !loadingPreview) {
            setLoadingPreview(true);
            try {
                const res = await generateWaLink(leadId);
                if (res.success && res.message) {
                    setPreviewData({ message: res.message, templateName: res.templateName || 'Unknown Template' });
                }
            } catch (error) {
                console.error('Preview WA error:', error);
            } finally {
                setLoadingPreview(false);
            }
        }
    };

    const handleMouseLeave = () => {
        setShowPreview(false);
    };

    return (
        <div 
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={() => templates.length > 1 ? setIsOpen(!isOpen) : handleSend()}
                disabled={loading !== null}
                className="w-12 h-12 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-xl flex items-center justify-center transition-all group/send"
                title="Send WhatsApp"
            >
                {loading ? (
                    <Loader2 size={16} className="animate-spin text-green-400" />
                ) : (
                    <Send size={16} className="text-green-400 group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5 transition-transform" />
                )}
            </button>

            <AnimatePresence>
                {showPreview && !isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 bg-zinc-950/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl z-[60] pointer-events-none flex flex-col"
                    >
                        {templates.length === 0 ? (
                            <div className="p-5 flex flex-col items-center gap-3 text-center">
                                <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20">
                                    <AlertCircle size={20} className="text-amber-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-white">Belum Ada Template WA</p>
                                    <p className="text-[10px] text-white/50 leading-relaxed font-medium">Buat template terlebih dahulu di Settings agar dapat mengirim pesan dengan cepat.</p>
                                </div>
                                <div className="mt-2 text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 max-w-[90%] truncate">
                                    Pesan Akan Di-Generate AI
                                </div>
                                
                                {previewData && (
                                    <div className="mt-2 w-full p-3 bg-white/5 rounded-xl text-left border border-white/5">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">AI Fallback Preview</p>
                                        <div className="text-[10px] text-white/70 whitespace-pre-wrap line-clamp-4 leading-relaxed font-medium">
                                            {previewData.message}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : loadingPreview ? (
                            <div className="p-8 flex flex-col items-center justify-center gap-3">
                                <Loader2 size={24} className="animate-spin text-green-400" />
                                <p className="text-[10px] text-green-400/70 uppercase tracking-widest font-black animate-pulse">Menghasilkan Preview...</p>
                            </div>
                        ) : previewData ? (
                            <div className="flex flex-col">
                                <div className="p-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center bg-gradient-to-r from-transparent to-green-500/5">
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Template Aktif</p>
                                    <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20 max-w-[120px] truncate">{previewData.templateName}</span>
                                </div>
                                <div className="p-4 text-[11px] text-white/80 whitespace-pre-wrap max-h-56 overflow-y-auto custom-scrollbar leading-relaxed">
                                    {previewData.message}
                                </div>
                            </div>
                        ) : null}
                        
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-950 border-b border-r border-white/10 rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsOpen(false)} 
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute bottom-full right-0 mb-4 w-64 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                            <div className="p-3 border-b border-white/5 bg-white/[0.02]">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest px-2">Select Template</p>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-1 custom-scrollbar">
                                {templates.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleSend(t.id)}
                                        disabled={loading !== null}
                                        className="w-full p-3 flex flex-col items-start gap-1 hover:bg-white/5 rounded-xl transition-all group/item border border-transparent hover:border-white/5"
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-[11px] font-bold text-white group-hover/item:text-green-400 transition-colors uppercase tracking-tight">{t.title}</span>
                                            {t.isDefault && (
                                                <CheckCircle2 size={10} className="text-green-500" />
                                            )}
                                        </div>
                                        {t.category && (
                                            <span className="text-[9px] font-medium text-white/30 italic">{t.category}</span>
                                        )}
                                    </button>
                                ))}
                                {templates.length === 0 && (
                                    <button
                                        onClick={() => handleSend()}
                                        className="w-full p-4 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white"
                                    >
                                        <MessageSquare size={14} />
                                        <span className="text-xs font-bold uppercase tracking-widest">AI Generation</span>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
