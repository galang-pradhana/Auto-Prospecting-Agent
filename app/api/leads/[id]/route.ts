import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        const lead = await prisma.lead.findUnique({
            where: { id: params.id, userId: session.userId }
        });

        if (!lead) {
            return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, lead });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
