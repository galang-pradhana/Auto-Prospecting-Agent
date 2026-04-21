'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { B2B_ECOSYSTEM, B2BConnection, getLocationTier } from '@/lib/b2b-ecosystem';

// --- Get connection matches from DB ---
export interface ConnectionMatch {
    connection: B2BConnection;
    leads: {
        id: string;
        name: string;
        city: string;
        province: string;
        wa: string | null;
        rating: number;
        status: string;
        category: string;
        locationTier: 1 | 2 | 3;
    }[];
    totalInDb: number;
}

export async function getB2BConnections(
    categoryFocus: string,
    cityFocus: string,
    provinceFocus: string
): Promise<{ demand: ConnectionMatch[]; supply: ConnectionMatch[] }> {
    const session = await getSession();
    if (!session) return { demand: [], supply: [] };

    const ecosystem = B2B_ECOSYSTEM[categoryFocus];
    if (!ecosystem) return { demand: [], supply: [] };

    const resolveMatches = async (connections: B2BConnection[]): Promise<ConnectionMatch[]> => {
        return Promise.all(connections.map(async (conn) => {
            // Search DB by category keyword (case-insensitive contains)
            const leads = await prisma.lead.findMany({
                where: {
                    userId: session.userId,
                    category: { contains: conn.category.split(' ')[0], mode: 'insensitive' }
                },
                select: { id: true, name: true, city: true, province: true, wa: true, rating: true, status: true, category: true },
                take: 10,
                orderBy: { rating: 'desc' }
            });

            // Annotate each lead with location tier
            const annotatedLeads = leads.map(lead => ({
                ...lead,
                locationTier: getLocationTier(cityFocus, lead.city, provinceFocus, lead.province)
            }));

            // Sort: sama kota dulu, luar kota, luar pulau
            annotatedLeads.sort((a, b) => a.locationTier - b.locationTier);

            return { connection: conn, leads: annotatedLeads, totalInDb: leads.length };
        }));
    };

    const [demand, supply] = await Promise.all([
        resolveMatches(ecosystem.demand),
        resolveMatches(ecosystem.supply),
    ]);

    return { demand, supply };
}

// --- Get all B2B Deals for user ---
export async function getB2BDeals() {
    const session = await getSession();
    if (!session) return [];

    return prisma.b2BDeal.findMany({
        where: { userId: session.userId },
        include: {
            buyer: { select: { id: true, name: true, city: true, category: true, wa: true } },
            seller: { select: { id: true, name: true, city: true, category: true, wa: true } },
        },
        orderBy: { updatedAt: 'desc' }
    });
}

// --- Create a new B2B Deal ---
export async function createB2BDeal(data: {
    buyerLeadId: string;
    sellerLeadId: string;
    categoryLink: string;
    locationTier: 1 | 2 | 3;
    notes?: string;
}) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        const deal = await prisma.b2BDeal.create({
            data: {
                userId: session.userId,
                buyerLeadId: data.buyerLeadId,
                sellerLeadId: data.sellerLeadId,
                categoryLink: data.categoryLink,
                locationTier: data.locationTier,
                notes: data.notes || '',
                status: 'DISCOVERED',
            }
        });
        revalidatePath('/dashboard/linked-b2b');
        return { success: true, deal };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
}

// --- Update Deal Status ---
export async function updateB2BDealStatus(dealId: string, status: string, extraData?: { dealValue?: number; brokerFee?: number; notes?: string }) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.b2BDeal.update({
            where: { id: dealId },
            data: {
                status,
                ...(extraData?.dealValue !== undefined && { dealValue: extraData.dealValue }),
                ...(extraData?.brokerFee !== undefined && { brokerFee: extraData.brokerFee }),
                ...(extraData?.notes && { notes: extraData.notes }),
            }
        });
        revalidatePath('/dashboard/linked-b2b');
        return { success: true };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
}

// --- Delete Deal ---
export async function deleteB2BDeal(dealId: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.b2BDeal.delete({ where: { id: dealId } });
        revalidatePath('/dashboard/linked-b2b');
        return { success: true };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
}

// --- Revenue summary ---
export async function getB2BRevenueSummary() {
    const session = await getSession();
    if (!session) return null;

    const deals = await prisma.b2BDeal.findMany({
        where: { userId: session.userId },
        select: { status: true, brokerFee: true, dealValue: true, categoryLink: true }
    });

    const closed = deals.filter(d => d.status === 'CLOSED');
    const totalFee = closed.reduce((sum, d) => sum + (d.brokerFee || 0), 0);
    const totalDealValue = closed.reduce((sum, d) => sum + (d.dealValue || 0), 0);

    const pipeline = {
        DISCOVERED: deals.filter(d => d.status === 'DISCOVERED').length,
        VERIFIED: deals.filter(d => d.status === 'VERIFIED').length,
        INTRODUCED: deals.filter(d => d.status === 'INTRODUCED').length,
        NEGOTIATING: deals.filter(d => d.status === 'NEGOTIATING').length,
        CLOSED: closed.length,
    };

    return { totalFee, totalDealValue, pipeline, totalDeals: deals.length };
}
