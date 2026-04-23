import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMessage } from '@/lib/fonnte';

// This endpoint is meant to be called by an OS-level cron job (e.g., every minute)
// Example crontab: * * * * * curl -X POST http://localhost:3000/api/blast/cron

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    // 1. Find all due scheduled messages
    const now = new Date();
    
    const dueLeads = await prisma.lead.findMany({
      where: {
        blastStatus: 'SCHEDULED',
        blastScheduledAt: {
          lte: now // Less than or equal to current time
        }
      },
      select: {
        id: true,
        wa: true,
        outreachDraft: true,
      }
    });

    if (dueLeads.length === 0) {
      return NextResponse.json({ success: true, message: 'No scheduled messages due.' });
    }

    // 2. Lock them by setting status to PENDING so they aren't processed twice by overlapping cron runs
    await prisma.lead.updateMany({
      where: { id: { in: dueLeads.map(l => l.id) } },
      data: { blastStatus: 'PENDING' }
    });

    // 3. Process them in the background so the cron request can terminate quickly
    processScheduledBlasts(dueLeads).catch(console.error);

    return NextResponse.json({
      success: true,
      message: `Started processing ${dueLeads.length} scheduled messages.`
    });

  } catch (error: any) {
    console.error("[API /blast/cron] Error:", error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

async function processScheduledBlasts(leads: any[]) {
  // Use a default delay of 45 seconds to prevent WA ban
  const delay = parseInt(process.env.BLAST_DEFAULT_DELAY || '45', 10);

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    if (i > 0) {
      await sleep(delay * 1000);
    }

    if (!lead.wa || !lead.outreachDraft) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          blastStatus: 'FAILED',
          blastError: 'Missing WhatsApp number or outreach draft',
        }
      });
      continue;
    }

    // Send via Fonnte
    const response = await sendMessage(lead.wa, lead.outreachDraft);

    if (response.status) {
      const now = new Date();
      const nextFollowup = new Date(now);
      nextFollowup.setDate(nextFollowup.getDate() + 7);

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          blastStatus: 'SENT',
          blastSentAt: now,
          blastError: null,
          followupStage: 'sent',
          followupCount: { increment: 1 },
          lastContactAt: now,
          nextFollowupAt: nextFollowup
        }
      });
    } else {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          blastStatus: 'FAILED',
          blastError: response.reason || 'Failed to send WhatsApp message'
        }
      });
    }
  }
}
