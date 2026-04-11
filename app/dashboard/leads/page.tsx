import { getLeads } from '@/lib/actions/lead';
import LeadsClient from '@/components/LeadsClient';
import { serializeLead } from '@/lib/utils';

export default async function LeadsPage() {
    const leads = await getLeads({ status: 'FRESH' });

    // Serialize Prisma dates to plain objects for client component
    const serializedLeads = leads.map(serializeLead);

    return <LeadsClient initialLeads={serializedLeads as any} />;
}
