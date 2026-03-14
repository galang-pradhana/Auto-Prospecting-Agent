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
    page?: number;
    pageSize?: number;
}) {
    const session = await getSession();
    if (!session) return [];

    const where: any = { userId: session.userId };

    if (filters?.status) {
        where.status = filters.status;
    } else {
        // DEFAULT: Hide ENRICHED from main leads view
        where.status = { not: 'ENRICHED' };
    }

    if (filters?.category) where.category = filters.category;
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

    if (filters?.status) {
        where.status = filters.status;
    } else {
        where.status = { not: 'ENRICHED' };
    }

    if (filters?.category) where.category = filters.category;
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

// --- Helpers ---
const cleanResponse = (str: string) => str.replace(/```json|```/g, "").trim();

function isMobileNumber(phone: string): boolean {
    if (!phone || phone === 'N/A') return false;
    const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    const waRegex = /^(\+62|62|0)8[1-9][0-9]{7,11}$/;
    return waRegex.test(cleanPhone);
}

function isValidWhatsApp(phone: string): boolean {
    return isMobileNumber(phone);
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
                
                if (!isMobileNumber(wa)) {
                    console.log(`[Skip] No valid WA for: ${name}`);
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
    "Interior Design": "Gunakan gaya bahasa kreatif, modern, dan sophisticated. Fokus pada estetika, fungsionalitas, dan transformasi ruang.",
};

const SENIOR_WEB_ARCHITECT_PROMPT = `
You are a Senior Web Architect and Art Director specializing in high-conversion websites for UMKM (SMBs).
Your goal is to transform business leads into a precise, ready-to-build project brief.

BUSINESS CONTEXT:
Business Name: [Business Name]
Category: [Category]
Pain Points: [Pain Points]

DESIGN ASSETS (Reference):
[Style Models JSON]

TASK:
1. Analyze customer pain points and provide 3 CORE RESOLUTIONS that solve these problems through a website.
2. VISUAL MATCHMAKING: Select 1 styleModel (Hero, Content, Trend) from the provided JSON that most logically addresses the pain points. Explain your choice.
3. RESOLVING IDEA: Write 1-3 sentences of a technical solution statement that speaks directly to the client's needs.
4. ASSETS: Suggest Unsplash keywords for high-impact visual assets.
5. MASTER WEBSITE PROMPT: Generate a super-detailed technical instruction (English) including Tailwind/CSS directives, HTML structure, and visual vibe based on the selected style.

OUTPUT FORMAT:
Return ONLY a valid JSON object with the following structure:
{
  "branding": { "title": "...", "tagline": "...", "description": "..." },
  "painPoints": ["Point 1", "Point 2", "Point 3"],
  "resolutions": ["Resolution 1", "Resolution 2", "Resolution 3"],
  "selectedStyle": { "id": "...", "reason": "...", "layout": "..." },
  "resolvingIdea": "...",
  "suggestedAssets": ["Asset 1 (Keywords)", "Asset 2 (Keywords)"],
  "masterWebsitePrompt": "...",
  "summary": "..."
}
`;

function cleanAIResponse(text: string): string {
    const jsonRegex = /{[\s\S]*}/;
    const match = text.match(jsonRegex);
    if (match) {
        return match[0].trim();
    }
    return text.trim();
}


export async function getStyleModels() {
    const filePath = path.join(process.cwd(), 'data', '20 STYLE MODELS.json');
    if (!fs.existsSync(filePath)) return null;
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return data.styleModels.models;
    } catch (e) {
        console.error('Failed to load style models:', e);
        return null;
    }
}

async function callKieAI(businessName: string, reviews: string[], category: string, painPointsFromUI?: string) {
    const apiKey = process.env.KIE_AI_API_KEY;
    const endpoint = "https://api.kie.ai/gemini-3-flash/v1/chat/completions";
    const reviewsText = reviews.join(' | ');
    const toneInstruction = TONE_MAP[category] || "Gunakan gaya bahasa yang sesuai dengan jenis bisnis ini, profesional namun ramah.";
    
    const styleModels = await getStyleModels();
    
    let prompt = SENIOR_WEB_ARCHITECT_PROMPT
        .replace("[Business Name]", businessName)
        .replace("[Category]", category)
        .replace("[Pain Points]", painPointsFromUI || "Analyzed from reviews below")
        .replace("[Style Models JSON]", JSON.stringify(styleModels || [], null, 2));

    if (!painPointsFromUI) {
        prompt += `\n\nDATA REVIEW TO ANALYZE:\n${reviewsText}`;
    }

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
                    text: prompt
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
        const cleaned = cleanAIResponse(fullContent);
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
                    resolutions: aiResult.resolutions || [],
                    suggestedAssets: aiResult.suggestedAssets || [],
                    masterWebsitePrompt: aiResult.masterWebsitePrompt || '',
                    resolvingIdea: aiResult.resolvingIdea || '',
                    selectedStyle: aiResult.selectedStyle?.id || null,
                    selectedLayout: aiResult.selectedStyle?.layout || null,
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
    const districtsDir = path.join(process.cwd(), 'data', 'districts');
    const districtsPath = path.join(districtsDir, `${provinceSlug}.json`);
    
    console.log(`[getDistricts] Fetching for ${province} -> ${city}`);
    
    // 1. Try Local Cache
    if (fs.existsSync(districtsPath)) {
        try {
            const provinceData = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));
            if (provinceData[city]) {
                console.log(`[getDistricts] Found ${provinceData[city].length} districts in cache for ${city}`);
                return provinceData[city];
            }
        } catch (e) {
            console.error(`[getDistricts] Error reading cache ${districtsPath}:`, e);
        }
    }

    // 2. Fallback to API
    console.log(`[getDistricts] Cache miss or missing city. Fetching from External API...`);
    try {
        const baseUrl = "https://www.emsifa.com/api-wilayah-indonesia/api";
        
        // Find Province ID
        const provRes = await fetch(`${baseUrl}/provinces.json`);
        const provinces = await provRes.json();
        const prov = provinces.find((p: any) => p.name.toLowerCase() === province.toLowerCase());
        
        if (!prov) throw new Error(`Province ${province} not found in API`);

        // Find Regency ID
        const regRes = await fetch(`${baseUrl}/regencies/${prov.id}.json`);
        const regencies = await regRes.json();
        const cityLower = city.toLowerCase();
        const reg = regencies.find((r: any) => 
            r.name.toLowerCase() === cityLower || 
            r.name.toLowerCase().includes(cityLower)
        );

        if (!reg) throw new Error(`City ${city} not found in province ${province}`);

        // Fetch Districts
        const distRes = await fetch(`${baseUrl}/districts/${reg.id}.json`);
        const districtsData = await distRes.json();
        const districts = districtsData.map((d: any) => d.name);

        // 3. Auto-Caching
        let provinceData: any = {};
        if (fs.existsSync(districtsPath)) {
            provinceData = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));
        }
        
        provinceData[city] = districts;
        
        if (!fs.existsSync(districtsDir)) {
            fs.mkdirSync(districtsDir, { recursive: true });
        }
        
        fs.writeFileSync(districtsPath, JSON.stringify(provinceData, null, 2), 'utf8');
        console.log(`[getDistricts] Fetched and cached ${districts.length} districts for ${city}`);
        
        return districts;
    } catch (error) {
        console.error(`[getDistricts] External API Fallback Failed:`, error);
        // Last resort: static list
        try {
            const { DISTRICTS_BY_CITY } = await import('@/lib/districts');
            return DISTRICTS_BY_CITY[city] || [];
        } catch (e) {
            return [];
        }
    }
}

export async function getRegionalAdvice(province: string, city: string, category: string) {
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
                        text: `Tugas: Berikan saran wilayah (kecamatan/area) yang paling potensial untuk bisnis kategori "${category}" di "${city}, ${province}".

Instruksi:
1. Analisa demografi atau karakteristik ekonomi wilayah tersebut jika memungkinkan.
2. Rekomendasikan minimal 3 kecamatan atau area spesifik.
3. Berikan alasan singkat mengapa area tersebut potensial (misal: pusat keramaian, banyak pemukiman elit, area sekolah, dll).
4. Gunakan gaya bahasa yang profesional dan informatif.

Output WAJIB JSON murni dengan struktur:
{
  "recommendations": [
    { "area": "...", "reason": "..." }
  ],
  "summary": "..."
}`
                    }]
                }],
                stream: false,
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) throw new Error(`Kie.ai error: ${response.statusText}`);
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (content) {
            return JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
        }
        return null;
    } catch (error) {
        console.error("[getRegionalAdvice Error]:", error);
        return { error: "Gagal mendapatkan saran AI." };
    }
}
export async function getTop3Styles(category: string) {
    const models = await getStyleModels();
    const archetypesPath = path.join(process.cwd(), 'data', 'archetypes.json');
    if (!models || !fs.existsSync(archetypesPath)) return [];

    const archetypes = JSON.parse(fs.readFileSync(archetypesPath, 'utf8'));
    const categoryLower = category.toLowerCase();
    
    // Find matching keywords for the category
    let keywords: string[] = [];
    for (const [key, val] of Object.entries(archetypes)) {
        if (categoryLower.includes(key.toLowerCase()) || key.toLowerCase().includes(categoryLower)) {
            keywords = val as string[];
            break;
        }
    }

    if (keywords.length === 0) return [];

    const results = models.map((m: any) => {
        let score = 0;
        const textToSearch = `${m.name} ${m.description} ${m.bestFor?.join(' ')} ${m.targetIndustries?.join(' ')}`.toLowerCase();
        
        keywords.forEach(kw => {
            if (textToSearch.includes(kw.toLowerCase())) {
                score += 10;
            }
        });

        return { id: m.id, score };
    });

    return results
        .filter((r: any) => r.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 3)
        .map((r: any) => r.id);
}

export async function getRecommendedStyles(category: string) {
    return getTop3Styles(category);
}

export async function tweakLeadStyle(leadId: string, styleId: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { success: false, message: 'Lead not found' };

    try {
        const models = await getStyleModels();
        const selectedModel = models?.find((m: any) => m.id === styleId);
        if (!selectedModel) return { success: false, message: 'Style not found' };

        const apiKey = process.env.KIE_AI_API_KEY;
        const endpoint = "https://api.kie.ai/gemini-3-flash/v1/chat/completions";
        
        const prompt = `RE-GENERATE WEBSITE PROMPT for business "${lead.name}" (Category: "${lead.category}").
        
        PAIN POINTS: ${lead.painPoints}
        SELECTED STYLE: ${selectedModel.name} (${selectedModel.description})
        ARCHETYPE PARAMETERS: ${selectedModel.characteristics ? JSON.stringify(selectedModel.characteristics) : 'Standard Premium'}
        STYLING DETAILS: ${JSON.stringify({
            colorPalette: selectedModel.colorPalette,
            typography: selectedModel.typography,
            buttonStyles: selectedModel.buttonStyles,
            cardStyles: selectedModel.cardStyles,
        })}
        
        TASK: Create a new detailed MASTER WEBSITE PROMPT (English) strictly following this new style and archetype. Include technical Tailwind/CSS instructions and HTML structure info.
        
        Output JSON: {"masterWebsitePrompt": "..."}`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) throw new Error('AI Re-generation failed');
        const aiData = await response.json();
        const contentRaw = aiData.choices[0].message.content;
        
        let content: any;
        try {
            content = JSON.parse(cleanResponse(contentRaw));
        } catch (parseError) {
            console.error('[Tweak JSON Parse Error]:', parseError, 'Raw:', contentRaw);
            // Fallback: use a basic prompt if AI fails to give valid JSON
            content = {
                masterWebsitePrompt: `[Fallback] Create a premium website for ${lead.name} using ${selectedModel.name} style. Focus on technical excellence and high conversion.`
            };
        }

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                selectedStyle: styleId,
                masterWebsitePrompt: content.masterWebsitePrompt,
            }
        });

        revalidatePath('/dashboard/leads');
        revalidatePath('/dashboard/enriched');
        
        return { success: true, masterWebsitePrompt: content.masterWebsitePrompt };
    } catch (error: any) {
        console.error('Tweak Error:', error);
        return { success: false, message: error.message || 'Tweak failed' };
    }
}

export async function saveForgeCode(leadId: string, htmlCode: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { success: false, message: 'Lead not found' };

        // Simple slug generation if missing
        let slug = lead.slug;
        if (!slug) {
            slug = lead.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            // Check uniqueness and append if needed
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

        revalidatePath('/dashboard/enriched');
        revalidatePath('/dashboard/leads');
        return { success: true, slug };
    } catch (error: any) {
        console.error('Save Forge Error:', error);
        return { success: false, message: error.message || 'Failed to save code' };
    }
}

export async function generateForgeCode(leadId: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { success: false, message: 'Lead not found' };
    if (!lead.masterWebsitePrompt) return { success: false, message: 'No master prompt found. Please enrich the lead first.' };

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
                        text: `${lead.masterWebsitePrompt}\n\nIMPORTANT: Return ONLY the full HTML code including <head> with Tailwind CDN and any necessary scripts. Do not include markdown blocks. Output MUST be valid HTML.`
                    }]
                }],
                stream: false,
            }),
        });

        if (!response.ok) throw new Error(`AI generation failed: ${response.statusText}`);
        
        const data = await response.json();
        let htmlContent = data.choices?.[0]?.message?.content || '';
        
        // Strip markdown if AI included it despite instructions
        htmlContent = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();

        return { success: true, html: htmlContent };
    } catch (error: any) {
        console.error('Generate Forge Error:', error);
        return { success: false, message: error.message || 'Generation failed' };
    }
}

