import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Force dynamic because this is a tool
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const leads = await prisma.lead.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 100 // Last 100 for performance
        });

        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ leads, users });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { id, field, value, model = 'lead' } = body;

        if (!id || !field) return NextResponse.json({ error: 'Missing ID or field' }, { status: 400 });

        // Build data object dynamically
        const updateData: any = {};
        
        // Handle types
        if (field === 'rating') updateData[field] = parseFloat(value);
        else if (field === 'isPro' || field === 'isApproved') updateData[field] = value === 'true' || value === true;
        else updateData[field] = value;

        let updated;
        if (model === 'user') {
            updated = await prisma.user.update({
                where: { id },
                data: updateData
            });
        } else {
            updated = await prisma.lead.update({
                where: { id },
                data: updateData
            });
        }

        return NextResponse.json({ success: true, updated });
    } catch (error: any) {
        console.error("Local Editor Error:", error);
        
        // Handle Prisma Unique Constraint Error specifically
        if (error.code === 'P2002') {
            const target = error.meta?.target?.[0] || 'field';
            return NextResponse.json({ 
                error: `Data ${target} ini sudah digunakan. Tidak bisa duplikat!` 
            }, { status: 400 });
        }
        
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
