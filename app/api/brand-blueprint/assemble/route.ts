import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { JobRegistry } from '@/lib/jobRegistry';
import { randomUUID } from 'crypto';
import { assembleAndSaveFinalPrompt } from '@/lib/actions/brand-dna';

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { leadId } = await req.json();
        if (!leadId) return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { brandDna: true }
        });

        if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

        const jobId = randomUUID();
        const initialMessage = `Synthesizing Brand Strategy for ${lead.name}...`;
        
        JobRegistry.createJob(jobId, 'ENRICH', session.userId, initialMessage);

        console.log(`[API Blueprint Assemble] Firing background job ${jobId}...`);
        
        // Fire and forget
        (async () => {
            try {
                JobRegistry.updateJob(jobId, { progress: 10 });
                const res = await assembleAndSaveFinalPrompt(leadId);
                if (res.success) {
                    JobRegistry.updateJob(jobId, { 
                        status: 'COMPLETED', 
                        progress: 100, 
                        message: 'Brand Strategy successfully synthesized!' 
                    });
                } else {
                    throw new Error(res.message || 'Failed to assemble prompt');
                }
            } catch (err: any) {
                console.error(`[Job ${jobId}] Failed:`, err);
                JobRegistry.updateJob(jobId, { status: 'FAILED', message: err.message });
            }
        })();

        return NextResponse.json({ success: true, jobId });

    } catch (error: any) {
        console.error("[API Blueprint Assemble Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
