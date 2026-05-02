'use client';

import React, { useState, useEffect } from 'react';
import { Zap, Globe, Loader2, RefreshCw, Check, Sparkles, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateUserSettings } from '@/lib/actions/user-settings';
import { checkAiStatus } from '@/lib/actions/settings';

interface AiProviderSwitcherProps {
    initialProvider: string;
    isCollapsed: boolean;
}

export function AiProviderSwitcher({ initialProvider, isCollapsed }: AiProviderSwitcherProps) {
    const [provider, setProvider] = useState(initialProvider);
    const [isUpdating, setIsUpdating] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'online' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [credit, setCredit] = useState('...');
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const fetchStatus = async (targetProvider?: string, forced = false) => {
        setStatus('loading');
        setErrorMessage('');
        try {
            const res = await checkAiStatus(undefined, targetProvider || provider, forced);
            if (res.success) {
                setStatus('online');
                setCredit(res.credit || '0');
            } else {
                setStatus('error');
                setErrorMessage(res.message || 'Unknown error');
            }
            setLastChecked(new Date());
        } catch (e: any) {
            setStatus('error');
            setErrorMessage(e.message || 'Connection failed');
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(() => fetchStatus(), 120000);
        return () => clearInterval(interval);
    }, [provider]);

    const handleSwitch = async (newProvider: string) => {
        if (newProvider === provider || isUpdating) return;
        setIsUpdating(true);
        try {
            const res = await updateUserSettings({ aiProvider: newProvider });
            if (res.success) {
                setProvider(newProvider);
                // Status will be re-fetched by useEffect
            }
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className={`px-4 mb-6 transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
            {/* Switcher Pill */}
            <div className={`bg-black/40 border border-white/5 rounded-2xl p-1.5 flex gap-1 items-center relative overflow-hidden ${isCollapsed ? 'flex-col' : ''}`}>
                {/* Active Indicator Background */}
                {!isCollapsed && (
                    <motion.div
                        className="absolute inset-y-1.5 bg-accent-gold/10 border border-accent-gold/20 rounded-xl"
                        initial={false}
                        animate={{
                            left: provider === 'kie' ? '6px' : '50%',
                            right: provider === 'kie' ? '50%' : '6px',
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                )}

                <button
                    onClick={() => handleSwitch('kie')}
                    disabled={isUpdating}
                    className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${
                        provider === 'kie' && !isCollapsed ? 'text-accent-gold' : 'text-white/40 hover:text-white'
                    } ${isCollapsed && provider === 'kie' ? 'bg-accent-gold/20 text-accent-gold' : ''}`}
                    title="Kie.ai Engine"
                >
                    <Zap size={14} className={provider === 'kie' ? 'fill-accent-gold/20' : ''} />
                    {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Kie.ai</span>}
                </button>

                <button
                    onClick={() => handleSwitch('openrouter')}
                    disabled={isUpdating}
                    className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${
                        provider === 'openrouter' && !isCollapsed ? 'text-accent-gold' : 'text-white/40 hover:text-white'
                    } ${isCollapsed && provider === 'openrouter' ? 'bg-accent-gold/20 text-accent-gold' : ''}`}
                    title="OpenRouter Engine"
                >
                    <Globe size={14} />
                    {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">OpenRouter</span>}
                </button>
            </div>

            {/* Status & Test Feature */}
            <div className={`mt-4 flex flex-col items-center gap-2 ${isCollapsed ? 'justify-center' : 'px-1'}`}>
                <motion.button
                    onClick={() => fetchStatus()}
                    disabled={status === 'loading'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex flex-col items-center gap-2 group cursor-pointer w-full p-2 rounded-2xl transition-all ${status === 'online' ? 'bg-emerald-500/5' : 'bg-white/5'}`}
                >
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <div className={`w-2.5 h-2.5 rounded-full ${
                                status === 'loading' ? 'bg-zinc-500 animate-pulse' :
                                status === 'online' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' :
                                status === 'error' ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]' :
                                'bg-zinc-500'
                            }`} />
                            {status === 'online' && (
                                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-20" />
                            )}
                        </div>
                        
                        {!isCollapsed && (
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black uppercase tracking-widest truncate ${
                                    status === 'online' ? 'text-emerald-400' : 
                                    status === 'error' ? 'text-rose-400' : 'text-white/40'
                                }`}>
                                    {status === 'loading' ? 'Testing...' : status === 'online' ? 'Engine Ready' : 'System Offline'}
                                </span>
                                {status !== 'loading' && <RefreshCw size={10} className="text-white/20 group-hover:rotate-180 transition-transform duration-500" />}
                            </div>
                        )}
                    </div>
                    
                    {!isCollapsed && (
                        <div className="flex flex-col items-center leading-none w-full text-center">
                            <span className={`text-[11px] font-black mt-1 truncate w-full ${status === 'online' ? 'text-white' : 'text-white/20'}`}>
                                {status === 'error' ? errorMessage : (provider === 'kie' ? `${credit} Credits` : `$${credit} Credits`)}
                            </span>
                            {lastChecked && (
                                <div className="text-[8px] font-mono text-white/10 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Last Check: {lastChecked.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                        </div>
                    )}
                </motion.button>
            </div>
        </div>
    );
}
