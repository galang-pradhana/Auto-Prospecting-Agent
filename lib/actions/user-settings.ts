'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getUserSettings() {
    const session = await getSession();
    if (!session) return null;
    
    return prisma.user.findUnique({
        where: { id: session.userId },
        select: { 
            kieAiApiKey: true, 
            openrouterApiKey: true,
            aiProvider: true,
            byocMode: true, 
            aiEngine: true,
            htmlModel: true,
            businessName: true,
            businessIg: true,
            businessWa: true,
            fonnteTokens: true
        }
    });
}

export async function updateUserSettings(data: {
    kieAiApiKey?: string;
    openrouterApiKey?: string;
    aiProvider?: string;
    byocMode?: boolean;
    aiEngine?: string;
    htmlModel?: string;
    businessName?: string;
    businessIg?: string;
    businessWa?: string;
    fonnteTokens?: string[];
}) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.user.update({
            where: { id: session.userId },
            data
        });
        revalidatePath('/dashboard/settings');
        return { success: true };
    } catch (error) {
        console.error('Update settings error:', error);
        return { success: false, message: 'Failed to update settings' };
    }
}
