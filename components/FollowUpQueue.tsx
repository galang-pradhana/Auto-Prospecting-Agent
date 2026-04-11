'use client';

import { useState, useEffect } from 'react';
import { getFollowUpQueue, updateQueueItemStatus } from '@/lib/actions/followup';
import { Bell, Check, X, ExternalLink, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function FollowUpQueue() {
    const [queue, setQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    const fetchQueue = async () => {
        setLoading(true);
        const data = await getFollowUpQueue();
        setQueue(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 60000); // refresh every minute
        return () => clearInterval(interval);
    }, []);

    const handleSend = async (id: string, waLink: string) => {
        window.open(waLink, '_blank');
        const res = await updateQueueItemStatus(id, 'sent');
        if (res.success) {
            toast.success('Follow-up marked as sent');
            fetchQueue();
        }
    };

    const handleDismiss = async (id: string) => {
        const res = await updateQueueItemStatus(id, 'dismissed');
        if (res.success) {
            toast.info('Follow-up dismissed');
            fetchQueue();
        }
    };

    if (queue.length === 0 && !isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Badge toggle */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                    queue.length > 0 ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                }`}
            >
                <Bell className="w-6 h-6" />
                {queue.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg border-2 border-slate-900">
                        {queue.length}
                    </span>
                )}
            </button>

            {/* Panel */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[400px] max-h-[600px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <RefreshCw className={`w-4 h-4 text-indigo-400 ${loading ? 'animate-spin' : ''}`} onClick={fetchQueue} />
                            <h3 className="font-bold text-slate-100 uppercase tracking-wider text-xs">Aktivitas Follow-Up</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-900/50">
                        {queue.length === 0 ? (
                            <div className="py-20 text-center space-y-2">
                                <div className="p-4 bg-slate-800/30 rounded-full w-fit mx-auto">
                                    <Check className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="text-slate-400 font-medium">Semua beres! Antrian kosong.</p>
                            </div>
                        ) : (
                            queue.map((item) => (
                                <div key={item.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 group hover:border-slate-600/50 transition-all hover:bg-slate-800/60 shadow-lg scale-in">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-tighter mb-1">WA #{item.followupNumber}</p>
                                            <h4 className="text-sm font-semibold text-slate-100 group-hover:text-white">{item.lead.name}</h4>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{item.lead.category} • {formatDistanceToNow(new Date(item.queuedAt))} ago</p>
                                        </div>
                                        <button 
                                            onClick={() => handleDismiss(item.id)}
                                            className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800 mb-4">
                                        <p className="text-xs text-slate-300 italic line-clamp-2 leading-relaxed">"{item.messageText}"</p>
                                    </div>

                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleSend(item.id, item.waLink)}
                                            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2.5 rounded-lg text-xs font-bold shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group/btn"
                                        >
                                            Kirim via WA <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <div className="p-3 bg-slate-950 text-center">
                        <p className="text-[10px] text-slate-500 font-medium italic">Scheduler mengecek antrian setiap jam.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
