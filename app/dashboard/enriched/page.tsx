import { getLeads } from '@/lib/actions/lead';
import LeadsClient from '@/components/LeadsClient';
import { serializeLead } from '@/lib/utils';

export default async function EnrichedPage() {
    // Only fetch leads with ENRICHED status
    const leads = await getLeads({ status: 'ENRICHED' });

    // Serialize Prisma dates to plain objects for client component
    const serializedLeads = leads.map(serializeLead);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 px-4 md:px-0 pt-6 md:pt-0">
                <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase">Enriched Projects</h1>
                <p className="text-[10px] md:text-sm text-white/40 font-bold italic tracking-wide">Leads transformed into actionable project briefs.</p>
            </div>
            <LeadsClient initialLeads={serializedLeads as any} forceStatus="ENRICHED" hideHeader />
        </div>
    );
}
