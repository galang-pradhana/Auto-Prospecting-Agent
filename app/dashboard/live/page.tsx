import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import LiveClient from './LiveClient';
import { serializeLead } from '@/lib/utils';

export default async function LiveSitesPage() {
    const session = await getSession();
    if (!session) return null;

    const liveLeads = await prisma.lead.findMany({
        where: {
            userId: session.userId,
            status: 'LIVE',
            // Sembunyikan data yang sudah masuk ke CRM
            followupStage: {
                notIn: ['monitoring_1', 'monitoring_2', 'monitoring_3', 'closed_won', 'closed_lost']
            }
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });


    const templates = await prisma.waTemplate.findMany({
        orderBy: { isDefault: 'desc' }
    });

    // Serialize Prisma dates to plain objects for client component
    const serializedLeads = liveLeads.map(serializeLead);
    const serializedTemplates = templates.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
    }));

    return <LiveClient initialLeads={serializedLeads as any} templates={serializedTemplates as any} />;
}
