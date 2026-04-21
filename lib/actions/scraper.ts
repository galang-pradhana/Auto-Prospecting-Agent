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
    getDistance
} from '@/lib/utils';
import {
    logActivity,
    getDistricts
} from './lead';
import { callKieAI } from './ai';
import { LEAD_EVALUATION_PROMPT } from '@/lib/prompts';

// --- Helpers ---
function cleanAIResponse(res: string) {
    return res.replace(/```json|```/g, "").trim();
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

export async function stopScraper() {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        console.log("[Scraper] Force Stop Triggered by User.");
        // We use pkill for the binary name to ensure all instances are cleaned up
        execSync('pkill -f google-maps-scraper');
        return { success: true, message: 'Scraper stopped successfully.' };
    } catch (err: any) {
        // pkill returns non-zero if no process found, which is fine
        return { success: true, message: 'No active scraper process found.' };
    }
}

// --- Internal Scraper Helpers ---

async function executeScraperProcess(
    binaryPath: string, 
    queryFilePath: string, 
    radius: number, 
    onLead: (lead: any) => Promise<void>,
    lat?: string,
    lng?: string
): Promise<{ code: number | null }> {
    const pendingLeads: Promise<void>[] = [];

    return new Promise((resolve, reject) => {
        const scraperArgs = [
            "-c", "2", // Concurrency, tuned for typical CPU load
            "-json",   // Output in JSON format for parsing
            "-input", queryFilePath,
            "-results", "stdout", // Direct output to stream
        ];

        // --- Coordinate Injection ---
        if (lat && lng) {
            const geoString = `${lat},${lng}`;
            scraperArgs.push("-geo", geoString);
            
            // Precision radius: Use AI estimated radius or fall back to 4km
            const finalRadius = radius || 4000;
            scraperArgs.push("-radius", String(finalRadius));
            console.log(`[Scraper] Geo-Lock Activated: ${geoString} (Radius: ${finalRadius}m)`);
        } else {
            // Default radius for general keyword search
            scraperArgs.push("-radius", String(radius || 10000));
        }

        const scraperProcess = spawn(binaryPath, scraperArgs);

        const killTimer = setTimeout(() => {
            console.error(`[Scraper] Process stalled for 30 mins. Safety kill triggered.`);
            scraperProcess.kill('SIGKILL');
        }, 30 * 60 * 1000);

        let buffer = '';
        let idleTimer: NodeJS.Timeout;

        const resetIdleTimer = () => {
            clearTimeout(idleTimer);
            // If the Go Engine stops outputting data for 45 seconds, assume it's stuck or done
            idleTimer = setTimeout(() => {
                console.log("[Scraper System]: Idle timeout (45s). Process seems done or stuck. Forcing exit...");
                try { scraperProcess.kill('SIGKILL'); } catch(e) {}
            }, 45000);
        };

        resetIdleTimer(); // Initial start

        scraperProcess.stdout.on('data', (data) => {
            resetIdleTimer();
            buffer += data.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                // Detection for Go-Engine exit signals
                if (trimmed.includes("scrapemate exited") || trimmed.includes("scrapemate finished")) {
                    console.log("[Scraper System]: Engine signaling completion - cleaning up buffers.");
                    setTimeout(() => {
                        try {
                            process.kill(scraperProcess.pid!, 0); 
                            scraperProcess.kill('SIGKILL');
                        } catch (e) {}
                    }, 5000);
                }

                if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    try {
                        const item = JSON.parse(trimmed);
                        const p = onLead(item);
                        pendingLeads.push(p);
                    } catch (err) {
                        console.error("[Scraper] Malformed JSON ignored:", trimmed);
                    }
                } else {
                    console.log(`[Scraper System]: ${trimmed}`);
                }
            }
        });

        scraperProcess.stderr.on('data', (data) => {
            resetIdleTimer();
            const msg = data.toString().trim();
            if (msg) console.error(`[Go-Engine Error]: ${msg}`);
        });

        scraperProcess.on('error', (err) => {
            clearTimeout(killTimer);
            clearTimeout(idleTimer);
            reject(err);
        });

        scraperProcess.on('close', async (code) => {
            clearTimeout(killTimer);
            clearTimeout(idleTimer);
            console.log(`[Scraper] Binary process closed with code ${code}. Waiting for ${pendingLeads.length} pending AI tasks...`);
            
            // CRITICAL: Wait for all AI enrichment and DB insertions to finish
            await Promise.allSettled(pendingLeads);
            
            console.log(`[Scraper] All pending AI tasks completed.`);
            resolve({ code });
        });
    });
}

// Removed redundant shouldSkipLead function

import { JobRegistry } from '@/lib/jobRegistry';

// ... (code omitted due to size, relying on actual replacement targeted precisely)

// --- Main Scraper Action ---

export async function runScraper(
    category: string,
    province: string,
    city: string,
    district?: string,
    lat?: string,
    lng?: string,
    jobId?: string
) {
    const session = await getSession();
    if (!session) {
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: 'Not authenticated' });
        return { success: false, message: 'Not authenticated' };
    }
    const userId = session.userId;

    const binaryPath = path.join(process.cwd(), 'google-maps-scraper');
    
    try {
        fs.accessSync(binaryPath, fs.constants.X_OK);
    } catch (err) {
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: 'Binary not executable' });
        return { success: false, message: `[Internal Error]: Scraper binary not executable. Run chmod +x.` };
    }

    const queryFilePath = path.join(process.cwd(), `queries_${Date.now()}.txt`);

    try {
        // Construct surgical query
        const keyword = district 
            ? `${category} in ${district}, ${city}, ${province}`
            : `${category} in ${city}, ${province}`;
            
        fs.writeFileSync(queryFilePath, keyword, 'utf8');

        // 0. AI RADIUS ESTIMATION (New Optimization)
        let finalRadius = 4000; // Default fallback 4km
        try {
            console.log(`[Scraper] Estimating area radius for ${district || city}...`);
            const radiusPrompt = `Berapa estimasi radius (diameter dibagi dua) dalam satuan METER yang mencakup seluruh wilayah ${district ? 'Kecamatan ' + district : 'Kota ' + city}, ${province}? 
            Berikan estimasi moderat agar tidak terlalu luas tapi tidak terpotong. 
            Hanya berikan angka saja dalam format JSON: { "radius_meter": number }`;
            
            const aiRes = await callKieAI(radiusPrompt);
            const data = JSON.parse(aiRes.replace(/```json|```/g, "").trim());
            if (data.radius_meter) {
                finalRadius = Math.min(25000, Math.max(1000, data.radius_meter)); // Clamp between 1km - 25km
                console.log(`[Scraper] AI Estimated Radius: ${finalRadius}m`);
            }
        } catch (e) {
            console.warn("[Scraper] Radius estimation failed, using fallback 4km.");
        }

        let totalProcessed = 0;
        let totalInserted = 0;
        let aiRejectedCount = 0;

        const flushBuffer = async () => { };

        let firstItemLogged = false;

        const onLeadHandled = async (item: any) => {
            if (!firstItemLogged) {
                console.log("[Scraper] First Item Keys Received:", Object.keys(item));
                firstItemLogged = true;
            }
            totalProcessed++;
            
            if (jobId) {
                JobRegistry.updateJob(jobId, { 
                    message: `Processing leads: ${totalProcessed} scanned.`,
                    data: { processed: totalProcessed, new: totalInserted, aiRejected: aiRejectedCount }
                });
            }

            // 1. DATA EXTRACTION & INITIAL PARSING
            const leadName = item.name || item.title || item.Name || item.Title || 'N/A';
            const rawPhone = item.phone || item.wa || item.phone_number || item.Phone || '';
            const sanitizedWa = sanitizeWaNumber(rawPhone) || null;
            const website = item.website || item.Website || 'N/A';
            const mapsUrl = item.url || item.Url || null;
            const fullAddress = item.address || item.vicinity || item.Address || item.street || 'N/A';

            // 1.1 PARSE RATING & COORDINATES
            // Extensive key check for different scraper versions
            // RECENT FINDING: gosom/google-maps-scraper uses 'review_rating' and 'review_count'
            const rawRating = item.review_rating || item.total_score || item.rating || item.stars || 
                               item.Rating || item.Score || item.avg_rating || 
                               item.rating_value || item['Rating Value'] || '0';
            const finalRating = parseFloat(rawRating.toString());

            let itemLat = parseFloat(item.lat || item.latitude || item.Lat || item.Latitude || '0');
            // CRITICAL: Scraper has a typo 'longtitude' (with extra t) in some versions
            let itemLng = parseFloat(item.lng || item.longitude || item.longtitude || item.Lng || item.Longitude || '0');

            // Extraction from Maps URL (Robust regex)
            if (itemLat === 0 && mapsUrl) {
                const match = mapsUrl.match(/!3d([-.\d]+)!4d([-.\d]+)/i);
                if (match) {
                    itemLat = parseFloat(match[1]);
                    itemLng = parseFloat(match[2]);
                }
            }

            // 2. FILTER LAYER 1: RATING (3.5 - 5.0)
            // Loloskan jika 0 (unknown) agar AI yang menilai, tapi skip jika beneran rendah (1-3.4)
            if (finalRating !== 0 && (finalRating < 3.5 || finalRating > 5.0)) {
                console.log(`[Scraper] Skipping ${leadName}: Rating criteria not met (${finalRating})`);
                return;
            }
            if (finalRating === 0) {
                console.log(`[Scraper] Note: ${leadName} has no rating detected. (Known Keys: reviews=${item.review_count || 'N/A'}, keys=[${Object.keys(item).slice(0, 10).join(',')}...])`);
            }

            // 3. FILTER LAYER 2: LOCATION (RADIUS GUARD)
            const refLat = lat ? parseFloat(lat) : 0;
            const refLng = lng ? parseFloat(lng) : 0;
            
            // CRITICAL FIX: Hanya hitung jarak jika kita PUNYA koordinat pencarian (refLat/Lng != 0)
            // Kalau refLat/Lng 0, berarti getCoordinates gagal, jangan skip lead karena jarak 10.000km ke 0,0
            const hasValidSearchCenter = refLat !== 0 && refLng !== 0;
            const hasValidItemCoords = itemLat !== 0 && itemLng !== 0;
            // Gunakan null jika koordinat referensi atau item tidak valid agar bypass filter radius
            const distance = (hasValidSearchCenter && hasValidItemCoords) ? getDistance(refLat, refLng, itemLat, itemLng) : null;

            if (distance !== null && district) {
                const districtLower = district.toLowerCase();
                const addressLower = fullAddress.toLowerCase();
                const hasTextMatch = addressLower.includes(districtLower) || leadName.toLowerCase().includes(districtLower);

                // Surgical Radius for District (Max 5km, or 10km if text match found)
                const limit = hasTextMatch ? 10.0 : 5.0;

                if (distance > limit) {
                    console.log(`[Scraper] Skipping ${leadName}: Outside District boundary (${distance.toFixed(2)}km > ${limit}km)`);
                    return;
                }
                console.log(`[Scraper] Location Verified: ${leadName} at ${distance.toFixed(2)}km.`);
            } else if (distance !== null && !district) {
                // City Level (Max 25km)
                if (distance > 25.0) {
                    console.log(`[Scraper] Skipping ${leadName}: Outside City boundary (${distance.toFixed(2)}km)`);
                    return;
                }
            } else if (!hasValidSearchCenter) {
                console.log(`[Scraper] Caution: Search center coordinates missing. Skipping Radius Guard for ${leadName}.`);
            }

            // 4. FILTER LAYER 3: DEDUPLICATION & CONTACT POTENTIAL
            const existingLead = await prisma.lead.findFirst({
                where: {
                    OR: [
                        sanitizedWa ? { wa: sanitizedWa } : undefined,
                        mapsUrl ? { mapsUrl: mapsUrl } : undefined
                    ].filter(Boolean) as any
                }
            });

            if (existingLead) {
                console.log(`[Scraper] Skipping ${leadName}: Already in Database.`);
                return;
            }

            if (!sanitizedWa && website === 'N/A' && !mapsUrl) {
                console.log(`[Scraper] Skipping ${leadName}: No contact potential.`);
                return;
            }

            // 5. FILTER LAYER 4: AI ENRICHMENT (FINAL STEP)
            try {
                console.log(`[Scraper] Final Step: Analyzing ${leadName} via AI...`);
                const reviewCount = item.review_count || item.reviews_count || item.user_ratings_total || item.reviewsCount || 0;
                const finalPrompt = LEAD_EVALUATION_PROMPT
                    .replace('[name]', leadName)
                    .replace('[category]', category)
                    .replace('[city]', city)
                    .replace('[province]', province)
                    .replace('[district]', district || 'ALL')
                    .replace('[rating]', finalRating.toString())
                    .replace('[wa]', rawPhone || 'tidak ada')
                    .replace('[website]', website || 'N/A')
                    .replace('[reviewsCount]', reviewCount.toString())
                    .replace('[address]', fullAddress);

                const aiResponse = await callKieAI(finalPrompt);
                const rawJson = cleanAIResponse(aiResponse);
                let result: any;
                
                try {
                    const parsed = JSON.parse(rawJson);
                    // Handle if AI returns an array or single object
                    result = Array.isArray(parsed) ? parsed[0] : parsed;
                } catch (e) {
                    console.error("[Scraper] AI JSON Parse Error:", rawJson);
                    aiRejectedCount++;
                    return;
                }

                const decision = String(result.decision || '').toUpperCase();
                const reason = result.reason || 'No reason provided';

                if (decision === 'PROCEED') {
                    console.log(`[Scraper] AI Decision: PROCEED for ${leadName}`);
                    
                    // CRITICAL: Re-check deduplication with AI discovered WA if it different from Maps WA
                    const aiWa = result.data?.wa ? sanitizeWaNumber(result.data.wa) : null;
                    if (aiWa && aiWa !== sanitizedWa) {
                        const duplicateCheck = await prisma.lead.findUnique({
                            where: { wa: aiWa }
                        });
                        if (duplicateCheck) {
                            console.log(`[Scraper] Skipping ${leadName}: AI discovered WA (${aiWa}) already exists in DB.`);
                            return;
                        }
                    }

                    const newLead = await prisma.lead.create({
                        data: {
                            name: result.data?.name || leadName,
                            wa: result.data?.wa ? (sanitizeWaNumber(result.data.wa) || null) : sanitizedWa,
                            ig: result.data?.ig || null,
                            category,
                            province,
                            city,
                            address: fullAddress,
                            rating: finalRating,
                            website,
                            mapsUrl,
                            userId,
                            status: 'FRESH'
                        }
                    });

                    await prisma.activityLog.create({
                        data: {
                            prospectId: newLead.id,
                            action: 'SCRAPE',
                            description: 'Lead ingested from source (JSON Verified)',
                            metadata: { source: "Go-Engine", aiReason: result.reason }
                        }
                    });

                    totalInserted++;
                    if (jobId) JobRegistry.updateJob(jobId, { data: { processed: totalProcessed, new: totalInserted, aiRejected: aiRejectedCount }});
                } else {
                    console.log(`[Scraper] AI Decision: SKIP for ${leadName} (${reason})`);
                    aiRejectedCount++;
                    if (jobId) JobRegistry.updateJob(jobId, { data: { processed: totalProcessed, new: totalInserted, aiRejected: aiRejectedCount }});
                }
            } catch (err) {
                console.error(`[Scraper] AI Error for ${leadName}:`, err);
                aiRejectedCount++;
                if (jobId) JobRegistry.updateJob(jobId, { data: { processed: totalProcessed, new: totalInserted, aiRejected: aiRejectedCount }});
            }
        };

        const { code } = await executeScraperProcess(binaryPath, queryFilePath, finalRadius, onLeadHandled, lat, lng);
        // flushBuffer() is no longer strictly necessary here for valid leads due to direct insertion,
        // but kept for consistency or if any other buffering logic were to be added.
        await flushBuffer();

        if (fs.existsSync(queryFilePath)) fs.unlinkSync(queryFilePath);

        revalidatePath('/dashboard/leads');
        revalidatePath('/dashboard/scraper');
        
        if (jobId) {
            JobRegistry.updateJob(jobId, {
                status: 'COMPLETED',
                progress: 100,
                message: `Scraper finished. Valid Leads: ${totalInserted}.`,
                data: { processed: totalProcessed, new: totalInserted, aiRejected: aiRejectedCount }
            });
        }

        return { 
            success: true, 
            message: `Scraper finished. Processed: ${totalProcessed}, Valid Leads: ${totalInserted}.`,
            stats: { new: totalInserted, aiRejected: aiRejectedCount, processed: totalProcessed }
        };

    } catch (err: any) {
        if (fs.existsSync(queryFilePath)) fs.unlinkSync(queryFilePath);
        console.error("[Scraper Main Error]:", err);
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: err.message || 'Scraper failed' });
        return { success: false, message: err.message || 'Scraper failed' };
    }
}

// --- Manual Single URL Scraper ---

export async function scrapeSingleUrl(url: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    const binaryPath = path.join(process.cwd(), 'google-maps-scraper');
    try {
        fs.accessSync(binaryPath, fs.constants.X_OK);
    } catch (err) {
        return { success: false, message: `[Internal Error]: Scraper binary not executable. Run chmod +x.` };
    }

    const queryFilePath = path.join(process.cwd(), `queries_manual_${Date.now()}.txt`);
    
    try {
        fs.writeFileSync(queryFilePath, url, 'utf8');

        let parsedItem: any = null;

        const onLeadHandled = async (item: any) => {
             parsedItem = item;
             console.log("[Manual Scraper] Received Data for URL");
        };

        await executeScraperProcess(binaryPath, queryFilePath, 1000, onLeadHandled);
        
        if (fs.existsSync(queryFilePath)) fs.unlinkSync(queryFilePath);

        if (!parsedItem) {
             return { success: false, message: "Gagal mengekstrak data dari URL tersebut. Pastikan URL valid." };
        }

        const leadName = parsedItem.name || parsedItem.title || parsedItem.Name || parsedItem.Title || 'Manual Entry';
        const rawPhone = parsedItem.phone || parsedItem.wa || parsedItem.phone_number || parsedItem.Phone || '';
        const sanitizedWa = sanitizeWaNumber(rawPhone) || null;
        const website = parsedItem.website || parsedItem.web_site || parsedItem.Website || 'N/A';
        const mapsUrl = parsedItem.url || parsedItem.link || parsedItem.Url || url;
        const fullAddress = parsedItem.address || parsedItem.vicinity || parsedItem.Address || parsedItem.street || 'N/A';
        
        let category = 'Uncategorized';
        if (parsedItem.categories && parsedItem.categories.length > 0) {
            category = parsedItem.categories[0];
        } else if (parsedItem.category) {
            category = parsedItem.category;
        }

        const rawRating = parsedItem.review_rating || parsedItem.total_score || parsedItem.rating || parsedItem.stars || '0';
        const finalRating = parseFloat(rawRating.toString());

        const city = parsedItem.complete_address?.city || 'Unknown';
        const province = parsedItem.complete_address?.state || 'Unknown';

        // --- AI Filtering & Normalization Layer ---
        const reviewCount = parsedItem.review_count || parsedItem.reviews_count || parsedItem.user_ratings_total || parsedItem.reviewsCount || 0;

        const finalPrompt = LEAD_EVALUATION_PROMPT
            .replace('[name]', leadName)
            .replace('[category]', category)
            .replace('[city]', city)
            .replace('[province]', province)
            .replace('[district]', 'ALL')
            .replace('[rating]', finalRating.toString())
            .replace('[wa]', rawPhone || 'tidak ada')
            .replace('[website]', website || 'N/A')
            .replace('[reviewsCount]', reviewCount.toString())
            .replace('[address]', fullAddress);

        let aiResult: any = null;
        try {
            const aiResponse = await callKieAI(finalPrompt);
            const rawJson = cleanAIResponse(aiResponse);
            const parsed = JSON.parse(rawJson);
            aiResult = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (e) {
            console.error("[Manual Scrape] AI Error:", e);
            // Fallback to raw if AI fails? No, user wants CLEAN data. 
            // But let's allow fallback if it's just a JSON error but we have raw data.
            // Actually, let's be strict as requested.
            return { success: false, message: "AI gagal memproses dan membersihkan data ini." };
        }

        if (aiResult.decision?.toUpperCase() !== 'PROCEED') {
            return { success: false, message: `Data ditolak oleh AI. Alasan: ${aiResult.reason || 'Tidak sesuai kriteria B2B'}` };
        }

        // Use AI Cleaned Data
        const normalizedName = aiResult.name || leadName;
        const normalizedCategory = aiResult.category || category;
        const normalizedWa = aiResult.wa ? sanitizeWaNumber(aiResult.wa) : sanitizedWa;

        // Check Deduplication (Re-check with potentially normalized WA)
        const existingLead = await prisma.lead.findFirst({
            where: {
                OR: [
                    normalizedWa ? { wa: normalizedWa } : undefined,
                    mapsUrl ? { mapsUrl: mapsUrl } : undefined
                ].filter(Boolean) as any
            }
        });

        if (existingLead) {
            return { success: false, message: `Bisnis "${normalizedName}" sudah ada di dalam database.` };
        }

        const newLead = await prisma.lead.create({
            data: {
                userId: session.userId,
                name: normalizedName,
                isPro: false,
                wa: normalizedWa,
                category: normalizedCategory,
                province: province,
                city: city,
                address: fullAddress,
                website: website,
                mapsUrl: mapsUrl,
                rating: finalRating,
                status: 'FRESH',
                brandData: { sourceType: 'MANUAL_URL', aiReason: aiResult.reason }
            }
        });

        await logActivity(newLead.id, 'SCRAPE', 'Lead ingested via Manual URL Scrape (AI Verified)', { url, aiReason: aiResult.reason });

        revalidatePath('/dashboard/leads');
        
        return { success: true, lead: newLead };
    } catch (err: any) {
        if (fs.existsSync(queryFilePath)) fs.unlinkSync(queryFilePath);
        console.error("[Manual Scrape Error]:", err);
        return { success: false, message: err.message || 'Scraper failed' };
    }
}

