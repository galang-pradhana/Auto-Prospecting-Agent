'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession, getCurrentUser } from '@/lib/auth';
import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { 
    isMobileNumber, 
    isRecentLead, 
    sanitizeWaNumber, 
} from '@/lib/utils';
import {
    logActivity,
    getDistricts
} from './lead';
import { LEAD_EVALUATION_PROMPT } from '@/lib/prompts';

// --- Scraper Health & Diagnostics ---

export async function checkScraperHealth() {
    const binaryPath = path.join(process.cwd(), 'google-maps-scraper');
    const health = {
        binaryExists: false,
        isExecutable: false,
        browserReady: false,
        message: 'Checking...'
    };

    if (!fs.existsSync(binaryPath)) {
        health.message = "Binary missing. Please build or relocate it to the project root.";
        return health;
    }
    health.binaryExists = true;

    try {
        fs.accessSync(binaryPath, fs.constants.X_OK);
        health.isExecutable = true;
    } catch (err) {
        health.message = "Binary found but not executable. Click 'Fix Permissions'.";
        return health;
    }

    try {
        execSync(`"${binaryPath}" -h`, { stdio: 'ignore' });
        health.browserReady = true;
        health.message = "Ready to Ignite.";
    } catch (err: any) {
        const errorMsg = err.stderr?.toString() || err.message || '';
        if (errorMsg.includes('Executable doesn\'t exist')) {
            health.browserReady = false;
            health.message = "Browsers missing. Run npx playwright install.";
        } else {
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

// --- Internal Scraper Helpers ---

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

        const killTimer = setTimeout(() => {
            console.error(`[Scraper] Process stalled for 30 mins. Safety kill triggered.`);
            scraperProcess.kill('SIGKILL');
        }, 30 * 60 * 1000);

        let buffer = '';
        scraperProcess.stdout.on('data', async (data) => {
            buffer += data.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                // Detection for Go-Engine exit signals
                if (trimmed.includes("scrapemate exited")) {
                    console.log("[Scraper System]: Engine signaling completion - cleaning up buffers.");
                }

                if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    try {
                        const item = JSON.parse(trimmed);
                        await onLead(item);
                    } catch (err) {
                        console.error("[Scraper] Malformed JSON ignored:", trimmed);
                    }
                } else {
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

async function shouldSkipLead(name: string, website: string): Promise<boolean> {
    const user = await getCurrentUser();
    const apiKey = user?.kieAiApiKey || process.env.KIE_AI_API_KEY;
    const endpoint = "https://api.kie.ai/gemini-3-flash/v1/chat/completions";

    try {
        const prompt = LEAD_EVALUATION_PROMPT
            .replace("[name]", name)
            .replace("[website]", website);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [{
                    role: "user",
                    content: [{ type: "text", text: prompt }]
                }],
                stream: false,
                response_format: { type: "json_object" }
            }),
            signal: AbortSignal.timeout(60000)
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

// --- Main Scraper Action ---

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
    const userId = session.userId;

    const binaryPath = path.join(process.cwd(), 'google-maps-scraper');
    
    try {
        fs.accessSync(binaryPath, fs.constants.X_OK);
    } catch (err) {
        return { success: false, message: `[Internal Error]: Scraper binary not executable. Run chmod +x.` };
    }

    const queryFilePath = path.join(process.cwd(), `queries_${Date.now()}.txt`);

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
        const BATCH_SIZE = 15; // Incremental saving threshold
        let totalProcessed = 0;
        let totalInserted = 0;
        let sandboxInserted = 0;
        let aiRejectedCount = 0;

        const flushBuffer = async () => {
            if (leadsBuffer.length === 0) return;
            console.log(`[DB Save] Attempting to save batch of ${leadsBuffer.length} items...`);
            
            const validLeads: any[] = [];
            const sandboxLeads: any[] = [];

            for (const { item, leadData } of leadsBuffer) {
                const wa = item.phone || 'N/A';
                if (!isMobileNumber(wa)) {
                    // Masukkan ke Sandbox
                    sandboxLeads.push({
                        name: item.title || 'N/A',
                        wa: wa, // Simpan raw WA untuk di-review
                        category: category || item.category || 'N/A',
                        address: item.address || 'N/A',
                        city: city || '',
                        mapsUrl: item.url || null,
                        rawSource: { 
                            ...item, 
                            kie_ai_sync: {
                                needs_evaluation: true,
                                model: "BYOC-EVALUATOR",
                                timestamp: new Date().toISOString()
                            }
                        }, // JSON mentah + BYOC Sync pipe
                        reason: "Invalid/Missing WhatsApp",
                        userId: userId
                    });
                } else {
                    validLeads.push(leadData);
                }
            }

            try {
                if (validLeads.length > 0) {
                    console.log(`[Debug] Data found for insertion: ${validLeads.length}`);
                    const createdLeads = await (prisma.lead as any).createManyAndReturn({
                        data: validLeads,
                        skipDuplicates: true
                    }).catch((e: any) => {
                        console.error("[Critical Error] Lead createMany failed:", e.message);
                        throw e;
                    });
                    
                    totalInserted += createdLeads.length;
                    
                    if (createdLeads.length > 0) {
                        const logData = createdLeads.map((lead: any) => ({
                            leadId: lead.id,
                            action: 'SCRAPE',
                            description: 'Lead ingested from source',
                            metadata: { source: "Go-Engine" }
                        }));
                        await prisma.activityLog.createMany({ data: logData });
                    }
                }

                if (sandboxLeads.length > 0) {
                    console.log(`[Debug] Sandbox data found for insertion: ${sandboxLeads.length}`);
                    const createdSandbox = await prisma.leadSandbox.createMany({
                        data: sandboxLeads,
                        // Menghindari duplicate error manual di sandbox
                        // Di skipDuplicates prisma v5 bisa saja tidak didukung semua engine,
                        // tp cukup aman di PostgreSQL dengan unique index.
                        // Sayangnya LeadSandbox blm ada unique constraint untuk bulk ignore. 
                        // Kita biarkan append saja dulu as design.
                    }).catch((e) => {
                        console.error("[Critical Error] LeadSandbox createMany failed:", e.message);
                        throw e;
                    });
                    sandboxInserted += createdSandbox.count;
                }

                leadsBuffer = [];
            } catch (err: any) {
                console.error("[Batch Sync Error]:", err.message || err);
                // Leads stay in buffer for retry or are cleared to prevent infinite loops?
                // For now, clearing to prevent blockage, but logging is key.
                leadsBuffer = [];
            }
        };

        const onLeadHandled = async (item: any) => {
            totalProcessed++;
            const rating = item.review_rating || 0;
            const reviews = item.user_reviews || [];

            // Tetap tolak kalau rating terlalu rendah atau data kurang baru
            if (rating < 4.0 || !isRecentLead(reviews)) {
                aiRejectedCount++;
                return;
            }

            if (item.website && item.website !== 'N/A' && item.website.trim() !== '') {
                const professionalSuffixes = ['gov', 'edu', 'org', 'mil'];
                if (professionalSuffixes.some(s => item.website.toLowerCase().endsWith(`.${s}`))) {
                    aiRejectedCount++;
                    return;
                }
            }

            leadsBuffer.push({
                item, // Simpan item mentah untuk sandbox/validasi nanti
                leadData: {
                    name: item.title || 'N/A', 
                    wa: sanitizeWaNumber(item.phone || 'N/A'),
                    category: category || item.category || 'N/A',
                    province: province || '', city: city || '',
                    address: item.address || 'N/A',
                    rating: item.review_rating || 0,
                    website: item.website || 'N/A',
                    mapsUrl: item.url || null,
                    reviews: item.user_reviews || [],
                    status: 'FRESH',
                    userId: userId,
                }
            });

            if (leadsBuffer.length >= BATCH_SIZE) {
                await flushBuffer();
            }
        };

        const { code } = await executeScraperProcess(binaryPath, queryFilePath, radius, onLeadHandled);
        await flushBuffer();

        if (fs.existsSync(queryFilePath)) fs.unlinkSync(queryFilePath);

        revalidatePath('/dashboard/leads');
        revalidatePath('/dashboard/scraper');

        return { 
            success: true, 
            message: `Scraper finished. Processed: ${totalProcessed}, Valid Leads: ${totalInserted}, Sandbox Check: ${sandboxInserted}.`,
            stats: { new: totalInserted, sandbox: sandboxInserted, aiRejected: aiRejectedCount, processed: totalProcessed }
        };

    } catch (err: any) {
        if (fs.existsSync(queryFilePath)) fs.unlinkSync(queryFilePath);
        console.error("[Scraper Main Error]:", err);
        return { success: false, message: err.message || 'Scraper failed' };
    }
}
