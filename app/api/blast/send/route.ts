import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { JobRegistry } from '@/lib/jobRegistry';
import { randomUUID } from 'crypto';
import { sendMessage } from '@/lib/fonnte';

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

    // Set all leads to PENDING immediately
    await prisma.lead.updateMany({
      where: { id: { in: leads.map(l => l.id) } },
      data: { blastStatus: 'PENDING', blastError: null }
    });

    const jobId = randomUUID();
    const initialMessage = `Menyiapkan pengiriman pesan ke ${leads.length} tujuan...`;
    JobRegistry.createJob(jobId, 'BLAST', session.userId, initialMessage);

    // Fire and forget background process
    processBackgroundBlast(leads, delay, jobId).catch((err) => {
      console.error(err);
      JobRegistry.updateJob(jobId, { status: 'FAILED', message: err.message });
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: "Batch processing started in background"
    });

  } catch (error: any) {
    console.error("[API /blast/send] Error:", error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

async function processBackgroundBlast(leads: any[], delay: number, jobId: string) {
  let successCount = 0;
  let failCount = 0;
  const total = leads.length;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    JobRegistry.updateJob(jobId, {
      progress: Math.round((i / total) * 100),
      message: `Mengirim pesan ke ${lead.name || 'nomor WA'} (${i + 1}/${total})...`
    });

    // Delay between messages (but not before the first one)
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
      failCount++;
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
      successCount++;
    } else {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          blastStatus: 'FAILED',
          blastError: response.reason || 'Failed to send WhatsApp message'
        }
      });
      failCount++;
    }
  }

  JobRegistry.updateJob(jobId, {
    status: 'COMPLETED',
    progress: 100,
    message: `Selesai! Terkirim: ${successCount}, Gagal: ${failCount}.`
  });
}
