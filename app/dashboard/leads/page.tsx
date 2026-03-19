import { getLeads } from '@/lib/actions/lead';
import LeadsClient from '@/components/LeadsClient';

export default async function LeadsPage() {
    const leads = await getLeads({ status: 'FRESH' });

    // Serialize Prisma dates to plain objects for client component
    const serializedLeads = leads.map(lead => ({
        ...lead,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
    }));

    return <LeadsClient initialLeads={serializedLeads} />;
}
