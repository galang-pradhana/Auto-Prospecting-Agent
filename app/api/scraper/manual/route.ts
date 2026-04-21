import { NextRequest, NextResponse } from 'next/server';
import { scrapeSingleUrl } from '@/lib/actions/scraper';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        const body = await req.json();
        const { url } = body;

        if (!url || !url.includes('google.com/maps')) {
            return NextResponse.json({ success: false, message: 'URL Google Maps tidak valid' }, { status: 400 });
        }

        const result = await scrapeSingleUrl(url);

        if (result.success) {
            return NextResponse.json({ success: true, lead: result.lead, message: 'Lead berhasil ditambahkan' });
        } else {
            return NextResponse.json({ success: false, message: result.message }, { status: 400 });
        }
    } catch (error: any) {
        console.error("[API Manual Scrape Error]:", error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Internal Server Error' 
        }, { status: 500 });
    }
}
