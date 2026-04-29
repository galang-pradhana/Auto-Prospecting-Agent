import { NextRequest, NextResponse } from 'next/server';
import { generateFollowUpDraft } from '@/lib/actions/ai';
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
        const { leadId, followupNumber, persona } = body;

        if (!leadId || !followupNumber) {
            return NextResponse.json({ success: false, message: 'Missing leadId or followupNumber' }, { status: 400 });
        }

        const jobId = randomUUID();
        const initialMessage = `Generating Follow-up #${followupNumber}...`;
        
        JobRegistry.createJob(jobId, 'FOLLOWUP', session.userId, initialMessage);

        console.log(`[API Follow-up] Firing background job ${jobId}...`);
        
        // Fire and forget
        generateFollowUpDraft(leadId, followupNumber, persona || 'professional', jobId).catch(err => {
            console.error(`[Job ${jobId}] Failed:`, err);
            JobRegistry.updateJob(jobId, { status: 'FAILED', message: err.message });
        });

        // Instantly return
        return NextResponse.json({ success: true, jobId, message: 'Follow-up generation started' });
    } catch (error: any) {
        console.error("[API Follow-up Error]:", error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Internal Server Error' 
        }, { status: 500 });
    }
}
