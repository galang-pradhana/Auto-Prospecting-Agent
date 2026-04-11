import { NextRequest, NextResponse } from 'next/server';
import { JobRegistry } from '@/lib/jobRegistry';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        const id = req.nextUrl.searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, message: 'Job ID required' }, { status: 400 });
        }

        const job = JobRegistry.getJob(id);
        if (!job) {
            return NextResponse.json({ success: false, message: 'Job not found' }, { status: 404 });
        }

        // Security check
        if (job.userId !== session.userId) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
        }

        // Auto-cleanup hook (safe to call here)
        JobRegistry.clearOldJobs();

        return NextResponse.json({ success: true, job });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
