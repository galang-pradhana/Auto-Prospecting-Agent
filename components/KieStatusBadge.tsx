'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type PulseStatus = 'loading' | 'online' | 'warning' | 'error';

interface StatusData {
    status: PulseStatus;
    label: string;
    credit?: string;
}

const STATUS_CONFIG: Record<PulseStatus, {
    icon: React.ReactNode;
    bgClass: string;
    dotClass: string;
    textClass: string;
    borderClass: string;
    tooltip: string;
    accentClass: string;
}> = {
    loading: {
        icon: <Loader2 size={12} className="animate-spin opacity-50" />,
        bgClass: 'bg-zinc-500/5',
        dotClass: 'bg-zinc-400',
        textClass: 'text-zinc-400',
        borderClass: 'border-white/5',
        tooltip: 'Memeriksa status Kie.ai...',
        accentClass: 'text-zinc-500',
    },
    online: {
        icon: <Sparkles size={12} className="text-accent-gold shadow-[0_0_8px_rgba(255,215,0,0.5)]" />,
        bgClass: 'bg-accent-gold/5',
        dotClass: 'bg-accent-gold',
        textClass: 'text-white',
        borderClass: 'border-accent-gold/20',
        tooltip: 'Kie.ai online & siap digunakan',
        accentClass: 'text-accent-gold',
    },
    warning: {
        icon: <RefreshCw size={12} className="animate-spin text-amber-500" style={{ animationDuration: '2s' }} />,
        bgClass: 'bg-amber-500/5',
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-400',
        borderClass: 'border-amber-500/20',
        tooltip: 'Kie.ai lambat / network lag',
        accentClass: 'text-amber-500',
    },
    error: {
        icon: <WifiOff size={12} className="text-rose-500" />,
        bgClass: 'bg-rose-500/5',
        dotClass: 'bg-rose-500',
        textClass: 'text-rose-400',
        borderClass: 'border-rose-500/20',
        tooltip: 'Kie.ai tidak tersambung',
        accentClass: 'text-rose-500',
    },
};

const POLL_INTERVAL_MS = 120_000;

export function KieStatusBadge({ initialCredit }: { initialCredit?: string }) {
    const [data, setData] = useState<StatusData>({
        status: 'loading',
        label: 'Checking...',
        credit: initialCredit,
    });
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const [checking, setChecking] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    const checkStatus = useCallback(async () => {
        if (checking) return;
        setChecking(true);
        try {
            const res = await fetch('/api/kie-status', { cache: 'no-store' });
            if (!res.ok) throw new Error('Network error');
            const json: any = await res.json();
            setData({
                status: json.status,
                label: json.label,
                credit: json.credit || '0'
            });
            setLastChecked(new Date());
        } catch {
            setData(prev => ({ ...prev, status: 'error', label: 'Offline' }));
        } finally {
            setChecking(false);
        }
    }, [checking]);

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);

    const cfg = STATUS_CONFIG[data.status];

    return (
        <div className="relative">
            {/* Minimalist Premium Pill */}
            <motion.button
                onClick={checkStatus}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                disabled={checking}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                whileTap={{ scale: 0.98 }}
                className={`
                    group flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all duration-300
                    ${cfg.bgClass} ${cfg.borderClass} backdrop-blur-md
                    cursor-pointer shadow-sm
                `}
            >
                {/* Status Indicator */}
                <div className="relative flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={data.status + (checking ? 'check' : 'idle')}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                        >
                            {checking ? <Loader2 size={12} className="animate-spin opacity-40 text-accent-gold" /> : cfg.icon}
                        </motion.div>
                    </AnimatePresence>
                    
                    {/* Tiny Status Dot */}
                    <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                        {data.status === 'online' && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-gold opacity-40" />
                        )}
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${cfg.dotClass}`} />
                    </span>
                </div>

                {/* Horizontal Divider */}
                <div className="w-[1px] h-3 bg-white/10" />

                {/* Credit Display */}
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black tabular-nums tracking-tight text-white/90 group-hover:text-white transition-colors">
                        {data.credit || '0.00'}
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover:text-accent-gold/40 transition-colors">
                        Credits
                    </span>
                </div>

                {/* Small Refresh Icon */}
                <RefreshCw 
                    size={10} 
                    className={`ml-0.5 transition-all duration-500 opacity-0 group-hover:opacity-30 ${checking ? 'animate-spin opacity-100 text-accent-gold' : ''}`} 
                />
            </motion.button>

            {/* Premium Floating Tooltip */}
            <AnimatePresence>
                {showTooltip && (
                    <motion.div 
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        className="absolute top-full mt-3 right-0 z-50 pointer-events-none"
                    >
                        <div className="p-3 rounded-2xl bg-[#0F1115]/95 border border-white/10 shadow-2xl backdrop-blur-xl min-w-[180px]">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-1.5 rounded-lg ${cfg.bgClass} ${cfg.borderClass}`}>
                                    {cfg.icon}
                                </div>
                                <div>
                                    <h4 className={`text-[9px] font-black uppercase tracking-[0.2em] ${cfg.accentClass}`}>
                                        {data.status === 'online' ? 'Engine Ready' : data.status.toUpperCase()}
                                    </h4>
                                    <p className="text-[10px] text-white/50 font-medium leading-none mt-0.5">
                                        Kie.ai Integration
                                    </p>
                                </div>
                            </div>
                            
                            <div className="space-y-1.5 pt-2 border-t border-white/5">
                                <div className="flex justify-between items-center text-[9px]">
                                    <span className="text-white/30 font-bold uppercase tracking-widest">Available</span>
                                    <span className="text-white font-black">{data.credit} Credits</span>
                                </div>
                                {lastChecked && (
                                    <div className="flex justify-between items-center text-[9px]">
                                        <span className="text-white/30 font-bold uppercase tracking-widest">Last Sync</span>
                                        <span className="text-white/40 font-mono">{lastChecked.toLocaleTimeString('id-ID')}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-3 py-1.5 px-2 bg-white/[0.03] rounded-lg border border-white/5 flex items-center justify-center gap-2 text-[8px] text-accent-gold/50 font-black uppercase tracking-widest">
                                <RefreshCw size={8} /> Click to Sync
                            </div>
                        </div>
                        {/* Arrow */}
                        <div className="absolute -top-1 right-6 w-2 h-2 rotate-45 border-l border-t border-white/10 bg-[#0F1115]/95" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
