import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import LiveClient from './LiveClient';

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

    return <LiveClient initialLeads={liveLeads as any} templates={templates} />;
}
