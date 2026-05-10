import { getLeads } from '@/lib/actions/lead';
import { getEnrichBlueprintLeads } from '@/lib/actions/brand-dna';
import LeadsClient from '@/components/LeadsClient';
import EnrichBlueprintClient from '@/components/EnrichBlueprintClient';
import { serializeLead } from '@/lib/utils';
import Link from 'next/link';

export default async function EnrichedPage({ searchParams }: { searchParams: { tab?: string } }) {
    const activeTab = searchParams.tab === 'real' ? 'real' : 'dummy';

    let dummyLeads = [];
    let blueprintLeads = [];

    if (activeTab === 'dummy') {
        const leads = await getLeads({ status: 'ENRICHED' });
        dummyLeads = leads.map(serializeLead) as any;
    } else {
        const leads = await getEnrichBlueprintLeads({});
        blueprintLeads = leads.map(serializeLead) as any;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 px-4 md:px-0 pt-6 md:pt-0">
                <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase">Enriched Projects</h1>
                <p className="text-[10px] md:text-sm text-white/40 font-bold italic tracking-wide">Leads transformed into actionable project briefs.</p>
            </div>

            <div className="flex space-x-2 border-b border-white/10 px-4 md:px-0">
                <Link 
                    href="/dashboard/enriched?tab=dummy" 
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dummy' ? 'border-[#3b82f6] text-[#3b82f6]' : 'border-transparent text-white/50 hover:text-white'}`}
                >
                    Dummy Forge
                </Link>
                <Link 
                    href="/dashboard/enriched?tab=real" 
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'real' ? 'border-[#8b5cf6] text-[#8b5cf6]' : 'border-transparent text-white/50 hover:text-white'}`}
                >
                    Real (Blueprint)
                </Link>
            </div>

            {activeTab === 'dummy' ? (
                <LeadsClient initialLeads={dummyLeads} forceStatus="ENRICHED" hideHeader />
            ) : (
                <EnrichBlueprintClient initialLeads={blueprintLeads} />
            )}
        </div>
    );
}

