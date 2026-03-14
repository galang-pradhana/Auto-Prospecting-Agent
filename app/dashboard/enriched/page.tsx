import { getLeads } from '@/lib/actions';
import LeadsClient from '@/components/LeadsClient';

export default async function EnrichedPage() {
    // Only fetch leads with ENRICHED status
    const leads = await getLeads({ status: 'ENRICHED' });

    // Serialize Prisma dates to plain objects for client component
    const serializedLeads = leads.map(lead => ({
        ...lead,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
    }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-white tracking-tighter">Enriched Projects</h1>
                <p className="text-white/40 font-medium italic">Leads transformed into actionable project briefs.</p>
            </div>
            <LeadsClient initialLeads={serializedLeads as any} forceStatus="ENRICHED" />
        </div>
    );
}
