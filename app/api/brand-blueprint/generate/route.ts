import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { JobRegistry } from '@/lib/jobRegistry';
import { randomUUID } from 'crypto';
import { generateBlueprintCode } from '@/lib/actions/ai';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        const body = await req.json();
        const { leadId, modelId } = body;

        if (!leadId) {
            return NextResponse.json({ success: false, message: 'leadId is required' }, { status: 400 });
        }

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { brandDna: true }
        });

        if (!lead) {
            return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
        }

        const submission = lead.brandDna;
        
        if (!submission || !submission.answers) {
            return NextResponse.json({ success: false, message: 'Client has not submitted Brand DNA yet' }, { status: 400 });
        }

        const jobId = randomUUID();
        const initialMessage = `Initializing Brand Blueprint Generation for ${lead.name}...`;
        
        JobRegistry.createJob(jobId, 'BLUEPRINT', session.userId, initialMessage);

        console.log(`[API Blueprint Generate] Firing background job ${jobId}...`);
        
        // Fire and forget
        generateBlueprintCode(lead.id, submission.answers, jobId, modelId).catch(err => {
            console.error(`[Job ${jobId}] Failed:`, err);
            JobRegistry.updateJob(jobId, { status: 'FAILED', message: err.message });
        });

        return NextResponse.json({ success: true, jobId, message: 'Blueprint generation started' });
    } catch (error: any) {
        console.error("[API Blueprint Generate Error]:", error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Internal Server Error' 
        }, { status: 500 });
    }
}
