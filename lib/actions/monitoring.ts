'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// ─── Move lead to monitoring (mark WA sent) ───────────────────────────────────
export async function sendToMonitoring(leadId: string, notes?: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    const now = new Date();
    const nextFollowup = new Date(now);
    nextFollowup.setDate(nextFollowup.getDate() + 7); // FU #1 in 7 days

    await prisma.lead.update({
        where: { id: leadId },
        data: {
            followupStage: 'sent',
            followupCount: 1,
            lastContactAt: now,
            nextFollowupAt: nextFollowup,
            ...(notes ? { prospectNotes: notes } : {}),
        },
    });

    revalidatePath('/dashboard/live');
    revalidatePath('/dashboard/monitoring');
    return { success: true };
}

// ─── Get all monitoring leads ─────────────────────────────────────────────────
export async function getMonitoringLeads() {
    const session = await getSession();
    if (!session) return [];

    return prisma.lead.findMany({
        where: {
            userId: session.userId,
            status: 'LIVE',
            nextFollowupAt: { not: null }, // Only leads explicitly sent to monitoring
        },
        select: {
            id: true,
            name: true,
            category: true,
            city: true,
            wa: true,
            rating: true,
            slug: true,
            followupStage: true,
            followupCount: true,
            lastContactAt: true,
            nextFollowupAt: true,
            linkClickedAt: true,
            qualifiedAt: true,
            totalTimeOnPage: true,
            prospectNotes: true,
            updatedAt: true,
        },
        orderBy: { lastContactAt: 'desc' },
    });
}

// ─── Get monitoring stats ─────────────────────────────────────────────────────
export async function getMonitoringStats() {
    const session = await getSession();
    if (!session) return null;

    const now = new Date();
    
    // Time boundaries for "today" and "yesterday"
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    
    const yesterdayEnd = new Date(todayStart);

    const [
        total, clicked, qualified, dueToday, closedLost,
        sentToday, sentYesterday, totalBlasted
    ] = await Promise.all([
        prisma.lead.count({ where: { userId: session.userId, status: 'LIVE', nextFollowupAt: { not: null } } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'LIVE', followupStage: 'clicked' } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'LIVE', followupStage: 'qualified' } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'LIVE', nextFollowupAt: { lte: now, not: null }, followupStage: { not: 'closed_lost' } } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'LIVE', followupStage: 'closed_lost' } }),
        
        // NEW: Sent today
        prisma.lead.count({ where: { userId: session.userId, lastContactAt: { gte: todayStart } } }),
        
        // NEW: Sent yesterday
        prisma.lead.count({ where: { userId: session.userId, lastContactAt: { gte: yesterdayStart, lt: yesterdayEnd } } }),
        
        // NEW: Total blasted
        prisma.lead.count({ where: { userId: session.userId, blastSentAt: { not: null } } }),
    ]);

    return { total, clicked, qualified, dueToday, closedLost, sentToday, sentYesterday, totalBlasted };
}

// ─── Update prospect notes ────────────────────────────────────────────────────
export async function updateProspectNotes(leadId: string, notes: string) {
    const session = await getSession();
    if (!session) return { success: false };

    await prisma.lead.update({
        where: { id: leadId },
        data: { prospectNotes: notes },
    });

    revalidatePath('/dashboard/monitoring');
    return { success: true };
}

// ─── Mark follow-up as done (manual) ─────────────────────────────────────────
export async function markFollowupDone(leadId: string) {
    const session = await getSession();
    if (!session) return { success: false };

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { success: false };

    const now = new Date();
    const nextCount = (lead.followupCount || 1) + 1;
    const FOLLOWUP_GAPS = [7, 14, 21, 7]; // days between each FU
    const daysUntilNext = FOLLOWUP_GAPS[Math.min(nextCount - 1, FOLLOWUP_GAPS.length - 1)];
    const nextFollowup = new Date(now);
    nextFollowup.setDate(nextFollowup.getDate() + daysUntilNext);

    const isLastFollowup = nextCount > 4;

    await prisma.lead.update({
        where: { id: leadId },
        data: {
            followupCount: nextCount,
            lastContactAt: now,
            nextFollowupAt: isLastFollowup ? null : nextFollowup,
            followupStage: isLastFollowup ? 'closed_lost' : lead.followupStage,
        },
    });

    revalidatePath('/dashboard/monitoring');
    return { success: true, isLastFollowup };
}
