import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializeLead } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const leads = await prisma.lead.findMany({
        where: { 
            userId: session.userId, 
            status: 'LIVE' 
        },
        orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ leads: leads.map(serializeLead) });
}
