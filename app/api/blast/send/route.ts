import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { JobRegistry } from '@/lib/jobRegistry';
import { randomUUID } from 'crypto';
import { sendMessage } from '@/lib/fonnte';

export const dynamic = 'force-dynamic';


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leadIds } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array is required' }, { status: 400 });
    }

    // Delay handling is now enforced in the background process (60-120s)

    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        userId: session.userId,
      },
      select: {
        id: true,
        wa: true,
        baitDraft: true,
        outreachDraft: true,
        name: true,
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
    processBackgroundBlast(leads, session.userId, jobId).catch((err) => {
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

async function processBackgroundBlast(leads: any[], userId: string, jobId: string) {
  let successCount = 0;
  let failCount = 0;
  const total = leads.length;

  // Fetch Fonnte tokens for rotation
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fonnteTokens: true }
  });
  
  let tokens: string[] = [];
  if (user?.fonnteTokens && Array.isArray(user.fonnteTokens)) {
    tokens = (user.fonnteTokens as string[]).filter(t => t && t.trim().length > 10);
  }

  // SYNC WEBHOOK FOR ALL TOKENS (Ensure Fonnte knows where to send replies)
  if (tokens.length > 0) {
    const { syncFonnteWebhook } = require('@/lib/fonnte');
    for (const token of tokens) {
        syncFonnteWebhook(token).catch(e => console.error(`[BLAST] Failed to sync webhook for token ${token.substring(0,8)}`, e));
    }
  }

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    JobRegistry.updateJob(jobId, {
      progress: Math.round((i / total) * 100),
      message: `Mengirim pesan ke ${lead.name || 'nomor WA'} (${i + 1}/${total})...`
    });

    // Extreme Delay: Random 60 - 120 seconds between messages
    if (i > 0) {
      const delaySeconds = Math.floor(Math.random() * (120 - 60 + 1) + 60);
      JobRegistry.updateJob(jobId, { message: `Menunggu ${delaySeconds} detik untuk menghindari ban WA...` });
      await sleep(delaySeconds * 1000);
    }

    if (!lead.wa || (!lead.baitDraft && !lead.outreachDraft)) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          blastStatus: 'FAILED',
          blastError: 'Missing WhatsApp number or draft',
        }
      });
      failCount++;
      continue;
    }

    // Determine what to send. Fallback to outreachDraft if baitDraft is missing.
    const messageToSend = lead.baitDraft || lead.outreachDraft;
    const isBait = !!lead.baitDraft;

    // Send via Fonnte with token rotation
    const response = await sendMessage(lead.wa, messageToSend, undefined, tokens);

    if (response.status) {
      const now = new Date();
      
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          blastStatus: isBait ? 'BAIT_SENT' : 'SENT',
          blastSentAt: now,
          blastError: null,
          lastContactAt: now,
        }
      });
      successCount++;
    } else {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          blastStatus: 'FAILED',
          blastError: response.reason || response.message || 'Failed to send WhatsApp message'
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
