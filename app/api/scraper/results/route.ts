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

        // Fetch Sandbox Leads
        const sandbox = await prisma.leadSandbox.findMany({
            where: {
                userId: session.userId
            },
            select: {
                id: true,
                name: true,
                wa: true,
                category: true,
                address: true,
                reason: true, // Include the reason for quarantine
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        // Unified results with destination property
        const unifiedResults = [
            ...leads.map(l => ({ ...l, destination: 'LEAD', reason: null })),
            ...sandbox.map(s => ({ ...s, destination: 'SANDBOX' }))
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(unifiedResults.slice(0, 100));
    } catch (error) {
        console.error("[API Scraper Results Error]:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
