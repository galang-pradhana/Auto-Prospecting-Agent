'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
    Flame, 
    Brain, 
    Hammer, 
    Globe, 
    MessageSquare, 
    RefreshCw, 
    Clock,
    CheckCircle2,
    Zap
} from 'lucide-react';
import { getActivityLogs } from '@/lib/actions/lead';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityLog {
    id: string;
    action: string;
    description: string | null;
    metadata: any;
    createdAt: string | Date;
}

const ACTION_CONFIG: Record<string, { icon: any, color: string, label: string }> = {
    SCRAPE: { icon: Flame, color: 'text-orange-400', label: 'Ingestion' },
    ENRICH: { icon: Brain, color: 'text-purple-400', label: 'AI Enrichment' },
    FORGE: { icon: Hammer, color: 'text-blue-400', label: 'Forge Build' },
    LIVE: { icon: Globe, color: 'text-green-400', label: 'Published' },
    WA_SENT: { icon: MessageSquare, color: 'text-emerald-400', label: 'WhatsApp' },
    TWEAK: { icon: Zap, color: 'text-yellow-400', label: 'Style Tweak' },
    DEFAULT: { icon: CheckCircle2, color: 'text-gray-400', label: 'Activity' }
};

export function ActivityTimeline({ leadId }: { leadId: string }) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const data = await getActivityLogs(leadId);
        setLogs(data as any);
        setLoading(false);
    }, [leadId]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return (
        <div className="relative pl-4 space-y-6">
            <div className="flex justify-end absolute top-0 right-0 z-20">
                <button 
                    onClick={fetchLogs}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
                    title="Refresh Timeline"
                >
                    <RefreshCw size={14} className={`text-white/30 group-hover:text-accent-gold ${loading ? 'animate-spin text-accent-gold' : ''}`} />
                </button>
            </div>

            {/* Vertical Line */}
            <div className="absolute left-[1.1rem] top-2 bottom-2 w-[1px] border-l border-dashed border-white/10" />

            <AnimatePresence mode="popLayout">
                {logs.map((log, index) => {
                        const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.DEFAULT;
                        const date = new Date(log.createdAt);
                        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

                        return (
                            <motion.div 
                                key={log.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="relative flex gap-6 group"
                            >
                                {/* Icon Container */}
                                <div className="relative z-10 flex-shrink-0 w-9 h-9 rounded-full bg-premium-800 border border-white/5 flex items-center justify-center shadow-xl group-hover:border-accent-gold/30 transition-colors">
                                    <config.icon size={16} className={config.color} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white/90">{config.label}</span>
                                            {log.metadata?.credits_used && (
                                                <span className="px-2 py-0.5 rounded-full bg-accent-gold/10 text-[10px] font-bold text-accent-gold border border-accent-gold/20">
                                                    {log.metadata.credits_used} Credits
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-medium text-white/20">{dateStr}, {timeStr}</span>
                                    </div>
                                    <p className="text-xs text-white/40 leading-relaxed font-medium">
                                        {log.description || `Performed ${log.action.toLowerCase()} action`}
                                    </p>
                                    
                                    {/* Collapsible Metadata (Optional) */}
                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {Object.entries(log.metadata).map(([key, val]) => {
                                                if (key === 'credits_used') return null;
                                                return (
                                                    <span key={key} className="text-[9px] text-white/20 bg-white/[0.02] px-1.5 py-0.5 rounded border border-white/[0.03]">
                                                        {key}: {String(val)}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {logs.length === 0 && !loading && (
                    <div className="text-center py-8">
                        <p className="text-xs text-white/20 font-medium italic">No activity recorded yet</p>
                    </div>
                )}
        </div>
    );
}
