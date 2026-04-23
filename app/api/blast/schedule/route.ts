import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leadIds, scheduledAt } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array is required' }, { status: 400 });
    }

    if (!scheduledAt) {
      return NextResponse.json({ error: 'scheduledAt is required' }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduledAt date format' }, { status: 400 });
    }

    // Update all leads in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.lead.updateMany({
        where: {
          id: { in: leadIds },
          userId: session.userId,
        },
        data: {
          blastStatus: 'SCHEDULED',
          blastScheduledAt: scheduledDate,
          blastError: null,
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Successfully scheduled ${leadIds.length} leads`
    });

  } catch (error: any) {
    console.error("[API /blast/schedule] Error:", error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
