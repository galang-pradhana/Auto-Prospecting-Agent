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
import { callAI } from './ai';
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
            "-c", "2", // Concurrency back to 2 for stability
            "-json",
            "-input", queryFilePath,
            "-results", "stdout",
            "-lang", "id",
            "--extra-reviews",
            "-depth", "5"         // Depth back to 5 for thorough scraping
        ];

        // --- Coordinate Injection ---
        if (lat && lng) {
            const geoString = `${lat},${lng}`;
            scraperArgs.push("-geo", geoString);
            scraperArgs.push("-zoom", "14"); // Surgical zoom for kecamatan
            
            // PRIORITY: Use radius from AI estimation (passed as argument)
            // Fallback to 4000 (4km) only if radius is not provided
            const searchRadius = radius && radius > 0 ? radius : 4000;
            scraperArgs.push("-radius", String(searchRadius));
            scraperArgs.push("-exit-on-inactivity", "5m"); 
            console.log(`[Scraper] Surgical Geo-Lock: ${geoString} (Radius: ${searchRadius}m, Zoom: 14)`);
        } else {
            const searchRadius = radius && radius > 0 ? radius : 10000;
            scraperArgs.push("-radius", String(searchRadius));
            scraperArgs.push("-exit-on-inactivity", "5m");
        }

        const scraperProcess = spawn(binaryPath, scraperArgs);

        const killTimer = setTimeout(() => {
            console.error(`[Scraper] Process stalled for 30 mins. Safety kill triggered.`);
            scraperProcess.kill('SIGKILL');
        }, 30 * 60 * 1000);

        let buffer = '';
        let idleTimer: NodeJS.Timeout;

        // --- Concurrency Control for AI Calls ---
        const CONCURRENCY_LIMIT = 2;
        let activeCount = 0;
        const queue: (() => void)[] = [];

        const runWithLimit = async (fn: () => Promise<void>) => {
            if (activeCount >= CONCURRENCY_LIMIT) {
                await new Promise<void>(resolve => queue.push(resolve));
            }
            activeCount++;
            try {
                await fn();
            } finally {
                activeCount--;
                if (queue.length > 0) {
                    const next = queue.shift();
                    if (next) next();
                }
            }
        };

        const resetIdleTimer = () => {
            clearTimeout(idleTimer);
            // If the Go Engine stops outputting data for 60 seconds, assume it's stuck or done
            idleTimer = setTimeout(() => {
                console.log("[Scraper System]: Idle timeout (60s). Process seems done or stuck. Forcing exit...");
                try { scraperProcess.kill('SIGKILL'); } catch(e) {}
            }, 60000);
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
                    }, 10000); // 10s buffer
                }

                if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    try {
                        const item = JSON.parse(trimmed);
                        // Process with limit
                        const p = runWithLimit(() => onLead(item));
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

export interface ScraperFilters {
    minRating: number;
    maxRating: number;
    minReviews: number;
    requireNoWebsite: boolean;
    requirePhone: boolean;
}

export async function runScraper(
    category: string,
    province: string,
    city: string,
    district?: string,
    lat?: string,
    lng?: string,
    jobId?: string,
    filters?: ScraperFilters
) {
    const session = await getSession();
    if (!session) {
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: 'Not authenticated' });
        return { success: false, message: 'Not authenticated' };
    }
    const userId = session.userId;

    const activeFilters: ScraperFilters = {
        minRating: filters?.minRating ?? 3.5,
        maxRating: filters?.maxRating ?? 5.0,
        minReviews: filters?.minReviews ?? 5,
        requireNoWebsite: filters?.requireNoWebsite ?? true,
        requirePhone: filters?.requirePhone ?? false,
    };

    const binaryPath = path.join(process.cwd(), 'google-maps-scraper');
    
    try {
        fs.accessSync(binaryPath, fs.constants.X_OK);
    } catch (err) {
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: 'Binary not executable' });
        return { success: false, message: `[Internal Error]: Scraper binary not executable. Run chmod +x.` };
    }

    const queryFilePath = path.join(process.cwd(), `queries_${Date.now()}.txt`);

    try {
        // --- 5-VARIANT SEARCH STRATEGY ---
        const loc = district ? `${district}, ${city}` : city;
        const sub = category.toLowerCase(); // Assume 'category' is specific like 'Toko Kain'
        const main = province; // Use province or a parent category if available

        const variants = [
            `${sub} ${category} in ${loc}`,                // Variant 1: Surgical
            `${sub} near ${loc}`,                         // Variant 2: Proximity
            `${category} ${sub} ${district || city}`,      // Variant 3: Tactical
            `${sub} ${city} ${district || ''}`,           // Variant 4: Local
            `${sub} store in ${loc}`                       // Variant 5: English fallback
        ];
        
        const queryContent = variants.map(v => v.trim()).join('\n');
        fs.writeFileSync(queryFilePath, queryContent, 'utf8');
        console.log(`[Scraper] Generated 5 query variants for ${sub} in ${loc}`);

        // 0. AI RADIUS ESTIMATION (New Optimization)
        let finalRadius = 4000; // Default fallback 4km
        try {
            console.log(`[Scraper] Estimating area radius for ${district || city}...`);
            const radiusPrompt = `Berapa estimasi radius (diameter dibagi dua) dalam satuan METER yang mencakup seluruh wilayah ${district ? 'Kecamatan ' + district : 'Kota ' + city}, ${province}? 
            Berikan estimasi moderat agar tidak terlalu luas tapi tidak terpotong. 
            Hanya berikan angka saja dalam format JSON: { "radius_meter": number }`;
            
            const aiRes = await callAI(radiusPrompt, 'fast');
            const data = JSON.parse(aiRes.replace(/```json|```/g, "").trim());
            if (data.radius_meter) {
                finalRadius = Math.min(25000, Math.max(1000, data.radius_meter)); // Clamp between 1km - 25km
                console.log(`[Scraper] AI Estimated Radius: ${finalRadius}m`);
            }
        } catch (e) {
            console.warn("[Scraper] Radius estimation failed, using fallback 4km.");
        }

        let totalProcessed = 0;   // Total dari Google Maps (Extracted)
        let totalInserted = 0;    // Berhasil masuk DB (New Leads)
        let totalScanned = 0;     // Counter untuk UI

        const flushBuffer = async () => { };

        let firstItemLogged = false;

        const seenCids = new Set<string>();
        const seenTitles = new Set<string>();

        const onLeadHandled = async (item: any) => {
            const cid = item.cid || item.data_id || '';
            const leadName = item.name || item.title || item.Name || item.Title || 'N/A';
            const fullAddress = item.address || item.vicinity || item.Address || item.street || item.FullAddress || 'N/A';
            
            // --- SESSION DEDUPLICATION LAYER ---
            const titleAddressKey = `${leadName.toLowerCase().trim()}|${fullAddress.toLowerCase().trim()}`;
            if (cid && seenCids.has(cid)) return;
            if (seenTitles.has(titleAddressKey)) return;
            
            if (cid) seenCids.add(cid);
            seenTitles.add(titleAddressKey);

            if (!firstItemLogged) {
                console.log("[Scraper] First Item Keys Received:", Object.keys(item));
                firstItemLogged = true;
            }
            totalProcessed++;
            
            if (jobId) {
                JobRegistry.updateJob(jobId, { 
                    message: `Scraping: ${totalProcessed} found, ${totalInserted} leads saved...`,
                    data: { 
                        processed: totalProcessed, 
                        new: totalInserted, 
                    }
                });
            }

            // 1. DATA EXTRACTION & INITIAL PARSING
            const rawPhone = item.phone || item.wa || item.phone_number || item.PhoneNumber || item.Phone || item.Telephone || '';
            const sanitizedWa = sanitizeWaNumber(rawPhone) || null;
            const website = item.website || item.Website || item.site || 'N/A';
            const mapsUrl = item.url || item.Url || item.maps_url || null;
            // NEW: Extract business description/about text — may contain Instagram handles or social info
            const aboutText = item.about || item.description || item.About || item.Description || item.SubTitle || 'N/A';

            // 1.1 PARSE RATING & COORDINATES
            // Extensive key check for different scraper versions
            // RECENT FINDING: gosom/google-maps-scraper uses 'review_rating' and 'review_count'
            const rawRating = item.review_rating || item.total_score || item.rating || item.stars || 
                               item.Rating || item.Score || item.avg_rating || 
                               item.rating_value || item['Rating Value'] || '0';
            const finalRating = parseFloat(rawRating.toString()) || 0;

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

            // 2. FILTER LAYER 1: RULE-BASED (User Controlled)
            const reviewCount = item.review_count || item.reviews_count || item.user_ratings_total || item.reviewsCount || item.TotalReviews || 0;
            
            if (finalRating < activeFilters.minRating || finalRating > activeFilters.maxRating) {
                console.log(`[Scraper] Skipping ${leadName}: Rating ${finalRating} outside range [${activeFilters.minRating} - ${activeFilters.maxRating}]`);
                return;
            }
            if (reviewCount < activeFilters.minReviews) {
                console.log(`[Scraper] Skipping ${leadName}: Reviews ${reviewCount} < min ${activeFilters.minReviews}`);
                return;
            }

            // 2.1 WEBSITE FILTER
            if (activeFilters.requireNoWebsite && website && website !== 'N/A') {
                const websiteLower = website.toLowerCase();
                const isBioLink = websiteLower.includes('linktr.ee') || 
                                  websiteLower.includes('instagram.com') || 
                                  websiteLower.includes('facebook.com') || 
                                  websiteLower.includes('wa.me') || 
                                  websiteLower.includes('beacons.ai') || 
                                  websiteLower.includes('taplink.cc') ||
                                  websiteLower.includes('tiktok.com') ||
                                  websiteLower.includes('s.id') ||
                                  websiteLower.includes('linkbio.co') ||
                                  websiteLower.includes('msng.link');
                
                if (!isBioLink && (websiteLower.startsWith('http') || websiteLower.includes('.com') || websiteLower.includes('.id') || websiteLower.includes('.net') || websiteLower.includes('.co.id'))) {
                    console.log(`[Scraper] Skipping ${leadName}: Has professional website (${website})`);
                    return;
                }
            }

            // 2.2 PHONE FILTER
            if (activeFilters.requirePhone && !sanitizedWa) {
                console.log(`[Scraper] Skipping ${leadName}: No mobile phone number.`);
                return;
            }

            // 3. FILTER LAYER 2: LOCATION (RADIUS GUARD)
            const refLat = lat ? parseFloat(lat) : 0;
            const refLng = lng ? parseFloat(lng) : 0;
            
            const hasValidSearchCenter = refLat !== 0 && refLng !== 0;
            const hasValidItemCoords = itemLat !== 0 && itemLng !== 0;
            const distance = (hasValidSearchCenter && hasValidItemCoords) ? getDistance(refLat, refLng, itemLat, itemLng) : null;

            if (distance !== null && district) {
                const districtLower = district.toLowerCase();
                const addressLower = fullAddress.toLowerCase();
                const hasTextMatch = addressLower.includes(districtLower) || leadName.toLowerCase().includes(districtLower);
                const limit = hasTextMatch ? 15.0 : 10.0;

                if (distance > limit) {
                    console.log(`[Scraper] Skipping ${leadName}: Outside District boundary (${distance.toFixed(2)}km > ${limit}km)`);
                    return;
                }
            } else if (distance !== null && !district) {
                if (distance > 25.0) {
                    console.log(`[Scraper] Skipping ${leadName}: Outside City boundary (${distance.toFixed(2)}km)`);
                    return;
                }
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

            // 5. DIRECT SAVE AS RAW (AI Enrichment moved to step 2)
            try {
                const newLead = await prisma.lead.create({
                    data: {
                        name: leadName,
                        wa: sanitizedWa,
                        ig: null,
                        category,
                        province,
                        city,
                        district: district || "",
                        address: fullAddress,
                        rating: finalRating,
                        website,
                        mapsUrl,
                        userId,
                        score: null,
                        priorityTier: null,
                        aiAnalysis: null,
                        reviews: item.user_reviews || [],
                        reviewCount: parseInt(reviewCount.toString()) || 0,
                        status: 'RAW'
                    }
                });

                await prisma.activityLog.create({
                    data: {
                        prospectId: newLead.id,
                        action: 'SCRAPE',
                        description: `Lead ingested as RAW. Pre-filters: R:${activeFilters.minRating}, C:${activeFilters.minReviews}`,
                        metadata: { source: 'raw_scraper', filters: activeFilters }
                    }
                });

                totalInserted++;
            } catch (err) {
                console.error(`[Scraper] DB Insert Error for ${leadName}:`, err);
            }
        };

        const { code } = await executeScraperProcess(binaryPath, queryFilePath, finalRadius, onLeadHandled, lat, lng);
        // flushBuffer() is no longer strictly necessary here for valid leads due to direct insertion,
        // but kept for consistency or if any other buffering logic were to be added.
        await flushBuffer();

        // 6. AUTO-TRIGGER AI SCREEN (Transparency Phase)
        if (totalInserted > 0 && jobId) {
            console.log(`[Scraper] Auto-triggering AI Filter for ${totalInserted} leads...`);
            JobRegistry.updateJob(jobId, { message: `Scraping done. AI filtering ${totalInserted} leads...` });
            
            // Get the IDs of leads we just inserted as RAW
            const insertedLeads = await prisma.lead.findMany({
                where: { userId, status: 'RAW', createdAt: { gte: new Date(Date.now() - 600000) } }, // Last 10 mins
                select: { id: true },
                orderBy: { createdAt: 'desc' },
                take: totalInserted
            });
            
            const { runAIScreenInline } = await import('./ai-screen');
            await runAIScreenInline(insertedLeads.map(l => l.id), jobId, userId);
        }

        if (fs.existsSync(queryFilePath)) fs.unlinkSync(queryFilePath);
        
        if (jobId) {
            JobRegistry.updateJob(jobId, { 
                status: 'COMPLETED', 
                message: `Scraper finished. ${totalInserted} leads processed.`,
                progress: 100 
            });
        }

        revalidatePath('/dashboard/leads');
        revalidatePath('/dashboard/scraper');
        
        return { 
            success: true, 
            message: `Scraper finished. ${totalInserted} leads processed through AI filter.`,
            stats: { new: totalInserted, processed: totalProcessed }
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
        let finalUrl = url;

        // --- URL Expansion for Short Links (maps.app.goo.gl / goo.gl/maps) ---
        if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
            console.log(`[Manual Scraper] Expanding short URL via curl: ${url}`);
            try {
                // Use curl to follow redirects and get the final URL
                const expanded = execSync(`curl -Ls -o /dev/null -w %{url_effective} "${url}"`, { encoding: 'utf8' }).trim();
                if (expanded && expanded.includes('google.com/maps')) {
                    finalUrl = expanded;
                    console.log(`[Manual Scraper] Expanded to: ${finalUrl}`);
                } else {
                    console.warn(`[Manual Scraper] curl expansion returned suspicious URL: ${expanded}`);
                }
            } catch (expandErr) {
                console.error("[Manual Scraper] curl expansion failed:", expandErr);
            }
        }

        // --- STRATEGY: Avoid direct Place URLs to prevent Go-Engine Panic ---
        // The Go binary panics (nil map assignment) when processing some direct /place/ URLs.
        // We extract the business name and use it as a search query instead.
        let searchQuery = finalUrl;
        if (finalUrl.includes('/place/')) {
            const placePart = finalUrl.split('/place/')[1]?.split('/')[0];
            if (placePart) {
                searchQuery = decodeURIComponent(placePart.replace(/\+/g, ' '));
                console.log(`[Manual Scraper] Detected Place URL. Converting to Search Query: ${searchQuery}`);
            }
        }

        fs.writeFileSync(queryFilePath, searchQuery, 'utf8');

        let parsedItem: any = null;

        const onLeadHandled = async (item: any) => {
             parsedItem = item;
             console.log("[Manual Scraper] Received Data for Query");
        };

        // Extract coordinates from URL if present for better accuracy (Geo-Lock)
        const geoMatch = finalUrl.match(/@([-.\d]+),([-.\d]+)/) || finalUrl.match(/!3d([-.\d]+)!4d([-.\d]+)/);
        const lat = geoMatch ? geoMatch[1] : undefined;
        const lng = geoMatch ? geoMatch[2] : undefined;

        await executeScraperProcess(binaryPath, queryFilePath, 1000, onLeadHandled, lat, lng);
        
        if (fs.existsSync(queryFilePath)) fs.unlinkSync(queryFilePath);

        if (!parsedItem) {
             return { success: false, message: "Gagal mengekstrak data dari URL tersebut. Pastikan titik koordinat atau nama bisnis di Maps sudah benar." };
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

        // --- Direct Insertion without AI Filtering ---
        // Check Deduplication
        const existingLead = await prisma.lead.findFirst({
            where: {
                OR: [
                    sanitizedWa ? { wa: sanitizedWa } : undefined,
                    mapsUrl ? { mapsUrl: mapsUrl } : undefined
                ].filter(Boolean) as any
            }
        });

        if (existingLead) {
            return { success: false, message: `Bisnis "${leadName}" sudah ada di dalam database.` };
        }

        const newLead = await prisma.lead.create({
            data: {
                userId: session.userId,
                name: leadName,
                isPro: false,
                wa: sanitizedWa,
                category: category,
                province: province,
                city: city,
                address: fullAddress,
                website: website,
                mapsUrl: mapsUrl,
                rating: finalRating,
                status: 'FRESH',
                brandData: { sourceType: 'MANUAL_URL', note: 'Bypassed AI evaluation' }
            }
        });

        await logActivity(newLead.id, 'SCRAPE', 'Lead ingested via Manual URL Scrape (Direct/No AI)', { url });

        revalidatePath('/dashboard/leads');
        
        return { success: true, lead: newLead };
    } catch (err: any) {
        if (fs.existsSync(queryFilePath)) fs.unlinkSync(queryFilePath);
        console.error("[Manual Scrape Error]:", err);
        return { success: false, message: err.message || 'Scraper failed' };
    }
}

