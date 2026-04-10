import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Fetch Fresh Leads
        const leads = await prisma.lead.findMany({
            where: {
                userId: session.userId,
                status: 'FRESH'
            },
            select: {
                id: true,
                name: true,
                wa: true,
                category: true,
                address: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        // Unified results (only from Lead table now)
        const finalResults = leads.map(l => ({ 
            ...l, 
            destination: 'LEAD', 
            reason: null 
        }));

        return NextResponse.json(finalResults);
    } catch (error) {
        console.error("[API Scraper Results Error]:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
