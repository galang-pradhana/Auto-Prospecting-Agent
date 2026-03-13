import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { LeadStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as LeadStatus | null;
    const category = searchParams.get('category');
    const province = searchParams.get('province');

    const where: any = { userId: session.userId };
    if (status) where.status = status;
    if (category) where.category = category;
    if (province) where.province = province;

    const leads = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(leads);
}

export async function DELETE(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json({ success: false, message: 'IDs array required in body' }, { status: 400 });
        }

        await prisma.lead.deleteMany({
            where: {
                id: { in: ids },
                userId: session.userId,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
    }
}
