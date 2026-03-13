import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ total: 0, fresh: 0, enriched: 0, ready: 0, finish: 0 });
    }

    const [total, fresh, enriched, ready, finish, user] = await Promise.all([
        prisma.lead.count({ where: { userId: session.userId } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'FRESH' } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'ENRICHED' } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'READY' } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'FINISH' } }),
        prisma.user.findUnique({ where: { id: session.userId }, select: { rejectedLeads: true } })
    ]);

    return NextResponse.json({ total, fresh, enriched, ready, finish, aiRejected: user?.rejectedLeads || 0 });
}
