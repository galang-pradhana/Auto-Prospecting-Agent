'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// ─── Move lead to monitoring (mark WA sent) ───────────────────────────────────
export async function sendToMonitoring(leadId: string, persona: string = 'professional', notes?: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    const now = new Date();
    const nextFollowup = new Date(now);
    nextFollowup.setDate(nextFollowup.getDate() + 3); // H-1 of Day 4 = Day 3

    await prisma.lead.update({
        where: { id: leadId },
        data: {
            followupStage: 'monitoring_1',
            followupCount: 1,
            lastContactAt: now,
            nextFollowupAt: nextFollowup,
            ...(notes ? { prospectNotes: notes } : {}),
        },
    });

    // Generate first FU draft in background (non-blocking)
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/followup/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId, followupNumber: 1, persona })
        }).catch(e => console.error("Async follow-up trigger failed:", e));
    } catch (e) {
        console.error("Failed to trigger initial FU draft:", e);
    }

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
            // We include monitoring stages, deal, and fail
            followupStage: { in: ['monitoring_1', 'monitoring_2', 'monitoring_3', 'closed_won', 'closed_lost', 'sent', 'clicked', 'qualified'] }
        },
        include: {
            followupQueue: {
                where: { status: { in: ['pending', 'scheduled'] } },
                take: 1,
                orderBy: { followupNumber: 'desc' }
            }
        },

        orderBy: { updatedAt: 'desc' },
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
        total, clicked, qualified, dueToday, closedLost, closedWon,
        sentToday, sentYesterday, totalBlasted
    ] = await Promise.all([
        prisma.lead.count({ where: { userId: session.userId, status: 'LIVE', followupStage: { in: ['monitoring_1', 'monitoring_2', 'monitoring_3'] } } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'LIVE', followupStage: 'clicked' } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'LIVE', followupStage: 'qualified' } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'LIVE', nextFollowupAt: { lte: now, not: null }, followupStage: { startsWith: 'monitoring_' } } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'LIVE', followupStage: 'closed_lost' } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'LIVE', followupStage: 'closed_won' } }),
        
        // NEW: Sent today
        prisma.lead.count({ where: { userId: session.userId, lastContactAt: { gte: todayStart } } }),
        
        // NEW: Sent yesterday
        prisma.lead.count({ where: { userId: session.userId, lastContactAt: { gte: yesterdayStart, lt: yesterdayEnd } } }),
        
        // NEW: Total blasted
        prisma.lead.count({ where: { userId: session.userId, blastSentAt: { not: null } } }),
    ]);

    return { total, clicked, qualified, dueToday, closedLost, closedWon, sentToday, sentYesterday, totalBlasted };
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

// ─── Mark as Deal ─────────────────────────────────────────────────────────────
export async function markAsDeal(leadId: string) {
    const session = await getSession();
    if (!session) return { success: false };

    await prisma.lead.update({
        where: { id: leadId },
        data: {
            followupStage: 'closed_won',
            nextFollowupAt: null,
        }
    });

    revalidatePath('/dashboard/monitoring');
    return { success: true };
}

// ─── Mark as Fail ─────────────────────────────────────────────────────────────
export async function markAsFail(leadId: string) {
    const session = await getSession();
    if (!session) return { success: false };

    await prisma.lead.update({
        where: { id: leadId },
        data: {
            followupStage: 'closed_lost',
            nextFollowupAt: null,
        }
    });

    revalidatePath('/dashboard/monitoring');
    return { success: true };
}

// ─── Batch Mark as Deal ───────────────────────────────────────────────────────
export async function batchMarkAsDeal(leadIds: string[]) {
    const session = await getSession();
    if (!session) return { success: false };

    await prisma.lead.updateMany({
        where: { id: { in: leadIds }, userId: session.userId },
        data: {
            followupStage: 'closed_won',
            nextFollowupAt: null,
        }
    });

    revalidatePath('/dashboard/monitoring');
    return { success: true };
}

// ─── Batch Mark as Fail ───────────────────────────────────────────────────────
export async function batchMarkAsFail(leadIds: string[]) {
    const session = await getSession();
    if (!session) return { success: false };

    await prisma.lead.updateMany({
        where: { id: { in: leadIds }, userId: session.userId },
        data: {
            followupStage: 'closed_lost',
            nextFollowupAt: null,
        }
    });

    revalidatePath('/dashboard/monitoring');
    return { success: true };
}


// ─── Mark follow-up as done (manual) ─────────────────────────────────────────
export async function markFollowupDone(leadId: string, persona: string = 'professional') {
    const session = await getSession();
    if (!session) return { success: false };

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { success: false };

    const now = new Date();
    const currentCount = lead.followupCount || 1;
    const nextCount = currentCount + 1;
    
    // Update current draft in queue to sent
    await prisma.followupQueue.updateMany({
        where: { prospectId: leadId, followupNumber: currentCount, status: 'pending' },
        data: { status: 'sent', sentAt: now }
    });

    let nextFollowup: Date | null = new Date(now);
    let nextStage = `monitoring_${nextCount}`;
    let isFinished = false;

    if (currentCount === 1) {
        // From Day 3 to Day 6 (H-1 of Day 7) -> gap 3 days
        nextFollowup.setDate(nextFollowup.getDate() + 3);
    } else if (currentCount === 2) {
        // From Day 6 to Day 14 (H-1 of Day 15) -> gap 8 days
        nextFollowup.setDate(nextFollowup.getDate() + 8);
    } else {
        // After FU 3, move to Fail
        nextFollowup = null;
        nextStage = 'closed_lost';
        isFinished = true;
    }

    await prisma.lead.update({
        where: { id: leadId },
        data: {
            followupCount: nextCount,
            lastContactAt: now,
            nextFollowupAt: nextFollowup,
            followupStage: nextStage,
        },
    });

    // Generate next FU draft if not finished (non-blocking)
    if (!isFinished) {
        try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            fetch(`${baseUrl}/api/followup/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId, followupNumber: nextCount, persona })
            }).catch(e => console.error(`Async FU ${nextCount} trigger failed:`, e));
        } catch (e) {
            console.error(`Failed to trigger FU ${nextCount} draft:`, e);
        }
    }

    revalidatePath('/dashboard/monitoring');
    return { success: true, isFinished };
}

