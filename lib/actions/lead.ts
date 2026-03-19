'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { LeadStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

import { isMobileNumber, isValidWhatsApp, sanitizeWaNumber, isRecentLead } from '@/lib/utils';

// --- Activity Logging ---

export async function logActivity(leadId: string, action: string, description?: string, metadata?: any) {
    try {
        await prisma.activityLog.create({
            data: {
                leadId,
                action,
                description,
                metadata: metadata || {},
            }
        });
    } catch (error) {
        console.error(`[Logging Error] Lead ${leadId} action ${action}:`, error);
    }
}

export async function getActivityLogs(leadId: string) {
    const session = await getSession();
    if (!session) return [];

    try {
        return await prisma.activityLog.findMany({
            where: { leadId },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error('Fetch logs error:', error);
        return [];
    }
}

// --- Lead CRUD ---

export async function getLeads(filters?: {
    status?: LeadStatus;
    category?: string;
    province?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}) {
    const session = await getSession();
    if (!session) return [];

    const where: any = { userId: session.userId };

    if (filters?.status && (filters.status as any) !== 'ALL STATUS') {
        where.status = filters.status;
    } else {
        where.status = { not: 'ENRICHED' };
    }

    if (filters?.category && filters.category !== 'All' && filters.category !== 'ALL CATEGORIES') {
        where.category = { contains: filters.category, mode: 'insensitive' };
    }
    if (filters?.province) where.province = filters.province;
    if (filters?.search) {
        where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { address: { contains: filters.search, mode: 'insensitive' } },
        ];
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const skip = (page - 1) * pageSize;


    return prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
    });
}

export async function getLeadsCount(filters?: {
    status?: LeadStatus;
    category?: string;
    province?: string;
    search?: string;
}) {
    const session = await getSession();
    if (!session) return 0;

    const where: any = { userId: session.userId };

    if (filters?.status && (filters.status as any) !== 'ALL STATUS') {
        where.status = filters.status;
    } else {
        where.status = { not: 'ENRICHED' };
    }

    if (filters?.category && filters.category !== 'All' && filters.category !== 'ALL CATEGORIES') {
        where.category = { contains: filters.category, mode: 'insensitive' };
    }
    if (filters?.province) where.province = filters.province;
    if (filters?.search) {
        where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { address: { contains: filters.search, mode: 'insensitive' } },
        ];
    }

    return prisma.lead.count({ where });
}

export async function getLeadStats() {
    const session = await getSession();
    if (!session) return { total: 0, fresh: 0, enriched: 0, ready: 0, finish: 0, rejectedLeads: 0 };

    const [total, fresh, enriched, ready, finish, user] = await Promise.all([
        prisma.lead.count({ where: { userId: session.userId } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'FRESH' } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'ENRICHED' } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'READY' } }),
        prisma.lead.count({ where: { userId: session.userId, status: 'FINISH' } }),
        prisma.user.findUnique({ where: { id: session.userId }, select: { rejectedLeads: true } })
    ]);

    return { total, fresh, enriched, ready, finish, rejectedLeads: user?.rejectedLeads || 0 };
}

export async function cleanupOldLeads() {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    try {
        const deleted = await prisma.lead.deleteMany({
            where: {
                userId: session.userId,
                status: 'FRESH',
                createdAt: { lt: fourteenDaysAgo }
            }
        });

        revalidatePath('/dashboard/leads');
        return { success: true, message: `Deleted ${deleted.count} stale leads.` };
    } catch (error) {
        console.error('Cleanup error:', error);
        return { success: false, message: 'Failed to cleanup old leads' };
    }
}

export async function deleteLeads(ids: string[]) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.lead.deleteMany({
            where: {
                id: { in: ids },
                userId: session.userId,
            }
        });
        revalidatePath('/dashboard/leads');
        return { success: true };
    } catch (error) {
        console.error('Delete leads error:', error);
        return { success: false, message: 'Failed to delete leads' };
    }
}

export async function getUniqueCategories() {
    const session = await getSession();
    if (!session) return [];
    
    try {
        const categories = await prisma.lead.groupBy({
            by: ['category'],
            where: { userId: session.userId },
        });
        return categories.map(c => c.category).filter(Boolean);
    } catch (error) {
        console.error('getUniqueCategories error:', error);
        return [];
    }
}

export async function archiveToGSheet(leadIds: string[]) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        console.log(`[Archive]: Exporting ${leadIds.length} leads to GSheet...`);
        await prisma.lead.updateMany({
            where: { id: { in: leadIds }, userId: session.userId },
            data: { status: 'FINISH' }
        });

        revalidatePath('/dashboard/leads');
        return { success: true, message: `${leadIds.length} leads archived (simulated).` };
    } catch (error) {
        console.error('Archive error:', error);
        return { success: false, message: 'Failed to archive leads' };
    }
}

export async function saveForgeCode(leadId: string, htmlCode: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { success: false, message: 'Lead not found' };

        let slug = lead.slug;
        if (!slug) {
            slug = lead.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const existing = await prisma.lead.findUnique({ where: { slug } });
            if (existing) {
                slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
            }
        }

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                htmlCode,
                status: 'LIVE',
                slug
            }
        });

        await logActivity(leadId, 'LIVE', `Website published to ${slug}`, { slug });

        revalidatePath('/dashboard/enriched');
        revalidatePath('/dashboard/leads');
        return { success: true, slug };
    } catch (error: any) {
        console.error('Save Forge Error:', error);
        return { success: false, message: error.message || 'Failed to save code' };
    }
}

// --- Regional Data ---

export async function getProvinces() {
    const districtsPath = path.join(process.cwd(), 'data', 'regions.json');
    if (!fs.existsSync(districtsPath)) return [];
    const data = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));
    return Object.keys(data);
}

export async function getCities(province: string) {
    const districtsPath = path.join(process.cwd(), 'data', 'regions.json');
    if (!fs.existsSync(districtsPath)) return [];
    const data = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));
    return data[province] || [];
}

export async function getDistricts(province: string, city: string) {
    const provinceSlug = province.toLowerCase().replace(/ /g, '-');
    const districtsDir = path.join(process.cwd(), 'data', 'districts');
    const districtsPath = path.join(districtsDir, `${provinceSlug}.json`);
    
    if (fs.existsSync(districtsPath)) {
        try {
            const provinceData = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));
            if (provinceData[city]) {
                return provinceData[city];
            }
        } catch (e) {
            console.error(`[getDistricts] Error reading cache ${districtsPath}:`, e);
        }
    }

    // --- Geographic Normalization Layer ---
    let searchCity = city;
    const cityLower = city.toLowerCase();
    if (["kuta", "seminyak", "canggu"].includes(cityLower)) searchCity = "Badung";
    if (cityLower === "ubud") searchCity = "Gianyar";

    try {
        const baseUrl = "https://www.emsifa.com/api-wilayah-indonesia/api";
        const provRes = await fetch(`${baseUrl}/provinces.json`);
        if (!provRes.ok) return [];
        
        const provinces = await provRes.json();
        const prov = provinces.find((p: any) => p.name.toLowerCase() === province.toLowerCase());
        
        if (!prov) return [];

        const regRes = await fetch(`${baseUrl}/regencies/${prov.id}.json`);
        if (!regRes.ok) return [];
        const regencies = await regRes.json();
        const searchCityLower = searchCity.toLowerCase();
        
        const reg = regencies.find((r: any) => 
            r.name.toLowerCase() === searchCityLower || 
            r.name.toLowerCase().includes(searchCityLower)
        );

        if (!reg) return [];

        const distRes = await fetch(`${baseUrl}/districts/${reg.id}.json`);
        if (!distRes.ok) return [];
        const districtsData = await distRes.json();
        const districts = districtsData.map((d: any) => d.name);

        let provinceData: any = {};
        if (fs.existsSync(districtsPath)) {
            provinceData = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));
        }
        
        provinceData[city] = districts; // Save under original city name
        if (!fs.existsSync(districtsDir)) fs.mkdirSync(districtsDir, { recursive: true });
        fs.writeFileSync(districtsPath, JSON.stringify(provinceData, null, 2), 'utf8');
        
        return districts;
    } catch (error) {
        console.warn(`[getDistricts] External API Fallback to Local Mapping for ${city}:`, error);
        try {
            const { DISTRICTS_BY_CITY } = await import('@/lib/districts');
            const localDistricts = DISTRICTS_BY_CITY[city] || DISTRICTS_BY_CITY[searchCity] || [];
            return localDistricts;
        } catch (e) {
            return [];
        }
    }
}

export async function updateLeadEnrichmentData(leadId: string, data: {
    brandData?: any;
    aiAnalysis?: any;
    painPoints?: string;
    masterWebsitePrompt?: string;
    resolvingIdea?: string;
}) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.lead.update({
            where: { id: leadId },
            data: {
                ...data,
                // If status was FRESH, move to ENRICHED since user is manually refining it
                status: {
                    set: 'ENRICHED'
                }
            }
        });

        await logActivity(leadId, 'MANUAL_UPDATE', 'Refined lead enrichment data manually');
        
        revalidatePath('/dashboard/leads');
        revalidatePath('/dashboard/enriched');
        revalidatePath('/dashboard/live');
        
        return { success: true };
    } catch (error: any) {
        console.error('[Update Enrichment Error]:', error);
        return { success: false, message: error.message };
    }
}

export async function updateLeadHtml(leadId: string, htmlCode: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.lead.update({
            where: { id: leadId },
            data: { htmlCode }
        });

        revalidatePath('/dashboard/live');
        
        return { success: true };
    } catch (error: any) {
        console.error('[Update HTML Error]:', error);
        return { success: false, message: error.message };
    }
}
