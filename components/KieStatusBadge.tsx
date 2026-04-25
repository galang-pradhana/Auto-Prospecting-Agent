'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react';

type PulseStatus = 'loading' | 'online' | 'warning' | 'error';

interface StatusData {
    status: PulseStatus;
    label: string;
    color: string;
    pulseColor: string;
}

const STATUS_CONFIG: Record<PulseStatus, {
    icon: React.ReactNode;
    bgClass: string;
    dotClass: string;
    textClass: string;
    borderClass: string;
    tooltip: string;
}> = {
    loading: {
        icon: <Loader2 size={12} className="animate-spin" />,
        bgClass: 'bg-zinc-500/10',
        dotClass: 'bg-zinc-400',
        textClass: 'text-zinc-400',
        borderClass: 'border-zinc-500/20',
        tooltip: 'Memeriksa status Kie.ai...',
    },
    online: {
        icon: <Wifi size={12} />,
        bgClass: 'bg-emerald-500/10',
        dotClass: 'bg-emerald-500',
        textClass: 'text-emerald-400',
        borderClass: 'border-emerald-500/20',
        tooltip: 'Kie.ai online & siap digunakan',
    },
    warning: {
        icon: <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '2s' }} />,
        bgClass: 'bg-amber-500/10',
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-400',
        borderClass: 'border-amber-500/20',
        tooltip: 'Kie.ai lambat / network lag — hati-hati sebelum generate',
    },
    error: {
        icon: <WifiOff size={12} />,
        bgClass: 'bg-rose-500/10',
        dotClass: 'bg-rose-500',
        textClass: 'text-rose-400',
        borderClass: 'border-rose-500/20',
        tooltip: 'Kie.ai tidak tersambung — jangan generate, saldo bisa terpotong!',
    },
};

const POLL_INTERVAL_MS = 60_000; // Re-check every 60s

export function KieStatusBadge() {
    const [data, setData] = useState<StatusData>({
        status: 'loading',
        label: 'Checking...',
        color: '',
        pulseColor: '',
    });
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const [checking, setChecking] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    const checkStatus = useCallback(async () => {
        setChecking(true);
        try {
            const res = await fetch('/api/kie-status', { cache: 'no-store' });
            if (!res.ok) throw new Error('Network error');
            const json: StatusData = await res.json();
            setData(json);
            setLastChecked(new Date());
        } catch {
            setData({
                status: 'error',
                label: 'Unreachable',
                color: '',
                pulseColor: '',
            });
        } finally {
            setChecking(false);
        }
    }, []);

    // Initial check + polling
    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [checkStatus]);

    const cfg = STATUS_CONFIG[data.status];

    return (
        <div className="relative">
            {/* Badge */}
            <button
                onClick={checkStatus}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                disabled={checking}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all
                    ${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass}
                    hover:brightness-110 active:scale-95 cursor-pointer
                `}
            >
                {/* Animated pulse dot */}
                <span className="relative flex h-2 w-2 shrink-0">
                    {data.status === 'online' && (
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${cfg.dotClass}`} />
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dotClass}`} />
                </span>

                {/* Icon */}
                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                    {checking ? <Loader2 size={10} className="animate-spin" /> : cfg.icon}
                    <span className="hidden md:inline">{data.label}</span>
                </span>
            </button>

            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute top-full mt-2 right-0 z-50 w-max max-w-xs">
                    <div className={`px-3 py-2 rounded-xl text-xs font-bold border ${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass} shadow-2xl`}>
                        <p>{cfg.tooltip}</p>
                        {lastChecked && (
                            <p className="mt-1 text-[10px] opacity-60 font-mono">
                                Last check: {lastChecked.toLocaleTimeString('id-ID')}
                            </p>
                        )}
                        <p className="mt-1 text-[10px] opacity-50">Klik untuk refresh manual</p>
                    </div>
                    {/* Arrow */}
                    <div className={`absolute -top-1 right-4 w-2 h-2 rotate-45 border-l border-t ${cfg.borderClass} ${cfg.bgClass}`} />
                </div>
            )}
        </div>
    );
}
