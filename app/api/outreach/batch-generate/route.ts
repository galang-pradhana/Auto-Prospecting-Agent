import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { JobRegistry } from '@/lib/jobRegistry';
import { randomUUID } from 'crypto';
import { generateOutreachDraft } from '@/lib/actions/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leadIds, persona } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array is required' }, { status: 400 });
    }

    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        userId: session.userId,
      },
      select: {
        id: true,
        name: true,
      }
    });

    if (leads.length === 0) {
      return NextResponse.json({ error: 'No valid leads found for the provided IDs' }, { status: 404 });
    }

    const jobId = randomUUID();
    const initialMessage = `Menyiapkan pembuatan draf pesan untuk ${leads.length} leads...`;
    JobRegistry.createJob(jobId, 'AI_BATCH_GENERATE', session.userId, initialMessage);

    // Fire and forget background process
    processBackgroundGeneration(leads, persona, jobId).catch((err) => {
      console.error(err);
      JobRegistry.updateJob(jobId, { status: 'FAILED', message: err.message });
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: "Batch AI generation started in background"
    });

  } catch (error: any) {
    console.error("[API /outreach/batch-generate] Error:", error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

async function processBackgroundGeneration(leads: any[], persona: string, jobId: string) {
  let successCount = 0;
  let failCount = 0;
  const total = leads.length;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    JobRegistry.updateJob(jobId, {
      progress: Math.round((i / total) * 100),
      message: `Menganalisa & Menulis pesan untuk ${lead.name} (${i + 1}/${total})...`
    });

    try {
      const result = await generateOutreachDraft(lead.id, persona);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (e) {
      console.error(`Failed to generate draft for ${lead.id}:`, e);
      failCount++;
    }
  }

  JobRegistry.updateJob(jobId, {
    status: 'COMPLETED',
    progress: 100,
    message: `Selesai! Berhasil: ${successCount}, Gagal: ${failCount}.`
  });
}
