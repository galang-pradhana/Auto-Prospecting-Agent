'use client';

import React, { useState } from 'react';
import { 
    MapPin, Trash2, ArrowUpRight, CheckCircle2, 
    AlertTriangle, Database, RefreshCw, X
} from 'lucide-react';
import { deleteSandboxLead, promoteToLead } from '@/lib/actions/sandbox';
import { motion, AnimatePresence } from 'framer-motion';

interface SandboxLead {
    id: string;
    name: string | null;
    wa: string | null;
    category: string | null;
    address: string | null;
    city: string | null;
    mapsUrl: string | null;
    reason: string | null;
    aiAnalysis: any;
    createdAt: Date | string;
}

interface SandboxClientProps {
    initialLeads: SandboxLead[];
}

export default function SandboxClient({ initialLeads }: SandboxClientProps) {
    const [leads, setLeads] = useState(initialLeads);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [correctedWa, setCorrectedWa] = useState<Record<string, string>>({});
    const [openForms, setOpenForms] = useState<Record<string, boolean>>({});

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this invalid lead permanently?")) return;
        setProcessingId(id);
        try {
            const res = await deleteSandboxLead(id);
            if (res.success) {
                setLeads(prev => prev.filter(l => l.id !== id));
            } else {
                alert(res.message);
            }
        } catch (e) {
            alert("Error deleting lead.");
        } finally {
            setProcessingId(null);
        }
    };

    const handlePromote = async (id: string) => {
        const wa = correctedWa[id];
        if (!wa || wa.trim() === '') {
            alert("Please enter a valid WhatsApp number.");
            return;
        }

        setProcessingId(id);
        try {
            const res = await Promise.resolve(promoteToLead(id, wa));
            if (res.success) {
                setLeads(prev => prev.filter(l => l.id !== id));
                // Show a success toast or alert
                alert("Lead promoted to FRESH successfully!");
            } else {
                alert(res.message || "Failed to promote lead.");
            }
        } catch (e) {
            alert("Error promoting lead.");
        } finally {
            setProcessingId(null);
        }
    };

    const toggleForm = (id: string) => {
        setOpenForms(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    return (
        <div className="space-y-8 pb-32">
            <div className="flex flex-col gap-1 text-center md:text-left">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                    <Database className="text-red-500" strokeWidth={3} />
                    Data Sandbox
                </h1>
                <p className="text-white/40 font-medium italic">
                    Quarantine zone for unstructured data. Requires manual research and correction.
                </p>
            </div>

            {leads.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                        {leads.map((lead) => (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                key={lead.id} 
                                className="glass p-6 rounded-[32px] border-white/5 bg-zinc-950/40 hover:border-red-500/30 transition-all flex flex-col group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                                
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">{lead.category || 'N/A'}</div>
                                        <div className="text-[9px] text-white/20 mt-1">{new Date(lead.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>

                                <div className="space-y-1 mb-4 flex-1">
                                    <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2">{lead.name || 'Unnamed Data'}</h3>
                                    <div className="flex items-start gap-2 text-white/50 text-xs mt-2">
                                        <MapPin size={12} className="shrink-0 mt-0.5 text-white/20" />
                                        <span className="line-clamp-2">{lead.address || 'No Address'}</span>
                                    </div>
                                    <div className="mt-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="text-[10px] font-black uppercase text-red-400">Rejection Analysis</div>
                                            <span className="text-[8px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
                                                {lead.reason || 'AI_FILTER'}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-white/80 leading-relaxed italic">
                                            "{lead.aiAnalysis?.reason || 'Nama generik atau tidak ada kontak valid yang ditemukan oleh AI.'}"
                                        </div>
                                        {lead.wa && (
                                            <div className="text-[10px] text-white/40 font-mono mt-2 border-t border-white/5 pt-1">
                                                Raw WA: {lead.wa}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5 space-y-3">
                                    {!openForms[lead.id] ? (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    const url = lead.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((lead.name || '') + ' ' + (lead.address || ''))}`;
                                                    window.open(url, '_blank');
                                                }}
                                                className="flex-1 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-wider"
                                            >
                                                <MapPin size={14} /> Research
                                            </button>
                                            <button 
                                                onClick={() => toggleForm(lead.id)}
                                                className="flex-1 py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-wider"
                                            >
                                                <ArrowUpRight size={14} /> Resolve
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(lead.id)}
                                                disabled={processingId === lead.id}
                                                className="w-10 h-10 bg-zinc-800 hover:bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                                            >
                                                {processingId === lead.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 p-3 bg-white/5 border border-white/10 rounded-xl relative">
                                            <button 
                                                onClick={() => toggleForm(lead.id)}
                                                className="absolute -top-2 -right-2 p-1 bg-zinc-800 rounded-full text-white/50 hover:text-white hover:bg-zinc-700 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Corrected WhatsApp Number</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. 08123456789"
                                                    value={correctedWa[lead.id] || ''}
                                                    onChange={(e) => setCorrectedWa(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 placeholder:text-white/20"
                                                />
                                            </div>
                                            <button 
                                                onClick={() => handlePromote(lead.id)}
                                                disabled={processingId === lead.id}
                                                className="w-full py-2 bg-green-500 text-black font-black rounded-lg flex items-center justify-center gap-2 hover:bg-green-400 transition-colors disabled:opacity-50 text-[10px] uppercase tracking-wider"
                                            >
                                                {processingId === lead.id ? (
                                                    <RefreshCw size={14} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle2 size={14} /> Promote to Leads
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="py-32 flex flex-col items-center justify-center gap-6 bg-white/[0.02] border border-dashed border-white/10 rounded-[40px] text-center px-6">
                    <div className="w-20 h-20 bg-green-500/5 rounded-full flex items-center justify-center border border-green-500/10">
                        <CheckCircle2 className="w-10 h-10 text-green-500/50" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white/60 uppercase tracking-tighter">Sandbox is Empty</h3>
                        <p className="text-sm text-white/30 max-w-sm mx-auto font-medium">
                            No invalid data detected. All your recent scraper operations yielded high-quality leads.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
