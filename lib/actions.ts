'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { LeadStatus } from '@prisma/client';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as fsPromises from 'fs/promises';

// --- Kie.ai Credit ---
export async function getKieCredit(): Promise<string> {
    const api_key = process.env.KIE_AI_API_KEY;
    const url = "https://api.kie.ai/api/v1/chat/credit";

    try {
        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${api_key}`,
                "Content-Type": "application/json"
            },
            next: { revalidate: 60 }
        });

        if (response.ok) {
            const res_data = await response.json();
            return res_data.data || '0';
        }
        return 'N/A';
    } catch (error) {
        console.error('Failed to fetch Kie credit:', error);
        return 'Error';
    }
}

// --- Lead CRUD (Prisma) ---

export async function getLeads(filters?: {
    status?: LeadStatus;
    category?: string;
    province?: string;
    search?: string;
}) {
    const session = await getSession();
    if (!session) return [];

    const where: any = { userId: session.userId };

    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.province) where.province = filters.province;
    if (filters?.search) {
        where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { address: { contains: filters.search, mode: 'insensitive' } },
        ];
    }

    return prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
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

// --- Helpers ---
function isValidWhatsApp(phone: string): boolean {
    if (!phone || phone === 'N/A') return false;
    // Regex for Indonesian Mobile Numbers: 08..., 628..., +628...
    const waRegex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
    return waRegex.test(phone.replace(/\s+/g, '').replace(/-/g, ''));
}

// --- Scraper ---

// --- Scraper Helper ---
async function executeScraperProcess(binaryPath: string, queryFilePath: string, radius: number): Promise<{ code: number | null; stdoutData: string }> {
    return new Promise((resolve, reject) => {
        const scraperProcess = spawn(binaryPath, [
            '-input', queryFilePath,
            '-c', '4',
            '-radius', String(radius),
            '-depth', '20',
            '-json',
            '-lang', 'id'
        ]);

        let stdoutData = '';
        scraperProcess.stdout.on('data', (data) => {
            const chunk = data.toString();
            stdoutData += chunk;
            console.log(`[Go-Engine Output]: ${chunk.trim()}`);
        });

        scraperProcess.stderr.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg) console.error(`[Go-Engine Error]: ${msg}`);
        });

        scraperProcess.on('error', (err) => {
            reject(err);
        });

        scraperProcess.on('close', (code) => {
            resolve({ code, stdoutData });
        });
    });
}

export async function runScraper(
    keyword: string,
    limit: number = 10,
    minRating: number = 0,
    maxRating: number = 5,
    noWebsite: boolean = false,
    radius: number = 25000,
    fallbackMode: boolean = false,
    category: string = "",
    city: string = "",
    province: string = "",
    includeDistricts: boolean = false,
    district: string = ""
) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    const queryFilePath = path.join(process.cwd(), `queries_${Date.now()}.txt`);
    console.log(`[Go-Engine]: Preparing dynamic input. Target: "${district || city}"`);

    try {
        let queries = [keyword];
        const binaryPath = 'google-maps-scraper';

        if (district && city && province) {
            queries = [`"${category}" in "${district}, ${city}, ${province}"`];
        } else if (includeDistricts && city && province) {
            const districts = await getDistricts(province, city).catch(() => []);
            queries = districts.length > 0 
                ? districts.map(d => `"${category}" in "${d}, ${city}, ${province}"`)
                : [`"${category}" in "${city}, ${province}"`];
        } else {
            queries = [`"${category}" in "${city}, ${province}"`];
        }

        fs.writeFileSync(queryFilePath, queries.join('\n'), 'utf8');
        const { code, stdoutData } = await executeScraperProcess(binaryPath, queryFilePath, radius);

        if (fs.existsSync(queryFilePath)) fs.unlinkSync(queryFilePath);

        if (code !== 0) {
            return { success: false, message: `Go engine exited with code ${code}` };
        }

        const jsonLines = stdoutData.split('\n').filter((l) => l.trim());
        let newCount = 0;
        let updateCount = 0;
        let aiRejectedCount = 0;

        for (const line of jsonLines) {
            try {
                const item = JSON.parse(line);
                const wa = item.phone || 'N/A';
                const name = item.title || 'N/A';
                const website = item.website || 'N/A';
                
                if (!isValidWhatsApp(wa)) {
                    aiRejectedCount++;
                    continue;
                }

                if (website !== 'N/A' && website.trim() !== '') {
                    const professionalSuffixes = ['gov', 'edu', 'org', 'mil'];
                    if (professionalSuffixes.some(s => website.toLowerCase().endsWith(`.${s}`))) {
                        aiRejectedCount++;
                        continue;
                    }

                    if (await shouldSkipLead(name, website)) {
                        aiRejectedCount++;
                        await prisma.user.update({
                            where: { id: session.userId },
                            data: { rejectedLeads: { increment: 1 } }
                        }).catch(() => {});
                        continue;
                    }
                }

                const existing = await prisma.lead.findUnique({ where: { wa } });
                if (existing) {
                    if (!['ENRICHED', 'READY', 'FINISH'].includes(existing.status)) {
                        await prisma.lead.update({
                            where: { wa },
                            data: {
                                rating: item.review_rating || existing.rating,
                                category: item.category || category || existing.category,
                                address: item.address || existing.address,
                                reviews: item.user_reviews || existing.reviews,
                            }
                        });
                    }
                    updateCount++;
                } else {
                    await prisma.lead.create({
                        data: {
                            name, wa,
                            category: item.category || category || 'N/A',
                            province: province || '', city: city || '',
                            address: item.address || 'N/A',
                            rating: item.review_rating || 0,
                            website: item.website || 'N/A',
                            reviews: item.user_reviews || [],
                            status: 'FRESH',
                            userId: session.userId,
                        }
                    });
                    newCount++;
                }
            } catch (err) {
                console.error("[Parser Error]:", err);
            }
        }

        revalidatePath('/dashboard/leads');
        revalidatePath('/dashboard/scraper');

        return { 
            success: true, 
            message: `Extracted ${newCount} new leads.`,
            stats: { new: newCount, duplicate: updateCount, aiRejected: aiRejectedCount }
        };

    } catch (err: any) {
        if (fs.existsSync(queryFilePath)) fs.unlinkSync(queryFilePath);
        return { success: false, message: err.message || 'Scraper failed' };
    }
}

// --- AI Lead Filter ---
async function shouldSkipLead(name: string, website: string): Promise<boolean> {
    const apiKey = process.env.KIE_AI_API_KEY;
    const endpoint = "https://api.kie.ai/gemini-3-flash/v1/chat/completions";

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [{
                    role: "user",
                    content: [{
                        type: "text",
                        text: `EVALUASI PROSPEK: Bisnis "${name}" memiliki website "${website}". 

KRITERIA SKIP (decision: "SKIP"): 
1. Website terlihat profesional, modern, dan mobile-friendly.
2. Menggunakan framework modern (Next.js, React, dll) atau custom design berkualitas.
3. Bukan sekadar landing page gratisan (business.site, linktree, dll).
4. Berfungsi penuh (bukan under construction).

KRITERIA SIMPAN (decision: "KEEP"):
1. Website usang (desain era 2010-an).
2. Sangat lambat atau tidak responsif di mobile.
3. Menggunakan platform gratisan seperti Google Business Site (.business.site).
4. Website rusak atau desain sangat berantakan.

Output WAJIB JSON: {"decision": "SKIP" | "KEEP"}`
                    }]
                }],
                stream: false,
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) return false;
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (content) {
            const parsed = JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
            return parsed.decision === 'SKIP';
        }
    } catch (e) {
        console.error("[AI Filter Error]:", e);
    }
    return false;
}

// --- Delete Leads ---

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

// --- AI Enrichment ---

const TONE_MAP: Record<string, string> = {
    "Dental Clinic": "Gunakan gaya bahasa profesional, terpercaya, dan bersih. Fokus pada keamanan, higienitas, dan keahlian medis.",
    "Law Firm": "Gunakan gaya bahasa formal, autoritatif, dan prestisius. Fokus pada keadilan, kepercayaan, dan rekam jejak.",
    "Auto Detailing Service": "Gunakan gaya bahasa maskulin, premium, dan agresif. Fokus pada performa, kualitas, dan eksklusivitas.",
    "Wedding Organizer": "Gunakan gaya bahasa romantis, elegan, dan hangat. Fokus pada momen berharga, keindahan, dan memorable experience.",
    "Interior Design": "Gunakan gaya bahasa kreatif, modern, dan sophisticated. Fokus pada estetika, fungsionalitas, dan transformasi ruang.",
};

async function callKieAI(businessName: string, reviews: string[], category: string) {
    const apiKey = process.env.KIE_AI_API_KEY;
    const endpoint = "https://api.kie.ai/gemini-3-flash/v1/chat/completions";
    const reviewsText = reviews.join(' | ');
    const toneInstruction = TONE_MAP[category] || "Gunakan gaya bahasa yang sesuai dengan jenis bisnis ini, profesional namun ramah.";

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messages: [{
                role: "user",
                content: [{
                    type: "text",
                    text: `ANALISA PROSPEK BISNIS: "${businessName}"
DATA REVIEW: ${reviewsText}
KATEGORI: ${category}
INSTRUKSI TONE: ${toneInstruction}

TUGAS:
1. Analisa ulasan pelanggan ini dan berikan 3 Pain Points utama pemilik bisnis yang bisa diselesaikan dengan website/branding.
2. Fokus pada masalah operasional, visual, atau kurangnya informasi digital yang merugikan bisnis.

Output WAJIB JSON murni dengan struktur:
{
  "branding": { "title": "...", "tagline": "...", "description": "..." },
  "painPoints": ["Poin 1", "Poin 2", "Poin 3"],
  "summary": "..."
}`
                }]
            }],
            stream: true,
            include_thoughts: false,
            reasoning_effort: "low",
            response_format: { type: "json_object" }
        }),
    });

    if (!response.ok) {
        throw new Error(`Kie.ai API error ${response.status}`);
    }

    let fullContent = '';
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                if (line.includes('[DONE]')) break;
                try {
                    const parsed = JSON.parse(line.slice(6));
                    const content = parsed.choices?.[0]?.delta?.content || '';
                    fullContent += content;
                } catch {}
            }
        }
    }

    if (fullContent) {
        const cleaned = fullContent.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    }

    return null;
}

export async function enrichLead(leadId: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { success: false, message: 'Lead not found' };

    if (!isValidWhatsApp(lead.wa)) {
        return { success: false, message: 'Invalid WhatsApp number' };
    }
    if (lead.status !== 'FRESH') return { success: false, message: 'Lead already processed' };

    try {
        const reviews = Array.isArray(lead.reviews)
            ? (lead.reviews as any[]).map(r => (typeof r === 'object' && r?.Description) ? r.Description : String(r)).filter(Boolean)
            : [];

        const aiResult = await callKieAI(lead.name, reviews, lead.category);

        if (aiResult) {
            const painPointsStr = Array.isArray(aiResult.painPoints) 
                ? aiResult.painPoints.join(', ') 
                : (typeof aiResult.painPoints === 'string' ? aiResult.painPoints : '');

            await prisma.lead.update({
                where: { id: leadId },
                data: {
                    brandData: aiResult.branding || aiResult,
                    aiAnalysis: aiResult,
                    painPoints: painPointsStr,
                    reviews: [], // COMPRESSION: Remove raw reviews after processing
                    status: 'ENRICHED',
                }
            });
            revalidatePath('/dashboard/leads');
            return { success: true, message: `${lead.name} enriched (JSON compressed)` };
        }

        return { success: false, message: 'AI returned no data' };
    } catch (error: any) {
        console.error(`[Enrichment Error] ${lead.name}:`, error);
        return { success: false, message: error.message };
    }
}

export async function batchEnrichLeads(leadIds: string[]) {
    const results = [];
    for (const id of leadIds) {
        const result = await enrichLead(id);
        results.push(result);
        await new Promise(r => setTimeout(r, 1000));
    }
    return results;
}

export async function archiveToGSheet(leadIds: string[]) {
    // NOTE: This requires Google Sheets API credentials.
    // For now, we simulate archiving by marking as FINISH and potentially 
    // export to CSV or just confirm readiness for GSheet integration.
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        // Placeholder for GSheet integration
        console.log(`[Archive]: Exporting ${leadIds.length} leads to GSheet...`);
        
        // Mark as FINISH or delete if archiving means "move out"
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
    const districtsPath = path.join(process.cwd(), 'data', 'districts', `${provinceSlug}.json`);
    
    if (!fs.existsSync(districtsPath)) return [];
    
    const provinceData = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));
    return provinceData[city] || [];
}
