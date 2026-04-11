/**
 * SYNCHRONOUS UTILITIES
 * These functions are purely logic-based and do not use 'use server'.
 */

export function isMobileNumber(phone: string): boolean {
    if (!phone || phone === 'N/A') return false;
    const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    const waRegex = /^(\+62|62|0)8[1-9][0-9]{7,11}$/;
    return waRegex.test(cleanPhone);
}

export function isValidWhatsApp(phone: string): boolean {
    return isMobileNumber(phone);
}

export function sanitizeWaNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, ''); // Buang semua selain angka
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }
    return cleaned;
}

export function isRecentLead(reviews: any[]): boolean {
    if (!reviews || reviews.length === 0) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const twentyFourMonthsAgo = new Date(today);
    twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);

    const reviewDates = reviews
        .map(r => r.When ? new Date(r.When) : null)
        .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

    if (reviewDates.length === 0) return false;

    const latestReviewDate = new Date(Math.max(...reviewDates.map(d => d.getTime())));
    latestReviewDate.setHours(0, 0, 0, 0);
    
    return latestReviewDate >= twentyFourMonthsAgo;
}

export function cleanAIResponse(text: string): string {
    let raw = text.replace(/```json|```/g, "").trim();
    return raw.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, " ");
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius Bumi (KM)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

/**
 * SERALIZATION UTILITIES
 * Converts Prisma Date objects to ISO strings for safe transfer to Client Components.
 */

export function serializeLead(lead: any) {
    if (!lead) return null;
    return {
        ...lead,
        createdAt: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt,
        updatedAt: lead.updatedAt instanceof Date ? lead.updatedAt.toISOString() : lead.updatedAt,
        lastContactAt: lead.lastContactAt instanceof Date ? lead.lastContactAt.toISOString() : lead.lastContactAt,
        nextFollowupAt: lead.nextFollowupAt instanceof Date ? lead.nextFollowupAt.toISOString() : (lead.nextFollowupAt || null),
        linkClickedAt: lead.linkClickedAt instanceof Date ? lead.linkClickedAt.toISOString() : (lead.linkClickedAt || null),
        qualifiedAt: lead.qualifiedAt instanceof Date ? lead.qualifiedAt.toISOString() : (lead.qualifiedAt || null),
    };
}

export function serializeLeadSandbox(lead: any) {
    if (!lead) return null;
    return {
        ...lead,
        createdAt: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt,
    };
}
