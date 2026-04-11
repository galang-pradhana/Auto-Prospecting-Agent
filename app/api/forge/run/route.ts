import { NextRequest, NextResponse } from 'next/server';
import { generateForgeCode } from '@/lib/actions/ai';
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
        const { leadId } = body;

        if (!leadId) {
            return NextResponse.json({ success: false, message: 'leadId is required' }, { status: 400 });
        }

        const jobId = randomUUID();
        const initialMessage = `Initializing AI Forge for lead ${leadId}...`;
        
        JobRegistry.createJob(jobId, 'FORGE', session.userId, initialMessage);

        console.log(`[API Forge] Firing background job ${jobId}...`);
        
        // Fire and forget
        generateForgeCode(leadId, jobId).catch(err => {
            console.error(`[Job ${jobId}] Failed:`, err);
            JobRegistry.updateJob(jobId, { status: 'FAILED', message: err.message });
        });

        // Instantly return
        return NextResponse.json({ success: true, jobId, message: 'Forge process started' });
    } catch (error: any) {
        console.error("[API Forge Error]:", error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Internal Server Error' 
        }, { status: 500 });
    }
}
