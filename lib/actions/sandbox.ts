'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function getLatestSandbox(sessionStartTime?: number) {
    const session = await getSession();
    if (!session) return [];

    const where: any = {
        userId: session.userId,
    };

    if (sessionStartTime) {
        where.createdAt = {
            gte: new Date(sessionStartTime - 10000) // 10s buffer
        };
    }

    return prisma.leadSandbox.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50
    });
}

export async function deleteSandboxLead(id: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.leadSandbox.delete({
            where: { id }
        });
        return { success: true };
    } catch (error) {
        console.error('Delete Sandbox Lead error:', error);
        return { success: false, message: 'Failed to delete lead' };
    }
}

export async function promoteToLead(id: string, wa: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        const sandboxLead = await prisma.leadSandbox.findUnique({
            where: { id }
        });

        if (!sandboxLead) return { success: false, message: 'Lead not found in sandbox' };

        // Create new lead in the main table
        await prisma.lead.create({
            data: {
                name: sandboxLead.name || 'Unnamed',
                wa: wa,
                category: sandboxLead.category || 'General',
                address: sandboxLead.address || '',
                city: sandboxLead.city || '',
                province: '', // Default empty
                rating: 0,
                website: sandboxLead.mapsUrl || '',
                status: 'FRESH',
                userId: session.userId,
                brandData: {}, // Initial empty brand data
            }
        });

        // Delete from sandbox
        await prisma.leadSandbox.delete({
            where: { id }
        });

        return { success: true };
    } catch (error) {
        console.error('Promote Sandbox Lead error:', error);
        return { success: false, message: 'Failed to promote lead' };
    }
}
