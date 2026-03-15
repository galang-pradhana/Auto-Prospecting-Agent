import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Globe, ExternalLink, MapPin, Building2, Calendar, Layout, Download } from 'lucide-react';
import Link from 'next/link';
import DownloadButton from '@/components/DownloadButton';
import SendWaButton from '@/components/SendWaButton';

export default async function LiveSitesPage() {
    const session = await getSession();
    if (!session) return null;

    const liveLeads = await prisma.lead.findMany({
        where: {
            userId: session.userId,
            status: 'LIVE'
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });

    const templates = await prisma.waTemplate.findMany({
        orderBy: { isDefault: 'desc' }
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Live Digital Assets</h1>
                <p className="text-white/40 font-medium italic">Your fleet of deployed websites, optimized and active.</p>
            </div>

            {liveLeads.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liveLeads.map((lead) => (
                        <div key={lead.id} className="glass p-6 rounded-[32px] border-white/5 hover:border-orange-500/30 transition-all group flex flex-col h-full bg-zinc-950/40">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20 group-hover:scale-110 transition-transform">
                                    <Globe className="w-6 h-6 text-orange-500" />
                                </div>
                                <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                    <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Active</span>
                                </div>
                            </div>

                            <div className="space-y-2 mb-6">
                                <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1">{lead.name}</h3>
                                <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
                                    <Building2 size={12} className="text-orange-500" />
                                    {lead.category}
                                </div>
                            </div>

                            <div className="space-y-3 mb-8 flex-1">
                                <div className="flex items-start gap-2 text-[11px] text-white/60">
                                    <MapPin size={14} className="text-orange-500 shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">{lead.address}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-white/40">
                                    <Calendar size={14} className="text-orange-500 shrink-0" />
                                    Deployed on {new Date(lead.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 flex gap-3">
                                <Link 
                                    href={`/${lead.slug}`}
                                    target="_blank"
                                    className="flex-1 h-12 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-widest active:scale-95 shadow-lg shadow-orange-900/20"
                                >
                                    <ExternalLink size={14} />
                                    Visit Site
                                </Link>
                                <SendWaButton 
                                    leadId={lead.id} 
                                    leadName={lead.name}
                                    templates={templates}
                                />
                                {lead.htmlCode && (
                                    <DownloadButton 
                                        htmlCode={lead.htmlCode} 
                                        fileName={lead.name}
                                        className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-all group/dl"
                                        iconSize={16}
                                    />
                                )}
                                <Link 
                                    href={`/dashboard/enriched?leadId=${lead.id}`}
                                    className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-all group/edit"
                                    title="Edit Content"
                                >
                                    <Layout size={16} className="text-white/40 group-hover/edit:text-white" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-32 flex flex-col items-center justify-center gap-6 bg-white/[0.02] border border-dashed border-white/10 rounded-[40px] text-center px-6">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                        <Globe className="w-10 h-10 text-white/10" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white/60 uppercase tracking-tighter">No live sites found</h3>
                        <p className="text-sm text-white/30 max-w-sm mx-auto font-medium">
                            Once you forge a website from the Enriched Projects page, it will appear here as a live digital asset.
                        </p>
                    </div>
                    <Link 
                        href="/dashboard/enriched"
                        className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white text-xs font-black rounded-2xl transition-all uppercase tracking-widest"
                    >
                        Go to Enriched Projects
                    </Link>
                </div>
            )}
        </div>
    );
}
