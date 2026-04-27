import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { scheduleMessage } from '@/lib/fonnte';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { leadId, queueId, scheduledAt, messageText } = body;

        if (!queueId || !scheduledAt || !leadId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const lead = await prisma.lead.findUnique({
            where: { id: leadId, userId: session.userId },
            select: { wa: true, phone: true }
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        const targetPhone = lead.wa || lead.phone;
        if (!targetPhone) {
            return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 });
        }

        // Schedule via Fonnte
        const scheduledDate = new Date(scheduledAt);
        const fonnteRes = await scheduleMessage(targetPhone, messageText, scheduledDate);

        if (!fonnteRes.status) {
            return NextResponse.json({ error: fonnteRes.message || 'Fonnte Scheduling Failed' }, { status: 500 });
        }

        // Update FollowupQueue record
        await prisma.followupQueue.update({
            where: { id: queueId },
            data: {
                status: 'scheduled',
                scheduledAt: scheduledDate
            }
        });

        return NextResponse.json({ success: true, message: 'Follow-up scheduled successfully via Fonnte' });

    } catch (error: any) {
        console.error("[API /monitoring/schedule-followup] Error:", error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
