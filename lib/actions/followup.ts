'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getFollowUpQueue() {
    const session = await getSession();
    if (!session) return [];

    try {
        return await prisma.followupQueue.findMany({
            where: {
                status: 'pending',
                lead: {
                    userId: session.userId
                }
            },
            include: {
                lead: {
                    select: {
                        name: true,
                        wa: true,
                        category: true
                    }
                }
            },
            orderBy: {
                queuedAt: 'desc'
            }
        });
    } catch (error) {
        console.error('[getFollowUpQueue] Error:', error);
        return [];
    }
}

export async function updateQueueItemStatus(id: string, status: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.followupQueue.update({
            where: { id },
            data: { 
                status,
                sentAt: status === 'sent' ? new Date() : null
            }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('[updateQueueItemStatus] Error:', error);
        return { success: false, message: error.message };
    }
}
