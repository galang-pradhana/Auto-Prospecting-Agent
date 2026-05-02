'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, 
    ChevronUp, 
    ChevronDown, 
    Zap, 
    Sparkles, 
    Hammer, 
    Globe, 
    Send, 
    FileText,
    Loader2,
    CheckCircle2,
    AlertCircle,
    X,
    Square
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { stopScraper } from '@/lib/actions/scraper';

interface Job {
    id: string;
    type: string;
    status: 'RUNNING' | 'COMPLETED' | 'FAILED';
    progress: number;
    message: string;
    updatedAt: number;
}

const JOB_ICONS: Record<string, any> = {
    SCRAPER: Globe,
    ENRICH: Sparkles,
    FORGE: Hammer,
    BLAST: Send,
    PROPOSAL: FileText,
    FOLLOWUP: Activity,
    AI_BATCH_GENERATE: Sparkles,
};

const JOB_COLORS: Record<string, string> = {
    SCRAPER: 'text-blue-400',
    ENRICH: 'text-amber-400',
    FORGE: 'text-purple-400',
    BLAST: 'text-emerald-400',
    PROPOSAL: 'text-orange-400',
    FOLLOWUP: 'text-sky-400',
    AI_BATCH_GENERATE: 'text-pink-400',
};

export default function ActivityMonitor() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [completedJobIds, setCompletedJobIds] = useState<Set<string>>(new Set());
    const [isStopping, setIsStopping] = useState(false);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await fetch('/api/jobs/active');
                const data = await res.json();
                if (data.success) {
                    const newJobs: Job[] = data.jobs;
                    
                    newJobs.forEach(job => {
                        if (job.status !== 'RUNNING' && !completedJobIds.has(job.id)) {
                            if (job.status === 'COMPLETED') {
                                toast.success(`${job.type} Job Finished: ${job.message}`, { duration: 5000 });
                            } else {
                                toast.error(`${job.type} Job Failed: ${job.message}`, { duration: 6000 });
                            }
                            setCompletedJobIds(prev => new Set(prev).add(job.id));
                        }
                    });

                    setJobs(newJobs);
                }
            } catch (e) {
                console.error("Failed to fetch jobs:", e);
            }
        };

        const interval = setInterval(fetchJobs, 4000);
        return () => clearInterval(interval);
    }, [completedJobIds]);

    const handleStopScraper = async () => {
        if (!confirm('Hentikan paksa scraper?')) return;
        setIsStopping(true);
        try {
            await stopScraper();
            toast.success('Scraper stopped manually');
        } catch (e) {
            toast.error('Failed to stop scraper');
        } finally {
            setIsStopping(false);
        }
    };

    const activeJobs = jobs.filter(j => j.status === 'RUNNING');
    const runningCount = activeJobs.length;

    if (jobs.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-3 pointer-events-none">
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="w-[300px] md:w-80 glass bg-zinc-950/95 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden pointer-events-auto"
                    >
                        <div className="p-5 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Activity size={16} className="text-accent-gold" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Operations Hub</h3>
                            </div>
                            <button 
                                onClick={() => setIsExpanded(false)}
                                className="p-1.5 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto p-4 space-y-3">
                            {jobs.map(job => {
                                const Icon = JOB_ICONS[job.type] || Zap;
                                const colorClass = JOB_COLORS[job.type] || 'text-white';
                                
                                return (
                                    <div key={job.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-2 bg-white/5 rounded-xl ${colorClass}`}>
                                                    <Icon size={14} />
                                                </div>
                                                <div className="max-w-[150px] md:max-w-none">
                                                    <div className="text-[9px] font-black uppercase tracking-tighter text-white/40">{job.type}</div>
                                                    <div className="text-[10px] md:text-[11px] font-bold text-white line-clamp-2">{job.message}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {job.type === 'SCRAPER' && job.status === 'RUNNING' && (
                                                    <button
                                                        onClick={handleStopScraper}
                                                        disabled={isStopping}
                                                        className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all"
                                                        title="Stop Scraper"
                                                    >
                                                        <Square size={10} fill="currentColor" />
                                                    </button>
                                                )}
                                                {job.status === 'RUNNING' ? (
                                                    <Loader2 size={12} className="animate-spin text-accent-gold" />
                                                ) : job.status === 'COMPLETED' ? (
                                                    <CheckCircle2 size={12} className="text-emerald-400" />
                                                ) : (
                                                    <AlertCircle size={12} className="text-red-400" />
                                                )}
                                            </div>
                                        </div>

                                        {job.status === 'RUNNING' && (
                                            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${job.progress}%` }}
                                                    className="h-full bg-accent-gold shadow-[0_0_8px_rgba(242,183,5,0.4)]"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                layout
                onClick={() => setIsExpanded(!isExpanded)}
                className={`pointer-events-auto flex items-center justify-center transition-all active:scale-95 shadow-2xl glass border border-white/10
                    ${runningCount > 0 ? 'bg-zinc-900 border-accent-gold/40' : 'bg-zinc-950/50'}
                    ${isExpanded 
                        ? 'h-12 px-6 rounded-full' 
                        : 'w-14 h-14 md:h-14 md:px-6 md:w-auto rounded-full'
                    }`}
            >
                <div className="relative">
                    <Activity size={18} className={runningCount > 0 ? 'text-accent-gold animate-pulse' : 'text-white/20'} />
                    {runningCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent-gold rounded-full border-2 border-zinc-900" />
                    )}
                </div>
                
                <div className={`flex flex-col items-start overflow-hidden transition-all duration-300 ${isExpanded ? 'w-auto ml-3' : 'w-0 md:w-auto md:ml-3'}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">Monitor</span>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter whitespace-nowrap">
                        {runningCount > 0 ? `${runningCount} Active` : 'Idle'}
                    </span>
                </div>

                {!isExpanded && (
                    <div className="hidden md:block ml-2 text-white/20">
                        <ChevronUp size={14} />
                    </div>
                )}
            </motion.button>
        </div>
    );
}
