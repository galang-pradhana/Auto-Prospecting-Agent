'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ServerCog, Sparkles, Navigation, ChevronRight, CheckCircle2, XCircle, Send } from 'lucide-react';
import { Job } from '@/lib/jobRegistry';

export default function GlobalJobIndicator({ className }: { className?: string }) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await fetch('/api/jobs/active');
                if (res.ok) {
                    const data = await res.json();
                    setJobs(data.jobs || []);
                }
            } catch (e) {
                // Silent fail for polling
            }
        };

        fetchJobs();
        const interval = setInterval(fetchJobs, 3000);
        return () => clearInterval(interval);
    }, []);

    const activeCount = jobs.filter(j => j.status === 'RUNNING').length;
    const completedCount = jobs.filter(j => j.status === 'COMPLETED').length;
    const failedCount = jobs.filter(j => j.status === 'FAILED').length;

    // We only show the indicator if there are jobs recently done or running
    if (jobs.length === 0) return null;

    return (
        <div className={`relative ${className}`}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-white/10 hover:bg-zinc-800 transition-colors"
            >
                {activeCount > 0 ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                        <Loader2 size={14} className="text-accent-gold" />
                    </motion.div>
                ) : (
                    <ServerCog size={14} className="text-emerald-400" />
                )}
                
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 hidden sm:block">
                    {activeCount > 0 ? `Active Tasks (${activeCount})` : `System OK`}
                </span>
                {activeCount > 0 && (
                    <span className="sm:hidden bg-accent-gold text-black text-[10px] font-black px-1.5 rounded-md min-w-[18px] text-center">
                        {activeCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-3 w-[280px] sm:w-80 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[9999]"
                    >
                        <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/20 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-zinc-400">Background Tasks</span>
                            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white">
                                <ChevronRight size={14} />
                            </button>
                        </div>
                        
                        <div className="max-h-[300px] overflow-y-auto">
                            {jobs.length === 0 ? (
                                <div className="p-6 text-center text-zinc-500 text-xs italic">
                                    No background tasks running.
                                </div>
                            ) : (
                                jobs.map(job => (
                                    <div key={job.id} className="p-4 border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                {job.type === 'SCRAPER' && <Navigation size={12} className={job.status === 'RUNNING' ? 'text-accent-gold' : 'text-zinc-500'} />}
                                                {job.type === 'ENRICH' && <Sparkles size={12} className={job.status === 'RUNNING' ? 'text-purple-400' : 'text-zinc-500'} />}
                                                {job.type === 'FORGE' && <ServerCog size={12} className={job.status === 'RUNNING' ? 'text-blue-400' : 'text-zinc-500'} />}
                                                {job.type === 'EDIT' && <Sparkles size={12} className={job.status === 'RUNNING' ? 'text-emerald-400' : 'text-zinc-500'} />}
                                                {job.type === 'BLAST' && <Send size={12} className={job.status === 'RUNNING' ? 'text-green-400' : 'text-zinc-500'} />}
                                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-200">{job.type}</span>
                                            </div>
                                            {job.status === 'COMPLETED' ? <CheckCircle2 size={12} className="text-emerald-500" /> :
                                             job.status === 'FAILED' ? <XCircle size={12} className="text-red-500" /> :
                                             <span className="text-[9px] font-bold text-accent-gold">{job.progress > 0 ? `${job.progress}%` : '• • •'}</span>}
                                        </div>
                                        <p className="text-xs text-zinc-400 leading-snug">{job.message}</p>
                                        
                                        {job.status === 'RUNNING' && (
                                            <div className="mt-2 h-1 w-full bg-zinc-900 rounded-full overflow-hidden relative">
                                                <div 
                                                    className={`h-full bg-accent-gold transition-all duration-500 ${job.progress === 0 && job.type === 'SCRAPER' ? 'w-full animate-pulse' : ''}`}
                                                    style={job.progress > 0 || job.type !== 'SCRAPER' ? { width: `${job.progress}%` } : {}}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
