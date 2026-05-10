'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
    Building2, MapPin, Loader2, Sparkles, Check, Copy, Code2, Play, Sliders
} from 'lucide-react';
import { getUserSettings } from '@/lib/actions/user-settings';
import { motion } from 'framer-motion';

interface BlueprintLead {
    id: string;
    name: string;
    category: string;
    city: string;
    prototypeHtml?: string | null;
    masterWebsitePrompt?: string | null;
    brandDna: {
        status: string;
        answers: any;
    };
}

interface Props {
    initialLeads: BlueprintLead[];
}

export default function EnrichBlueprintClient({ initialLeads }: Props) {
    const router = useRouter();
    const [leads, setLeads] = useState<BlueprintLead[]>(initialLeads);
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [assemblingId, setAssemblingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [modelId, setModelId] = useState('gemini-3-1-pro');
    
    // Polling IDs
    const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchSettings = async () => {
            const settings = await getUserSettings();
            if (settings?.htmlModel) {
                setModelId(settings.htmlModel);
            }
        };
        fetchSettings();
    }, []);

    const handleAssemblePrompt = async (leadId: string) => {
        setAssemblingId(leadId);
        try {
            const res = await fetch('/api/brand-blueprint/assemble', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to initiate synthesis');
            }
            
            // Poll for completion
            pollStatus(leadId);

        } catch (error: any) {
            toast.error(error.message || 'Failed to assemble prompt');
            setAssemblingId(null);
        }
    };

    const handleCopyPrompt = async (leadId: string) => {
        try {
            const res = await fetch(`/api/leads/${leadId}/prompt-preview`);
            const data = await res.json();
            if (data.success && data.prompt) {
                await navigator.clipboard.writeText(data.prompt);
                setCopiedId(leadId);
                toast.success('Prompt copied to clipboard!');
                setTimeout(() => setCopiedId(null), 2000);
            } else {
                toast.error(data.message || 'Failed to fetch prompt');
            }
        } catch (error) {
            toast.error('Failed to copy prompt');
        }
    };

    const handleForgeHtml = async (leadId: string) => {
        setGeneratingId(leadId);
        setPollingIds(prev => new Set(prev).add(leadId));
        toast.loading('Initiating Blueprint Forge...', { id: `forge-${leadId}` });

        try {
            const res = await fetch('/api/brand-blueprint/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId, modelId }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to initiate forge');
            }
            
            // Polling will handle the rest
            pollStatus(leadId);

        } catch (error: any) {
            toast.error(error.message || 'Failed to start forge', { id: `forge-${leadId}` });
            setGeneratingId(null);
            setPollingIds(prev => {
                const next = new Set(prev);
                next.delete(leadId);
                return next;
            });
        }
    };

    const pollStatus = (leadId: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/jobs/active?leadId=${leadId}`);
                const data = await res.json();
                
                if (data.hasActiveJob) {
                    // Still generating
                    return;
                }

                // Check if prototypeHtml was updated
                const checkRes = await fetch(`/api/leads/${leadId}/prompt-preview`); // We can use another endpoint or just refresh
                clearInterval(interval);
                setGeneratingId(null);
                setAssemblingId(null);
                setPollingIds(prev => {
                    const next = new Set(prev);
                    next.delete(leadId);
                    return next;
                });
                
                toast.success('Task Complete!', { id: `forge-${leadId}` });
                toast.success('Task Complete!', { id: `assemble-${leadId}` });
                router.refresh(); // Refresh page to get latest data
                
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 5000);
    };

    // If leads change from props, update state (useful after router.refresh())
    useEffect(() => {
        setLeads(initialLeads);
    }, [initialLeads]);

    return (
        <div className="px-4 md:px-0">
            {leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/50 bg-black/20 rounded-2xl border border-white/5">
                    <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">No Blueprint leads found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {leads.map(lead => {
                        const isGenerating = generatingId === lead.id || pollingIds.has(lead.id);
                        const isAssembling = assemblingId === lead.id;
                        const hasPrompt = !!lead.masterWebsitePrompt;
                        const hasHtml = !!lead.prototypeHtml;

                        return (
                            <motion.div 
                                key={lead.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#111111] rounded-2xl border border-white/10 p-5 flex flex-col hover:border-white/20 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-white text-lg line-clamp-1">{lead.name}</h3>
                                        <div className="flex items-center text-xs text-white/50 mt-1 gap-3">
                                            <span className="flex items-center"><Building2 className="w-3 h-3 mr-1"/> {lead.category}</span>
                                            <span className="flex items-center"><MapPin className="w-3 h-3 mr-1"/> {lead.city}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Model Selector for this card (only if wanting to forge) */}
                                    <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/5">
                                        <Sliders className="w-3 h-3 text-white/40 ml-2 mr-1" />
                                        <select 
                                            value={modelId}
                                            onChange={(e) => setModelId(e.target.value)}
                                            className="bg-zinc-900 text-xs text-white/70 outline-none pr-1 py-1 appearance-none cursor-pointer border border-white/10 rounded-md px-2"
                                            disabled={isGenerating}
                                        >
                                            <option value="gemini-3-1-pro" className="bg-[#111111] text-white">Gemini Pro</option>
                                            <option value="claude-3-7-sonnet" className="bg-[#111111] text-white">Claude Sonnet</option>
                                            <option value="claude-3-5-haiku" className="bg-[#111111] text-white">Claude Haiku</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-6">
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                                        lead.brandDna?.status === 'SUBMITTED' ? 'bg-green-500/20 text-green-400' :
                                        lead.brandDna?.status === 'VIEWED' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-amber-500/20 text-amber-400'
                                    }`}>
                                        DNA: {lead.brandDna?.status || 'UNKNOWN'}
                                    </span>
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                                        hasPrompt ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-white/40'
                                    }`}>
                                        {hasPrompt ? '✓ Prompt Ready' : '— No Prompt'}
                                    </span>
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                                        hasHtml ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                    }`}>
                                        {hasHtml ? '✓ HTML Ready' : '⏳ Belum Generate'}
                                    </span>
                                </div>

                                <div className="mt-auto flex flex-col gap-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        {!hasPrompt ? (
                                            <button 
                                                onClick={() => handleAssemblePrompt(lead.id)}
                                                disabled={isAssembling || isGenerating}
                                                className="col-span-2 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isAssembling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4" />}
                                                Assemble Prompt
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleCopyPrompt(lead.id)}
                                                className="col-span-2 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                            >
                                                {copiedId === lead.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                                {copiedId === lead.id ? 'Copied!' : 'Copy Master Prompt'}
                                            </button>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleForgeHtml(lead.id)}
                                        disabled={!hasPrompt || isGenerating}
                                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                            isGenerating ? 'bg-purple-500/20 text-purple-400' :
                                            !hasPrompt ? 'bg-white/5 text-white/30 cursor-not-allowed' :
                                            'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 shadow-lg shadow-purple-500/20'
                                        }`}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Forging HTML...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4 fill-current" />
                                                Forge HTML
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
