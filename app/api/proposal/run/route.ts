import { NextRequest, NextResponse } from 'next/server';
import { generateProposalDraft } from '@/lib/actions/ai';
import { getSession } from '@/lib/auth';
import { JobRegistry } from '@/lib/jobRegistry';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        const body = await req.json();
        const { leadId, inputs } = body;

        if (!leadId || !inputs) {
            return NextResponse.json({ success: false, message: 'Missing leadId or inputs' }, { status: 400 });
        }

        const jobId = randomUUID();
        const initialMessage = `Initializing Premium Proposal for ${inputs.overrides?.businessName || 'Lead'}...`;
        
        JobRegistry.createJob(jobId, 'PROPOSAL', session.userId, initialMessage);

        console.log(`[API Proposal] Firing background job ${jobId}...`);
        
        // Fire and forget
        generateProposalDraft(leadId, inputs, jobId).catch(err => {
            console.error(`[Job ${jobId}] Failed:`, err);
            JobRegistry.updateJob(jobId, { status: 'FAILED', message: err.message });
        });

        // Instantly return
        return NextResponse.json({ success: true, jobId, message: 'Proposal generation started' });
    } catch (error: any) {
        console.error("[API Proposal Error]:", error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Internal Server Error' 
        }, { status: 500 });
    }
}
