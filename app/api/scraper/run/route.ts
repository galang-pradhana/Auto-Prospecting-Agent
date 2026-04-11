import { NextRequest, NextResponse } from 'next/server';
import { runScraper } from '@/lib/actions/scraper';
import { getSession } from '@/lib/auth';

export const maxDuration = 600; // Set timeout to 10 minutes (matching Nginx)
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        const body = await req.json();
        const { category, province, city, district, lat, lng } = body;

        console.log(`[API Scraper] Starting long-running job for ${category} in ${district || city}...`);
        
        const result = await runScraper(
            category,
            province,
            city,
            district || "",
            lat,
            lng
        );

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("[API Scraper Error]:", error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Internal Server Error during scraping' 
        }, { status: 500 });
    }
}
