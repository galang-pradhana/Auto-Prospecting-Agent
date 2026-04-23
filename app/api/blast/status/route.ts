import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const leadIdsParam = searchParams.get('leadIds');

    if (!leadIdsParam) {
      return NextResponse.json({ error: 'leadIds query parameter is required' }, { status: 400 });
    }

    const leadIds = leadIdsParam.split(',').filter(id => id.trim() !== '');

    if (leadIds.length === 0) {
      return NextResponse.json({ error: 'No valid lead IDs provided' }, { status: 400 });
    }

    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        userId: session.userId,
      },
      select: {
        id: true,
        blastStatus: true,
        blastSentAt: true,
        blastScheduledAt: true,
        blastError: true,
      }
    });

    const statusMap = leads.reduce((acc, lead) => {
      acc[lead.id] = {
        status: lead.blastStatus || 'NONE',
        sentAt: lead.blastSentAt,
        scheduledAt: lead.blastScheduledAt,
        error: lead.blastError,
      };
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({ statuses: statusMap });

  } catch (error: any) {
    console.error("[API /blast/status] Error:", error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
