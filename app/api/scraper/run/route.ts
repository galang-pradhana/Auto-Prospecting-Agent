import { NextRequest, NextResponse } from 'next/server';
import { runScraper } from '@/lib/actions/scraper';
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
        const { category, province, city, district, lat, lng, filters } = body;

        const jobId = randomUUID();
        const initialMessage = `Initializing Scrape: ${category} in ${district || city}`;
        
        // Setup background job
        JobRegistry.createJob(jobId, 'SCRAPER', session.userId, initialMessage);

        console.log(`[API Scraper] Firing background job ${jobId}...`);
        
        // Fire and forget
        runScraper(
            category,
            province,
            city,
            district || "",
            lat,
            lng,
            jobId,
            filters
        ).catch(err => {
            console.error(`[Job ${jobId}] Failed:`, err);
            JobRegistry.updateJob(jobId, { status: 'FAILED', message: err.message });
        });

        // Instantly return to free up the client
        return NextResponse.json({ success: true, jobId, message: 'Job started' });
    } catch (error: any) {
        console.error("[API Scraper Error]:", error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Internal Server Error during scraping' 
        }, { status: 500 });
    }
}
