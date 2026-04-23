import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMessage } from '@/lib/fonnte';
import { getSession } from '@/lib/auth';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leadIds, delaySeconds } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array is required' }, { status: 400 });
    }

    // Delay handling (minimum 30s to avoid WA ban)
    const defaultDelay = parseInt(process.env.BLAST_DEFAULT_DELAY || '45', 10);
    let requestedDelay = delaySeconds !== undefined ? delaySeconds : defaultDelay;
    const delay = Math.max(requestedDelay, 30); // Enforce min 30s

    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        userId: session.userId,
      },
      select: {
        id: true,
        wa: true,
        outreachDraft: true,
      }
    });

    if (leads.length === 0) {
      return NextResponse.json({ error: 'No valid leads found for the provided IDs' }, { status: 404 });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      // Delay between messages (but not before the first one)
      if (i > 0) {
        await sleep(delay * 1000);
      }

      if (!lead.wa || !lead.outreachDraft) {
        await prisma.$transaction(async (tx) => {
          await tx.lead.update({
            where: { id: lead.id },
            data: {
              blastStatus: 'FAILED',
              blastError: 'Missing WhatsApp number or outreach draft',
            }
          });
        });
        failedCount++;
        errors.push({ id: lead.id, error: 'Missing WhatsApp number or outreach draft' });
        continue;
      }

      // Send via Fonnte
      const response = await sendMessage(lead.wa, lead.outreachDraft);

      if (response.status) {
        const now = new Date();
        const nextFollowup = new Date(now);
        nextFollowup.setDate(nextFollowup.getDate() + 7);

        await prisma.$transaction(async (tx) => {
          await tx.lead.update({
            where: { id: lead.id },
            data: {
              blastStatus: 'SENT',
              blastSentAt: now,
              blastError: null,
              // Auto-move to monitoring
              followupStage: 'sent',
              followupCount: 1,
              lastContactAt: now,
              nextFollowupAt: nextFollowup,
            }
          });
        });
        successCount++;
      } else {
        await prisma.$transaction(async (tx) => {
          await tx.lead.update({
            where: { id: lead.id },
            data: {
              blastStatus: 'FAILED',
              blastError: response.message || 'Unknown Fonnte error',
            }
          });
        });
        failedCount++;
        errors.push({ id: lead.id, error: response.message || 'Unknown Fonnte error' });
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      errors
    });

  } catch (error: any) {
    console.error("[API /blast/send] Error:", error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
