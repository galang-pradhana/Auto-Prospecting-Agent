'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { LeadStatus } from '@prisma/client';
import { spawn, execSync } from 'child_process';
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

    if (filters?.status && (filters.status as any) !== 'ALL STATUS') {
        where.status = filters.status;
    } else {
        // DEFAULT: Hide ENRICHED from main leads view
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

    revalidatePath('/dashboard/leads');

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

    revalidatePath('/dashboard/leads');
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

// --- Helpers ---
const cleanResponse = (str: string) => {
    let cleaned = str.replace(/```json|```/g, "").trim();
    // Fix Bad Control Characters (Surgical Fix)
    return cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, (char) => {
        if (char === '\n') return '\\n';
        if (char === '\r') return '\\r';
        if (char === '\t') return '\\t';
        return ' ';
    });
};
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

function isMobileNumber(phone: string): boolean {
    if (!phone || phone === 'N/A') return false;
    const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    const waRegex = /^(\+62|62|0)8[1-9][0-9]{7,11}$/;
    return waRegex.test(cleanPhone);
}

function isValidWhatsApp(phone: string): boolean {
    return isMobileNumber(phone);
}

function isRecentLead(reviews: any[]): boolean {
    if (!reviews || reviews.length === 0) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thirtySixMonthsAgo = new Date(today);
    thirtySixMonthsAgo.setMonth(thirtySixMonthsAgo.getMonth() - 36);

    const reviewDates = reviews
        .map(r => r.When ? new Date(r.When) : null)
        .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

    if (reviewDates.length === 0) return false;

    const latestReviewDate = new Date(Math.max(...reviewDates.map(d => d.getTime())));
    latestReviewDate.setHours(0, 0, 0, 0);
    
    return latestReviewDate >= thirtySixMonthsAgo;
}

// --- Scraper Health & Diagnostics ---

export async function checkScraperHealth() {
    const binaryPath = path.join(process.cwd(), 'google-maps-scraper');
    const health = {
        binaryExists: false,
        isExecutable: false,
        browserReady: false,
        message: 'Checking...'
    };

    // 1. Check Binary existence
    if (!fs.existsSync(binaryPath)) {
        health.message = "Binary missing. Please build or relocate it to the project root.";
        return health;
    }
    health.binaryExists = true;

    // 2. Check Permissions
    try {
        fs.accessSync(binaryPath, fs.constants.X_OK);
        health.isExecutable = true;
    } catch (err) {
        health.message = "Binary found but not executable. Click 'Fix Permissions'.";
        return health;
    }

    // 3. Check Browser readiness (run help as a dry-run)
    try {
        // We use -h to trigger a quick help output. 
        // If browsers are missing, it usually crashes with a specific Playwright error.
        execSync(`"${binaryPath}" -h`, { stdio: 'ignore' });
        health.browserReady = true;
        health.message = "Ready to Ignite.";
    } catch (err: any) {
        const errorMsg = err.stderr?.toString() || err.message || '';
        if (errorMsg.includes('Executable doesn\'t exist')) {
            health.browserReady = false;
            health.message = "Browsers missing. Run npx playwright install.";
        } else {
            // If it exits with 0 or 2 (standard help exit codes for some CLI apps), we consider it ready
            // Most scrapers exit with 0 for -h
            health.browserReady = true;
            health.message = "Ready to Ignite.";
        }
    }

    return health;
}

export async function repairScraperPermissions() {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    const binaryPath = path.join(process.cwd(), 'google-maps-scraper');
    try {
        execSync(`chmod +x "${binaryPath}"`);
        return { success: true, message: 'Permissions fixed successfully.' };
    } catch (err: any) {
        console.error("[Repair Error]:", err);
        return { success: false, message: `Failed to fix permissions: ${err.message}` };
    }
}

// --- Scraper ---

// --- Scraper Helper ---
async function executeScraperProcess(
    binaryPath: string, 
    queryFilePath: string, 
    radius: number, 
    onLead: (lead: any) => Promise<void>
): Promise<{ code: number | null }> {
    return new Promise((resolve, reject) => {
        const scraperProcess = spawn(binaryPath, [
            '-input', queryFilePath,
            '-c', '4',
            '-radius', String(radius),
            '-depth', '20',
            '-json',
            '-lang', 'id'
        ]);

        // Add 5-minute kill timer
        const killTimer = setTimeout(() => {
            console.error(`[Scraper] Process timed out after 5 mins. Killing.`);
            scraperProcess.kill('SIGKILL');
        }, 5 * 60 * 1000);

        let buffer = '';
        scraperProcess.stdout.on('data', async (data) => {
            buffer += data.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last partial line in buffer

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // Only attempt JSON.parse if the line starts with { and ends with }
                if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    try {
                        const item = JSON.parse(trimmed);
                        await onLead(item);
                    } catch (err) {
                        console.error("[Scraper] Malformed JSON ignored:", trimmed);
                    }
                } else {
                    // It's a system log or progress bar
                    console.log(`[Scraper System]: ${trimmed}`);
                }
            }
        });

        scraperProcess.stderr.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg) console.error(`[Go-Engine Error]: ${msg}`);
        });

        scraperProcess.on('error', (err) => {
            clearTimeout(killTimer);
            reject(err);
        });

        scraperProcess.on('close', (code) => {
            clearTimeout(killTimer);
            resolve({ code });
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

    const binaryPath = path.join(process.cwd(), 'google-maps-scraper');
    
    // Pre-flight check for execution rights
    try {
        fs.accessSync(binaryPath, fs.constants.X_OK);
    } catch (err) {
        console.error(`[Internal Error]: Scraper binary not executable at ${binaryPath}. Run chmod +x..`);
        return { success: false, message: `[Internal Error]: Scraper binary not executable. Run chmod +x.` };
    }

    const queryFilePath = path.join(process.cwd(), `queries_${Date.now()}.txt`);
    console.log(`[Go-Engine]: Starting stream-batch ingestion. Target: "${district || city}"`);

    try {
        let queries = [keyword];
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

        let leadsBuffer: any[] = [];
        const BATCH_SIZE = 50;
        let totalProcessed = 0;
        let totalInserted = 0;
        let aiRejectedCount = 0;

        const flushBuffer = async () => {
            if (leadsBuffer.length === 0) return;
            try {
                // Batch create and return created records
                const createdLeads = await (prisma.lead as any).createManyAndReturn({
                    data: leadsBuffer,
                    skipDuplicates: true
                });
                
                totalInserted += createdLeads.length;
                console.log(`[Database] Batch insert of ${leadsBuffer.length} leads successful. New: ${createdLeads.length}`);
                
                if (createdLeads.length > 0) {
                    const logData = createdLeads.map((lead: any) => ({
                        leadId: lead.id,
                        action: 'SCRAPE',
                        description: 'Lead ingested from source',
                        metadata: { source: "Go-Engine" }
                    }));
                    await prisma.activityLog.createMany({ data: logData });
                }
                
                leadsBuffer = [];
            } catch (err) {
                console.error("[Batch Error]:", err);
                leadsBuffer = [];
            }
        };

        const onLeadHandled = async (item: any) => {
            totalProcessed++;
            const wa = item.phone || 'N/A';
            const name = item.title || 'N/A';
            const website = item.website || 'N/A';
            const rating = item.review_rating || 0;
            const reviews = item.user_reviews || [];

            // SURGICAL FILTERS
            if (!isMobileNumber(wa) || rating < 4.0 || !isRecentLead(reviews)) {
                aiRejectedCount++;
                return;
            }

            // Professional Suffix Skip
            if (website !== 'N/A' && website.trim() !== '') {
                const professionalSuffixes = ['gov', 'edu', 'org', 'mil'];
                if (professionalSuffixes.some(s => website.toLowerCase().endsWith(`.${s}`))) {
                    aiRejectedCount++;
                    return;
                }
            }

            // Lead data for Prisma
            leadsBuffer.push({
                name, wa,
                category: item.category || category || 'N/A',
                province: province || '', city: city || '',
                address: item.address || 'N/A',
                rating: item.review_rating || 0,
                website: item.website || 'N/A',
                reviews: item.user_reviews || [],
                status: 'FRESH',
                userId: session.userId,
            });

            if (leadsBuffer.length >= BATCH_SIZE) {
                await flushBuffer();
            }
        };

        const { code } = await executeScraperProcess(binaryPath, queryFilePath, radius, onLeadHandled);

        // Final flush
        await flushBuffer();

        if (fs.existsSync(queryFilePath)) fs.unlinkSync(queryFilePath);

        revalidatePath('/dashboard/leads');
        revalidatePath('/dashboard/scraper');

        return { 
            success: true, 
            message: `Scraper finished. Processed ${totalProcessed}, Added ${totalInserted} new leads.`,
            stats: { new: totalInserted, aiRejected: aiRejectedCount, processed: totalProcessed }
        };

    } catch (err: any) {
        if (fs.existsSync(queryFilePath)) fs.unlinkSync(queryFilePath);
        console.error("[Scraper Main Error]:", err);
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

IMPORTANT: You MUST return a valid JSON object. Ensure all newlines within string values are escaped as '\\n'.
`;

function cleanAIResponse(text: string): string {
    // 1. Remove Markdown backticks if present
    let raw = text.replace(/```json|```/g, "").trim();
    
    // 2. Fix Bad Control Characters (Surgical Fix)
    // This regex finds unescaped newlines, tabs, and other control chars inside the string
    return raw.replace(/[\u0000-\u001F\u007F-\u009F]/g, (char) => {
        if (char === '\n') return '\\n';
        if (char === '\r') return '\\r';
        if (char === '\t') return '\\t';
        return ' ';
    });
}


// --- Style Metadata Cache ---
let styleModelsCache: any = null;

export async function getStyleModels() {
    if (styleModelsCache) return styleModelsCache;

    const filePath = path.join(process.cwd(), 'data', '20 STYLE MODELS.json');
    if (!fs.existsSync(filePath)) return null;
    try {
        const fileContent = await fsPromises.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        styleModelsCache = data.styleModels.models;
        return styleModelsCache;
    } catch (e) {
        console.error('Failed to load style models:', e);
        return null;
    }
}

export async function getStyleDNA(styleId: string) {
    const models = await getStyleModels();
    if (!models) return null;

    let model = models.find((m: any) => m.id === styleId);
    
    // Fallback to clean-minimal if not found
    if (!model) {
        model = models.find((m: any) => m.id === 'clean-minimal');
    }

    if (!model) return null;

    return {
        colorPalette: model.colorPalette,
        typography: model.typography,
        characteristics: model.characteristics
    };
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
        const sanitized = cleanAIResponse(fullContent);
        try {
            const parsed = JSON.parse(sanitized);
            return parsed;
        } catch (parseError) {
            console.error('[Surgical Error] JSON Parse failed after sanitization:', parseError, 'Raw Content:', fullContent);
            return null;
        }
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

        const creditBefore = await getKieCredit();
        const aiResult = await callKieAI(lead.name, reviews, lead.category);
        const creditAfter = await getKieCredit();

        const beforeVal = parseFloat(creditBefore) || 0;
        const afterVal = parseFloat(creditAfter) || 0;
        const cost = Math.max(0, beforeVal - afterVal).toFixed(4);

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

            // Log ENRICH
            await logActivity(leadId, 'ENRICH', `Enriched using Gemini-3-Flash`, { 
                model: "Gemini-3-Flash",
                style: aiResult.selectedStyle?.id || 'standard',
                credits_used: cost
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

        const creditBefore = await getKieCredit();
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
        const creditAfter = await getKieCredit();

        const beforeVal = parseFloat(creditBefore) || 0;
        const afterVal = parseFloat(creditAfter) || 0;
        const cost = Math.max(0, beforeVal - afterVal).toFixed(4);
        const contentRaw = aiData.choices?.[0]?.message?.content || '';
        const sanitizedContent = cleanAIResponse(contentRaw);
        
        let content: any;
        try {
            content = JSON.parse(sanitizedContent);
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

        // Log TWEAK
        await logActivity(leadId, 'TWEAK', `Style tweaked to ${selectedModel.name}`, { 
            styleId,
            credits_used: cost,
            model: "Gemini-3-Flash"
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

        // Log LIVE
        await logActivity(leadId, 'LIVE', `Website published to ${slug}`, { slug });

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
        const fullAddress = `${lead.address}, ${lead.city}, ${lead.province}`;
        const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`;

        const businessContext = `
[STRICT BUSINESS DATA]
- Brand Name: ${lead.name}
- Category: ${lead.category}
- Real Address: ${fullAddress}
- WhatsApp Link: https://wa.me/${lead.wa}
- Core Pain Points to Solve: ${lead.painPoints}
- Winning Solution: ${lead.resolvingIdea}
- Google Maps Embed: <iframe width="100%" height="400" frameborder="0" src="${mapUrl}" allowfullscreen></iframe>
`;

        // Premium UI Logic
        const categoryLower = lead.category.toLowerCase();
        const unsplashKeyword = categoryLower.replace(/\s+/g, '-');
        const designTheme = ["photography", "design", "creative", "tech", "studio"].some(k => categoryLower.includes(k)) 
            ? "Premium Dark / Aesthetic" 
            : "Clean Professional / Minimalist";

        const styleDNA = await getStyleDNA(lead.selectedStyle || 'clean-minimal');
        const designSpecs = styleDNA ? `
[DESIGN DNA SPECIFICATIONS]
- Primary Color: ${styleDNA.colorPalette.primary}
- Background: ${styleDNA.colorPalette.background}
- Text Color: ${styleDNA.colorPalette.text}
- Heading Font: ${styleDNA.typography.headingFont}
- Body Font: ${styleDNA.typography.bodyFont}
- Visual Weight: ${styleDNA.characteristics.visualWeight}
` : '';

        const creditBefore = await getKieCredit();
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
                        text: `MANDATORY: Every visible text element on the website (Navbar, Hero, Buttons, Service Cards, Footer) MUST be in high-quality Bahasa Indonesia. No English allowed on the frontend.

${businessContext}

${lead.masterWebsitePrompt}

ARCHITECTURE:
- Output must be a standalone index.html.
- Embed all CSS (Tailwind CDN) and JS within the file.

${designSpecs}

PREMIUM VISUALS:
- DESIGN COMPLIANCE: You MUST apply the provided [DESIGN DNA SPECIFICATIONS] using Tailwind CSS configuration. Use the Primary Color for buttons and accents, and ensure the Typography matches the fonts provided via Google Fonts CDN imports.
- Theme: Apply the "${designTheme}" theme using sophisticated color palettes.
- Layout: Use Bento Grid structures for services/features.
- Effects: Apply Glassmorphism (backdrop-blur) on navbars and cards.
- Typography: Use Inter or Poppins from Google Fonts.
- Dynamic Images: Use Unsplash URLs based on the category (e.g., https://images.unsplash.com/photo-...?auto=format&fit=crop&q=80&w=1200&q=${unsplashKeyword}).

OUTREACH OPTIMIZATION:
- CTA buttons must be persuasive (e.g., "Konsultasi Gratis Sekarang" atau "Amankan Slot Anda") and link to the real WhatsApp URL.
- Persistent WhatsApp FAB: You MUST include a Floating Action Button (FAB) in the bottom right corner.
    - URL: https://wa.me/${lead.wa}?text=${encodeURIComponent("Halo, saya tertarik dengan penawaran website untuk " + lead.name)}
    - Styling: Use WhatsApp Green (#25D366), absolute/fixed positioning, a subtle 'pulse' animation to draw attention, and the highest z-index.
    - Label: Use Bahasa Indonesia like "Tanya Lewat WhatsApp" or "Konsultasi Sekarang".

IMPORTANT: Return ONLY the full standalone HTML code. No markdown backticks. No explanations.`
                    }]
                }],
                stream: false,
            }),
        });

        if (!response.ok) throw new Error(`AI generation failed: ${response.statusText}`);
        
        const rawResponse = await response.text();
        const sanitizedResponse = rawResponse.replace(/[\u0000-\u001F\u007F-\u009F]/g, (char) => {
            if (char === '\n') return '\\n';
            if (char === '\r') return '\\r';
            if (char === '\t') return '\\t';
            return ' ';
        });
        
        let data;
        try {
            data = JSON.parse(sanitizedResponse);
        } catch(e) {
            data = JSON.parse(rawResponse);
        }

        const creditAfter = await getKieCredit();

        const beforeVal = parseFloat(creditBefore) || 0;
        const afterVal = parseFloat(creditAfter) || 0;
        const cost = Math.max(0, beforeVal - afterVal).toFixed(4);

        let htmlContent = data.choices?.[0]?.message?.content || '';
        
        // Ensure clean HTML without markdown backticks
        htmlContent = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();

        // Log FORGE (since generateForgeCode is the primary AI action for build)
        await logActivity(leadId, 'FORGE', `Website code generated via AI`, { 
            credits_used: cost,
            model: "Gemini-3-Flash"
        });

        return { success: true, html: htmlContent };
    } catch (error: any) {
        console.error('Generate Forge Error:', error);
        return { success: false, message: error.message || 'Generation failed' };
    }
}

// --- WhatsApp Template Management ---

export async function getWaTemplates() {
    return prisma.waTemplate.findMany({
        orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' }
        ]
    });
}

export async function saveWaTemplate(id: string | null, title: string, category: string, content: string, isDefault: boolean) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        if (isDefault) {
            await prisma.waTemplate.updateMany({
                where: { isDefault: true },
                data: { isDefault: false }
            });
        }

        if (id) {
            await prisma.waTemplate.update({
                where: { id },
                data: { title, category: category || null, content, isDefault }
            });
        } else {
            // First template is default automatically if there are no others
            const count = await prisma.waTemplate.count();
            const actualIsDefault = count === 0 ? true : isDefault;

            await prisma.waTemplate.create({
                data: { title, category: category || null, content, isDefault: actualIsDefault }
            });
        }

        revalidatePath('/dashboard/settings/wa-templates');
        revalidatePath('/dashboard/settings');
        return { success: true };
    } catch (error) {
        console.error('Save WA Template error:', error);
        return { success: false, message: 'Failed to save template' };
    }
}

export async function setDefaultWaTemplate(id: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.$transaction([
            prisma.waTemplate.updateMany({
                where: { isDefault: true },
                data: { isDefault: false }
            }),
            prisma.waTemplate.update({
                where: { id },
                data: { isDefault: true }
            })
        ]);
        revalidatePath('/dashboard/settings/wa-templates');
        revalidatePath('/dashboard/settings');
        return { success: true };
    } catch (error) {
        console.error('Set Default WA Template error:', error);
        return { success: false, message: 'Failed to set default template' };
    }
}

export async function deleteWaTemplate(id: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.waTemplate.delete({ where: { id } });
        
        // If we deleted the default template, make the first one default
        const remaining = await prisma.waTemplate.findFirst({
            orderBy: { createdAt: 'desc' }
        });
        if (remaining) {
            const hasDefault = await prisma.waTemplate.findFirst({ where: { isDefault: true } });
            if (!hasDefault) {
                await prisma.waTemplate.update({
                    where: { id: remaining.id },
                    data: { isDefault: true }
                });
            }
        }

        revalidatePath('/dashboard/settings/wa-templates');
        revalidatePath('/dashboard/settings');
        return { success: true };
    } catch (error) {
        console.error('Delete WA Template error:', error);
        return { success: false, message: 'Failed to delete template' };
    }
}

export async function generateWaTemplateDraft(category: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        const apiKey = process.env.KIE_AI_API_KEY;
        const endpoint = "https://api.kie.ai/gemini-3-flash/v1/chat/completions";
        
        const prompt = `You are a Master Sales Copywriter. Generate a WhatsApp template for a business in the category: "${category}".
        
        Use these 6 elements in the message:
        1. Header: Use Emojis and Bold Headlines.
        2. Personalized Greeting: Must include {{name}} and a polite apology for the interruption.
        3. Content Flow: Address the {{pain_points}} first, then offer {{idea}} as the solution.
        4. Specific Offer: Use concrete numbers (e.g., 'Hemat Rp XXX' or 'Diskon X%').
        5. Scarcity: Add urgency (e.g., 'Hanya untuk 3 orang pertama' or 'Berakhir jam 23.59').
        6. Clear CTA: Use a direct instruction to click the link {{link}}.

        Constraints:
        - Language MUST be 100% Indonesian.
        - Tone: Professional yet persuasive (Ramah & Solutif).
        - Use variables as they are: {{name}}, {{pain_points}}, {{idea}}, {{link}}.
        - Return ONLY the text of the message (no introduction, no explanation).`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
                stream: false
            }),
        });

        if (response.ok) {
            const data = await response.json();
            const draft = data.choices?.[0]?.message?.content || '';
            return { success: true, draft };
        } else {
            return { success: false, message: 'AI Generation failed' };
        }
    } catch (error) {
        console.error('Generate WA Template Draft error:', error);
        return { success: false, message: 'Server error' };
    }
}

// --- Dynamic WA Link Generation ---

export async function generateWaLink(leadId: string, templateId?: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { success: false, message: 'Lead not found' };

        let template = null;
        
        if (templateId) {
            template = await prisma.waTemplate.findUnique({ where: { id: templateId } });
        }

        if (!template) {
            template = await prisma.waTemplate.findFirst({
                where: { category: lead.category }
            });
        }

        if (!template) {
            template = await prisma.waTemplate.findFirst({
                where: { isDefault: true }
            });
        }

        let message = '';

        if (template) {
            message = template.content
                .replace(/{{name}}/g, lead.name)
                .replace(/{{category}}/g, lead.category)
                .replace(/{{idea}}/g, lead.resolvingIdea || 'solusi digital')
                .replace(/{{pain_points}}/g, lead.painPoints || 'kebutuhan bisnis')
                .replace(/{{link}}/g, `${process.env.NEXT_PUBLIC_APP_URL || 'https://auto-prospecting.vercel.app'}/${lead.slug || ''}`);
        } else {
            // AI Fallback (Gemini 3 Flash)
            const apiKey = process.env.KIE_AI_API_KEY;
            const endpoint = "https://api.kie.ai/gemini-3-flash/v1/chat/completions";
            const prompt = `Generate a highly personalized "Hook Message" for a WhatsApp outreach. 
            Business: ${lead.name}
            Category: ${lead.category}
            Proposed Solution: ${lead.resolvingIdea}
            Website Draft: ${process.env.NEXT_PUBLIC_APP_URL || 'https://auto-prospecting.vercel.app'}/${lead.slug || ''}
            
            Persona: Friendly, professional, and helpful (Ramah, Terpercaya, dan Solutif).
            Language: Professional Bahasa Indonesia.
            
            Output: The message only (no quotes, no intro).`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
                    stream: false
                }),
            });

            if (response.ok) {
                const data = await response.json();
                message = data.choices?.[0]?.message?.content || 'Halo!';
            } else {
                message = `Halo ${lead.name}, saya punya solusi digital untuk ${lead.category} Anda.`;
            }
        }

        const waUrl = `https://wa.me/${lead.wa}?text=${encodeURIComponent(message)}`;
        return { success: true, url: waUrl, message };
    } catch (error) {
        console.error('Generate WA Link error:', error);
        return { success: false, message: 'Failed to generate link' };
    }
}

// --- User Settings & AI Configuration ---

export async function getUserSettings() {
    const session = await getSession();
    if (!session) return null;

    return prisma.user.findUnique({
        where: { id: session.userId },
        select: {
            kieAiApiKey: true,
            byocMode: true,
        }
    });
}

export async function updateUserSettings(data: { kieAiApiKey?: string, byocMode?: boolean }) {
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
        console.error('Update User Settings error:', error);
        return { success: false, message: 'Failed to update settings' };
    }
}

export async function getEstimatedUsage() {
    const session = await getSession();
    if (!session) return 0;

    const logs = await prisma.activityLog.findMany({
        where: {
            lead: { userId: session.userId },
            action: { in: ['ENRICH', 'FORGE', 'TWEAK'] }
        },
        select: { metadata: true }
    });

    let totalUsage = 0;
    logs.forEach(log => {
        if (log.metadata && typeof log.metadata === 'object') {
            const meta = log.metadata as any;
            if (meta.credits_used) {
                totalUsage += parseFloat(meta.credits_used) || 0;
            }
        }
    });

    return totalUsage.toFixed(4);
}

