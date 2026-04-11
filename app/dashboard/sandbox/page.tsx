import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SandboxClient from '@/components/SandboxClient';
import { prisma } from '@/lib/prisma';
import { serializeLeadSandbox } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SandboxPage() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }

    try {
        const leads = await prisma.leadSandbox.findMany({
            where: { userId: session.userId },
            orderBy: { createdAt: 'desc' },
        });

        // Convert Dates to ISO strings for Client Component
        const serializedLeads = leads.map(serializeLeadSandbox);

        return (
            <main className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen">
                <SandboxClient initialLeads={serializedLeads} />
            </main>
        );
    } catch (e) {
        console.error(e);
        return (
            <main className="p-4 md:p-8">
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
                    Failed to load sandbox data. Please refresh.
                </div>
            </main>
        );
    }
}
