import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { JobRegistry } from '@/lib/jobRegistry';
import { randomUUID } from 'crypto';
import { generateBlueprintCode } from '@/lib/actions/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, answers } = body;

        if (!token) {
            return NextResponse.json({ success: false, message: 'Token is required' }, { status: 400 });
        }

        const submission = await prisma.brandDnaSubmission.findUnique({
            where: { token },
            include: { lead: true }
        });

        if (!submission) {
            return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 404 });
        }

        // Update submission with answers
        await prisma.brandDnaSubmission.update({
            where: { id: submission.id },
            data: {
                status: 'SUBMITTED',
                answers: answers,
            }
        });

        return NextResponse.json({ success: true, message: 'Brand DNA saved successfully' });
    } catch (error: any) {
        console.error("[API Blueprint Error]:", error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Internal Server Error' 
        }, { status: 500 });
    }
}
