import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(
    req: NextRequest,
    context: { params: { id: string } }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Await the params before accessing its properties (Next.js 15 requires this)
        const params = await context.params;
        const { id } = params;

        const lead = await prisma.lead.findUnique({
            where: { id, userId: session.userId }
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        // Set nextFollowupAt to current time to mark it as monitored
        // The UI filters 'Sudah di Monitoring' using !!l.nextFollowupAt
        const updatedLead = await prisma.lead.update({
            where: { id },
            data: {
                nextFollowupAt: new Date(),
                followupStage: 'sent',
            }
        });

        return NextResponse.json({ success: true, lead: updatedLead });
    } catch (error) {
        console.error('Error sending to monitoring:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
