'use client';

import { useState } from 'react';
import { Send, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateWaLink } from '@/lib/actions';

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

    return (
        <div className="relative">
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
