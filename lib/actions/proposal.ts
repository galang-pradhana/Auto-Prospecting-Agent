'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function saveProposal(data: {
    leadId: string;
    html: string;
    styleId?: string;
    prices?: any;
    clientOverrides?: any;
}) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        const proposal = await prisma.proposal.upsert({
            where: { leadId: data.leadId },
            update: {
                html: data.html,
                styleId: data.styleId,
                prices: data.prices,
                clientOverrides: data.clientOverrides,
            },
            create: {
                leadId: data.leadId,
                html: data.html,
                styleId: data.styleId,
                prices: data.prices,
                clientOverrides: data.clientOverrides,
            },
        });

        return { success: true, proposal };
    } catch (error: any) {
        console.error("[Save Proposal Error]:", error);
        return { success: false, message: error.message };
    }
}

export async function getProposalByLeadId(leadId: string) {
    const session = await getSession();
    if (!session) return null;

    try {
        return await prisma.proposal.findUnique({
            where: { leadId }
        });
    } catch (error) {
        console.error("[Get Proposal Error]:", error);
        return null;
    }
}
