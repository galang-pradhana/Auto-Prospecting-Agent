import { NextRequest, NextResponse } from 'next/server';
import { batchEnrichLeads } from '@/lib/actions/ai';
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
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ success: false, message: 'No leads provided' }, { status: 400 });
        }

        const jobId = randomUUID();
        const initialMessage = `Initializing Batch Enrichment for ${ids.length} leads...`;
        
        JobRegistry.createJob(jobId, 'ENRICH', session.userId, initialMessage);

        console.log(`[API Enrich] Firing background job ${jobId}...`);
        
        // Fire and forget
        batchEnrichLeads(ids, jobId).catch(err => {
            console.error(`[Job ${jobId}] Failed:`, err);
            JobRegistry.updateJob(jobId, { status: 'FAILED', message: err.message });
        });

        // Instantly return to free up the client
        return NextResponse.json({ success: true, jobId, message: 'Batch enrichment started' });
    } catch (error: any) {
        console.error("[API Enrich Error]:", error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Internal Server Error' 
        }, { status: 500 });
    }
}
