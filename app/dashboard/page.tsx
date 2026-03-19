import { getLeadStats } from '@/lib/actions/lead';
import { Zap, TrendingUp, Users, Target, Shield, Database } from 'lucide-react';

export default async function DashboardHome() {
    const stats = await getLeadStats();

    const statCards = [
        { label: 'Total Leads', value: stats.total.toString(), icon: Users, color: 'text-blue-400' },
        { label: 'Fresh', value: stats.fresh.toString(), icon: Database, color: 'text-zinc-400' },
        { label: 'Enriched', value: stats.enriched.toString(), icon: Zap, color: 'text-accent-gold' },
        { label: 'Ready', value: stats.ready.toString(), icon: Target, color: 'text-green-400' },
        { label: 'Finished', value: stats.finish.toString(), icon: Shield, color: 'text-purple-400' },
    ];

    const conversionRate = stats.total > 0 
        ? ((stats.finish / stats.total) * 100).toFixed(1) + '%' 
        : '0%';

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black mb-2 tracking-tighter">Welcome back, Commander</h1>
                <p className="text-white/40">Live analytics from your Supabase database.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {statCards.map((stat) => (
                    <div key={stat.label} className="glass p-6 rounded-[32px] border-white/5 hover:border-white/10 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl bg-white/5 ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
                            <h3 className="text-3xl font-black">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8 mt-12">
                <div className="glass p-8 rounded-[40px] border-white/5 h-[400px] flex flex-col">
                    <h3 className="text-xl font-bold mb-6">Pipeline Summary</h3>
                    <div className="flex-1 flex flex-col justify-center gap-6">
                        <div className="flex items-center justify-between">
                            <span className="text-white/40 text-sm uppercase tracking-widest">Conversion Rate</span>
                            <span className="text-2xl font-black text-accent-gold">{conversionRate}</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-accent-gold to-green-400 rounded-full transition-all duration-500"
                                style={{ width: `${stats.total > 0 ? (stats.finish / stats.total) * 100 : 0}%` }}
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest">Fresh</p>
                                <p className="text-lg font-black text-zinc-400">{stats.fresh}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest">Enriched</p>
                                <p className="text-lg font-black text-amber-400">{stats.enriched}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest">Ready</p>
                                <p className="text-lg font-black text-green-400">{stats.ready}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest">Finish</p>
                                <p className="text-lg font-black text-purple-400">{stats.finish}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="glass p-8 rounded-[40px] border-white/5 h-[400px] flex flex-col">
                    <h3 className="text-xl font-bold mb-6">Enrichment Queue</h3>
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="text-5xl font-black text-accent-gold">{stats.fresh}</div>
                        <p className="text-white/40 text-sm">leads ready for AI enrichment</p>
                        <div className="flex items-center gap-2 text-[10px] text-white/20 uppercase tracking-widest">
                            <Zap size={12} /> Powered by Kie.ai BYOC × Gemini 3 Flash
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
