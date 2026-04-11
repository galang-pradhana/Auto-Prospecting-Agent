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

        const activeJobs = JobRegistry.getAllJobsForUser(session.userId);
        
        JobRegistry.clearOldJobs();

        return NextResponse.json({ success: true, jobs: activeJobs });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
