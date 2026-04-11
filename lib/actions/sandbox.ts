'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sanitizeWaNumber, isValidWhatsApp } from '@/lib/utils';
import { logActivity } from './lead';

export async function getSandboxLeads() {
    const session = await getSession();
    if (!session) return { success: false, data: [] };

    try {
        const leads = await prisma.leadSandbox.findMany({
            where: { userId: session.userId },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: leads };
    } catch (e) {
        console.error("[Sandbox Fetch Error]:", e);
        return { success: false, data: [] };
    }
}

export async function deleteSandboxLead(id: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.leadSandbox.delete({
            where: { 
                id,
                userId: session.userId // Security: Ensure it belongs to user
            }
        });
        revalidatePath('/dashboard/sandbox');
        return { success: true };
    } catch (e) {
        console.error("[Sandbox Delete Error]:", e);
        return { success: false, message: 'Failed to delete sandbox lead' };
    }
}

export async function promoteToLead(id: string, correctedWa: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    const sanitizedWa = sanitizeWaNumber(correctedWa);

    if (!isValidWhatsApp(sanitizedWa)) {
        return { success: false, message: 'Invalid WhatsApp format after sanitization.' };
    }

    try {
        // Run in transaction to ensure atomic move
        return await prisma.$transaction(async (tx) => {
            const sandboxItem = await tx.leadSandbox.findUnique({
                where: { id, userId: session.userId }
            });

            if (!sandboxItem) {
                return { success: false, message: 'Item not found in Sandbox' };
            }

            // Check if the corrected WA already exists in the main Lead table
            const existingLead = await tx.lead.findUnique({
                where: { wa: sanitizedWa }
            });

            if (existingLead) {
                return { success: false, message: 'This WhatsApp number already exists in Lead system.' };
            }

            // Create new Lead
            const newLead = await tx.lead.create({
                data: {
                    name: sandboxItem.name || 'N/A',
                    wa: sanitizedWa,
                    category: sandboxItem.category || 'N/A',
                    province: '', // Can extract from rawSource if needed, but not required yet
                    city: sandboxItem.city || '',
                    address: sandboxItem.address || 'N/A',
                    mapsUrl: sandboxItem.mapsUrl,
                    status: 'FRESH',
                    userId: session.userId,
                    
                    // We can retain the rawSource in brandData/metadata if desired
                    // but keeping it simple for now based on objective
                }
            });

            // Log activity
            await tx.activityLog.create({
                data: {
                    prospectId: newLead.id,
                    action: 'PROMOTE',
                    description: 'Promoted from Sandbox via Manual Research',
                    metadata: { originalId: id, previousWa: sandboxItem.wa }
                }
            });

            // Delete from sandbox
            await tx.leadSandbox.delete({
                where: { id }
            });

            return { success: true, message: 'Lead successfully promoted to FRESH.' };
        });

    } catch (e) {
        console.error("[Sandbox Promote Error]:", e);
        return { success: false, message: 'Failed to promote lead' };
    }
}
