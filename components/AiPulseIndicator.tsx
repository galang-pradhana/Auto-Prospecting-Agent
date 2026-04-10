'use client';

import { useEffect, useState } from 'react';
import { getAiPulseStatus } from '@/lib/actions/settings';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function AiPulseIndicator() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        const res = await getAiPulseStatus();
        setData(res);
        setLoading(false);
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Auto-refresh tiap 30 detik
        return () => clearInterval(interval);
    }, []);

    if (loading || !data) return <div className="h-8 w-24 bg-zinc-900 animate-pulse rounded-full" />;

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black tracking-tighter uppercase transition-colors duration-500 ${data.color}`}>
            <div className="relative flex h-2 w-2">
                {/* ANIMASI PULSE */}
                <motion.span 
                    animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${data.pulseColor}`}
                />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${data.pulseColor}`} />
            </div>
            
            <span className="flex items-center gap-1">
                <Zap size={10} strokeWidth={3} />
                {data.label}
            </span>
        </div>
    );
}
