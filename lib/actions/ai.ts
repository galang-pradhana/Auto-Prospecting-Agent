'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession, getCurrentUser } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';
import * as fsPromises from 'fs/promises';
import { cleanAIResponse, isValidWhatsApp, sanitizeWaNumber, generateRandomBait } from '@/lib/utils';
import { logActivity } from './lead';
import { 
    TONE_MAP,
    REGIONAL_ADVICE_PROMPT,
    STYLE_TWEAK_PROMPT,
    STRICT_STYLE_TWEAK_PROMPT,
    WEBSITE_STRATEGY_PROMPT,
    ENRICHMENT_PROMPT,
    MASTER_PRO_BLUEPRINT_PROMPT,
    OUTREACH_GENERATOR_PROMPT,
    FOLLOWUP_GENERATOR_PROMPT,
    OUTREACH_PERSONAS,
    buildForgeData,
    getGreetingTime,
    PROPOSAL_GENERATOR_PROMPT,
} from '@/lib/prompts';
import { getEffectivePrompt } from './prompt';
import { getUserSettings } from './user-settings';

// --- Kie.ai Credit ---

export async function getKieCredit(): Promise<string> {
    const user = await getCurrentUser();
    const apiKey = user?.kieAiApiKey || process.env.KIE_AI_API_KEY;
    const url = "https://api.kie.ai/api/v1/chat/credit";

    if (!apiKey) return 'N/A';

    try {
        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            signal: AbortSignal.timeout(60000)
        });

        if (response.ok) {
            const res_data = await response.json();
            return res_data.data || '0';
        }
        if (response.status === 401) return 'Invalid API Key';
        return 'Offline';
    } catch (error) {
        console.error('Failed to fetch Kie credit:', error);
        return 'Offline';
    }
}

export async function getOpenRouterCredit(): Promise<string> {
    const user = await getCurrentUser();
    const apiKey = user?.openrouterApiKey || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API;
    const url = "https://openrouter.ai/api/v1/credits";

    if (!apiKey) return 'N/A';

    try {
        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
            const res_data = await response.json();
            return res_data.data?.total_credits?.toFixed(2) || '0';
        }
        if (response.status === 401) return 'Invalid API Key';
        return 'Offline';
    } catch (error) {
        console.error('Failed to fetch OpenRouter credit:', error);
        return 'Offline';
    }
}

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
    if (!model) model = models.find((m: any) => m.id === 'clean-minimal');
    return model || null;
}

export async function getStyleSummary() {
    const models = await getStyleModels();
    if (!models) return "";
    // Only return ID and Name to save tokens during enrichment phase
    return models.map((m: any) => `${m.id}: ${m.name}`).join("\n");
}

// --- KIE.AI MULTI-PROTOCOL CALLER ---
// Jalur ini mengunci protokol agar tidak ada asumsi parsing data.

export async function callOpenRouter(prompt: string, model: string, maxRetries = 2) {
    const user = await getUserSettings();
    const apiKey = user?.openrouterApiKey || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API;

    if (!apiKey) {
        throw new Error("OpenRouter API Key tidak ditemukan. Masukkan di Settings atau tambahkan di .env.");
    }

    const url = "https://openrouter.ai/api/v1/chat/completions";
    const body = { 
        model: model,
        messages: [{ role: "user", content: prompt }],
        stream: false
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    "Authorization": `Bearer ${apiKey}`, 
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                    "X-Title": "Automated Prospecting Engine"
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(600000) // 10 minutes timeout for large HTML generation
            });

            if (!response.ok) {
                let errorData: any = {};
                try { errorData = await response.json(); } catch (e) { errorData = { message: response.statusText }; }
                
                console.error(`[OpenRouter Error] Attempt ${attempt}/${maxRetries} (${response.status}):`, errorData);
                
                if (response.status === 401 || response.status === 403 || response.status === 400 || response.status === 404) {
                    throw new Error(`OpenRouter Error (${response.status}): ${errorData.error?.message || 'Fatal error'}`);
                }

                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000 + Math.random() * 2000;
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                throw new Error(`OpenRouter Error ${response.status}: ${errorData.error?.message || 'Server rejected request'}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            
            if (!content) throw new Error("AI returned no content.");
            return content;
        } catch (error: any) {
            if (attempt < maxRetries) {
                console.error(`[OpenRouter Retry] Attempt ${attempt} failed: ${error.message}`);
                const delay = Math.pow(2, attempt) * 1000 + Math.random() * 2000;
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw error;
        }
    }
    throw new Error("Maximum retries reached.");
}

export async function callAI(prompt: string, tier: 'fast' | 'pro' = 'fast') {
    const user = await getUserSettings();
    const provider = user?.aiProvider || 'kie';

    if (provider === 'kie') {
        return callKieAI(prompt);
    } else {
        // Use reliable models: claude-3.5-sonnet for pro, deepseek-v4-pro for fast
        const model = tier === 'pro' ? 'anthropic/claude-3.5-sonnet' : 'deepseek/deepseek-v4-pro';
        console.log(`[callAI] Provider: openrouter, Tier: ${tier}, Model: ${model}`);
        return callOpenRouter(prompt, model);
    }
}

// ============================================================
// HTML MODEL CONFIG MAP
// ============================================================
// Key          = nilai yang disimpan di DB field `htmlModel`
// kieUrl       = URL endpoint Kie.ai (null = tidak tersedia di Kie.ai)
// kieFormat    = 'openai' (default) | 'anthropic' (Claude models)
// kieModelId   = model ID yang dikirim di body (hanya untuk format anthropic)
// openrouterId = model ID untuk OpenRouter
const HTML_MODEL_CONFIG: Record<string, {
    kieUrl: string | null;
    kieFormat: 'openai' | 'anthropic';
    kieModelId?: string; // wajib jika kieFormat = 'anthropic'
    openrouterId: string;
    label: string;
    orOnly: boolean; // true = hanya tersedia di OpenRouter
}> = {
    'gemini-3-1-pro': {
        kieUrl:       'https://api.kie.ai/gemini-3.1-pro/v1/chat/completions',
        kieFormat:    'openai',
        openrouterId: 'google/gemini-3.1-pro-preview',
        label:        'Gemini 3.1 Pro',
        orOnly:       false,
    },
    'claude-sonnet-4-6': {
        // Claude di Kie.ai pakai Anthropic format, bukan OpenAI
        kieUrl:       'https://api.kie.ai/claude/v1/messages',
        kieFormat:    'anthropic',
        kieModelId:   'claude-sonnet-4-6',
        openrouterId: 'anthropic/claude-sonnet-4.6',
        label:        'Claude Sonnet 4.6',
        orOnly:       false,
    },
    'gpt-5-2': {
        // GPT 5.2 di Kie.ai pakai OpenAI-compatible format
        kieUrl:       'https://api.kie.ai/gpt-5-2/v1/chat/completions',
        kieFormat:    'openai',
        openrouterId: 'openai/gpt-5.2',
        label:        'GPT 5.2',
        orOnly:       false,
    },
    'deepseek-v4-pro': {
        kieUrl:       null,
        kieFormat:    'openai',
        openrouterId: 'deepseek/deepseek-v4-pro',
        label:        'DeepSeek V4 Pro',
        orOnly:       true,
    },
    'qwen3.6-plus': {
        kieUrl:       null,
        kieFormat:    'openai',
        openrouterId: 'qwen/qwen3.6-plus',
        label:        'Qwen 3.6 Plus',
        orOnly:       true,
    },
};

// Fallback model jika model OR-only dipilih saat engine = Kie.ai
const KIE_FALLBACK_CONFIG = HTML_MODEL_CONFIG['gemini-3-1-pro'];

/**
 * callAIForHTML - Panggil AI khusus untuk generate HTML.
 * 
 * Membaca `htmlModel` dan `aiProvider` dari DB user, lalu:
 * - Jika provider = openrouter → pakai OpenRouter dengan openrouterId
 * - Jika provider = kie dan model tersedia → pakai Kie.ai URL
 * - Jika provider = kie tapi model OR-only → fallback ke Gemini 3.1 Pro di Kie.ai
 */
export async function callAIForHTML(prompt: string, overrideModelKey?: string): Promise<string> {
    const user = await getUserSettings();
    const provider = user?.aiProvider || 'kie';
    const modelKey = overrideModelKey || user?.htmlModel || 'gemini-3-1-pro';
    
    const config = HTML_MODEL_CONFIG[modelKey] ?? HTML_MODEL_CONFIG['gemini-3-1-pro'];
    
    // --- OpenRouter path ---
    if (provider === 'openrouter') {
        console.log(`[callAIForHTML] Engine: OpenRouter, Model: ${config.label} (${config.openrouterId})`);
        return callOpenRouter(prompt, config.openrouterId);
    }
    
    // --- Kie.ai path ---
    // Cek apakah model ini tersedia di Kie.ai
    const kieConfig = config.kieUrl ? config : KIE_FALLBACK_CONFIG;
    if (!config.kieUrl) {
        console.warn(`[callAIForHTML] Model '${config.label}' tidak tersedia di Kie.ai. Fallback ke ${KIE_FALLBACK_CONFIG.label}.`);
    }
    
    const isAnthropicFormat = kieConfig.kieFormat === 'anthropic';
    console.log(`[callAIForHTML] Engine: Kie.ai, URL: ${kieConfig.kieUrl}, Format: ${kieConfig.kieFormat}`);
    
    const apiKey = user?.kieAiApiKey || process.env.KIE_AI_API_KEY;
    if (!apiKey) throw new Error("Kie.ai API Key tidak ditemukan.");
    
    // Build request body sesuai format (OpenAI vs Anthropic)
    const body = isAnthropicFormat
        ? {
            model: kieConfig.kieModelId,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4096,
            stream: false
        }
        : {
            messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
            stream: false
        };
    
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(kieConfig.kieUrl!, {
                method: 'POST',
                headers: { 
                    "Authorization": `Bearer ${apiKey}`, 
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(120000) // 2 menit
            });
            
            if (!response.ok) {
                let errorData: any = {};
                try { errorData = await response.json(); } catch (e) {}
                console.error(`[callAIForHTML Kie Error] Attempt ${attempt} (${response.status}):`, errorData);
                
                if (response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) {
                    throw new Error(`Kie.ai Error (${response.status}): ${errorData.msg || 'Fatal error'}`);
                }
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 3000));
                    continue;
                }
                throw new Error(`Kie.ai Error ${response.status}: ${errorData.msg || 'Server rejected'}`);
            }
            
            const data = await response.json();
            
            // Parse response sesuai format
            let content: string | undefined;
            if (isAnthropicFormat) {
                // Anthropic format: { content: [{ type: 'text', text: '...' }] }
                content = data.content?.[0]?.text;
            } else {
                // OpenAI format: { choices: [{ message: { content: '...' } }] }
                content = data.choices?.[0]?.message?.content;
            }
            
            if (!content) {
                console.error('[callAIForHTML] Empty response body:', JSON.stringify(data).slice(0, 500));
                throw new Error("AI returned no content.");
            }
            return content;
            
        } catch (error: any) {
            if (attempt < maxRetries) {
                console.error(`[callAIForHTML Retry] Attempt ${attempt}: ${error.message}`);
                await new Promise(r => setTimeout(r, 3000));
                continue;
            }
            throw error;
        }
    }
    throw new Error("Maximum retries reached for HTML generation.");
}

export async function callKieAI(prompt: string, maxRetries = 5) {
    const user = await getCurrentUser();
    const apiKey = user?.kieAiApiKey || process.env.KIE_AI_API_KEY;

    if (!apiKey) {
        throw new Error("API Key tidak ditemukan di Database maupun .env. Mesin mogok!");
    }

    const url = "https://api.kie.ai/gemini-3.1-pro/v1/chat/completions";
    const body = { 
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
        stream: false
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(600000) 
            });

            if (!response.ok) {
                // Try to get error message
                let errorData: any = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { message: response.statusText };
                }

                console.error(`[Kie.ai Error] Attempt ${attempt}/${maxRetries} (${response.status}):`, errorData);
                
                // Fatal Errors: Don't retry
                if (response.status === 401 || response.status === 403 || response.status === 400) {
                    throw new Error(`Kie.ai Error (${response.status}): ${errorData.msg || errorData.message || 'Fatal error'}`);
                }

                // Transient Errors (500, 502, 503, 504, 429)
                if (attempt < maxRetries) {
                    // Exponential backoff with jitter: (2^attempt * 1000) + random
                    const baseDelay = Math.pow(2, attempt) * 1000;
                    const jitter = Math.random() * 2000;
                    const delay = baseDelay + jitter;
                    
                    console.warn(`[Kie.ai] Transient error ${response.status}. Retrying in ${Math.round(delay)}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                
                throw new Error(`Kie.ai Error ${response.status}: ${errorData.msg || errorData.message || 'Server rejected request after ' + maxRetries + ' attempts'}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || 
                           data.candidates?.[0]?.content?.parts?.[0]?.text || 
                           data.content?.[0]?.text;
            
            if (!content) {
                console.error("[Kie.ai Error] Empty content result:", data);
                throw new Error("AI returned no content.");
            }

            return content;
        } catch (error: any) {
            // Check if it's a timeout or network error
            const isTransient = error.name === 'TimeoutError' || error.name === 'AbortError' || error.message.includes('fetch');
            
            console.error(`[callKieAI Failure] Attempt ${attempt}/${maxRetries}:`, error.message);
            
            if (isTransient && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000 + Math.random() * 2000;
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw error;
        }
    }
    throw new Error("Maximum retries reached.");
}

// --- Kie.ai Vision (Image + Text) ---
// Kirim base64 image bersama prompt teks ke Gemini multimodal endpoint

export async function callKieAIWithVision(
    prompt: string,
    base64Image: string,
    mimeType: string = 'image/jpeg'
): Promise<string> {
    const user = await getCurrentUser();
    const apiKey = user?.kieAiApiKey || process.env.KIE_AI_API_KEY;

    if (!apiKey) throw new Error('API Key tidak ditemukan.');

    const url = 'https://api.kie.ai/gemini-3.1-pro/v1/chat/completions';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const body = {
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: dataUrl } }
            ]
        }],
        stream: false
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(120000)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[Kie.ai Vision Error]:', data);
            throw new Error(`Kie.ai Vision Error: ${data.msg || data.message || 'Rejected'}`);
        }

        const content =
            data.choices?.[0]?.message?.content ||
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            data.content?.[0]?.text;

        if (!content) throw new Error('AI returned no content from vision request.');

        return content;
    } catch (error: any) {
        console.error('[callKieAIWithVision Failure]:', error.message);
        throw error;
    }
}

export async function enrichLead(leadId: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { success: false, message: 'Lead not found' };

    if (!isValidWhatsApp(lead.wa)) return { success: false, message: 'Invalid WhatsApp number' };
    if (lead.status !== 'FRESH') return { success: false, message: 'Lead already processed' };

    // Call the unified batch enricher
    const result = await batchEnrichLeads([leadId]);
    
    if (result.success) {
        return { success: true, message: `${lead.name} enriched successfully.` };
    }
    
    return { success: false, message: 'Failed to enrich lead due to internal error.' };
}


import { JobRegistry } from '@/lib/jobRegistry';

// ... (replacing the exact chunk carefully)
export async function batchEnrichLeads(ids: string[], jobId?: string) {
    const session = await getSession();
    if (!session) {
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: 'Not authenticated' });
        return { success: false, message: 'Not authenticated' };
    }

    let processedCount = 0;
    let successCount = 0;
    const total = ids.length;

    for (const id of ids) {
        try {
            const lead = await prisma.lead.findUnique({ where: { id } });
            if (!lead) {
                processedCount++;
                continue;
            }

            if (jobId) {
                JobRegistry.updateJob(jobId, {
                    progress: Math.round((processedCount / total) * 100),
                    message: `Enriching ${lead.name} (${processedCount + 1}/${total})...`,
                    data: { processed: processedCount, total, success: successCount }
                });
            }

            // STEP 1: ENRICHMENT (Riset & Analisis JSON)
            const promptBase = ENRICHMENT_PROMPT;
            const forgeData = buildForgeData(lead);

            const researchRaw = await callAI(
                promptBase
                    .replace('[name]', lead.name)
                    .replace('[category]', lead.category)
                    .replace('[address]', lead.address || 'Bali')
                    .replace('[styleDNA]', lead.styleDNA || 'Modern, Premium')
                    .replace('[industryPattern]', forgeData.industryPattern)
                    .replace('[industryStylePriority]', forgeData.industryStylePriority)
                    .replace('[industryColorMood]', forgeData.industryColorMood)
                    .replace('[industryKeyEffects]', forgeData.industryKeyEffects)
                    .replace('[industryAvoidPatterns]', forgeData.industryAvoidPatterns)
                    .replace('[unsplashQueries]', forgeData.unsplashQueries)
                    .replace('[rating]', lead.rating.toString())
                    .replace('[reviewsCount]', (lead.reviewCount || 0).toString()),
                'fast'
            );
            
            if (!researchRaw) {
                processedCount++;
                continue;
            }

            try {
                const resData = JSON.parse(researchRaw.replace(/```json/g, '').replace(/```/g, '').trim());

                // STEP 2: STRATEGY (Blueprint Paragraf)
                const stratPrompt = WEBSITE_STRATEGY_PROMPT
                    .replace('[brandName]', lead.name)
                    .replace('[category]', lead.category)
                    .replace('[painPoints]', Array.isArray(resData.painPoints) ? resData.painPoints.join(', ') : (resData.painPoints || ""))
                    .replace('[resolvingIdea]', resData.branding?.description || resData.aiAnalysis?.branding || "")
                    .replace('[styleDNA]', resData.styleDNA || "Modern, Premium, and Professional")
                    .replace('[analysis]', JSON.stringify(resData))
                    .replace('[industryPattern]', forgeData.industryPattern)
                    .replace('[industryStylePriority]', forgeData.industryStylePriority)
                    .replace('[industryColorMood]', forgeData.industryColorMood)
                    .replace('[industryKeyEffects]', forgeData.industryKeyEffects)
                    .replace('[industryAvoidPatterns]', forgeData.industryAvoidPatterns)
                    .replace('[unsplashQueries]', forgeData.unsplashQueries)
                    .replace('[selectedArchetype]', forgeData.selectedArchetype);

                const masterPrompt = await callAI(stratPrompt, 'fast');

                // DATABASE UPDATE
                await prisma.lead.update({
                    where: { id },
                    data: {
                        brandData: resData.brandData || resData.branding || {},
                        aiAnalysis: resData.aiAnalysis || resData,
                        painPoints: Array.isArray(resData.painPoints) ? resData.painPoints.join(', ') : (resData.painPoints || ""),
                        styleDNA: resData.styleDNA || "",
                        masterWebsitePrompt: masterPrompt || researchRaw,
                        status: 'ENRICHED',
                        isPro: false,
                        lastLog: `Success: Double-Step via GEMINI 3.1 PRO`
                    }
                });

                await logActivity(id, 'ENRICH', `Unified Double-Step Enriched via GEMINI 3.1 PRO`);
                successCount++;
            } catch (e) {
                console.error(`Error parsing JSON on ${id}:`, e);
                await prisma.lead.update({
                    where: { id },
                    data: {
                        masterWebsitePrompt: researchRaw,
                        status: 'ENRICHED',
                        isPro: false,
                        lastLog: `Fallback: Raw Enrichment via GEMINI 3.1 PRO (JSON Parse Failed)`
                    }
                });
                successCount++;
            }
        } catch (error: any) {
            console.error(`[Batch Enrich Error] ${id}:`, error.message);
            try {
                await prisma.lead.update({
                    where: { id },
                    data: { lastLog: `Error: ${error.message}` }
                });
            } catch (dbErr) {
                console.error("Failed to log error to DB:", dbErr);
            }
        }
        
        processedCount++;
        
        if (jobId) {
            console.log(`[Batch Enrich ${jobId}] Progress: ${processedCount}/${total}`);
            JobRegistry.updateJob(jobId, {
                progress: Math.round((processedCount / total) * 100),
                message: `Enriched ${processedCount}/${total} leads...`
            });
        }
        
        // Add a small delay between items to avoid Kie.ai rate limits
        if (processedCount < total) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    if (jobId) {
        console.log(`[Batch Enrich ${jobId}] COMPLETED. Success: ${successCount}/${total}`);
        JobRegistry.updateJob(jobId, {
            status: 'COMPLETED',
            progress: 100,
            message: `Batch enrichment finished. Processed ${successCount}/${total} leads.`,
            data: { processed: processedCount, total, success: successCount }
        });
    }

    revalidatePath('/dashboard/enriched');
    revalidatePath('/dashboard/leads');

    return { success: true, message: `Batch enrichment complete. Enriched ${successCount} leads.` };
}

// --- Website Generation (Forge) ---

export async function generateForgeCode(leadId: string, jobId?: string, modelId?: string) {
    const session = await getSession();
    if (!session) {
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: 'Not authenticated' });
        return { success: false, message: 'Not authenticated' };
    }

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) throw new Error("Lead tidak ditemukan");

        const systemPrompt = "You are a Senior Web Architect. Forge this master prompt into a high-converting landing page with professional UI/UX. Use Tailwind CSS and ensure the code is production-ready.";

        const promptTemplate = await getEffectivePrompt('MASTER_FORGE_PROMPT');
        const forgeData = buildForgeData(lead);
        const fullAddress = `${lead.address || 'Bali'}, ${lead.city || ''}, ${lead.province || ''}`.trim().replace(/,\s*,/g, ',');
        const finalPrompt = promptTemplate
            .replace('[selectedArchetype]', forgeData.selectedArchetype)
            .replace('[brandName]', lead.name)
            .replace('[name]', lead.name)
            .replace('[category]', lead.category)
            .replace('[fullAddress]', fullAddress)
            .replace('[address]', lead.address || 'Bali')
            .replace('[waLink]', `https://wa.me/${sanitizeWaNumber(lead.wa)}`)
            .replace('[phone]', lead.wa)
            .replace('[styleDNA]', lead.styleDNA || 'Modern, Professional and Premium')
            .replace('[painPoints]', lead.painPoints || 'Kurangnya digital presence yang profesional')
            .replace('[resolvingIdea]', lead.resolvingIdea || 'Website premium yang konversi tinggi')
            .replace('[industryPattern]', forgeData.industryPattern)
            .replace('[industryStylePriority]', forgeData.industryStylePriority)
            .replace('[industryColorMood]', forgeData.industryColorMood)
            .replace('[industryKeyEffects]', forgeData.industryKeyEffects)
            .replace('[industryAvoidPatterns]', forgeData.industryAvoidPatterns)
            .replace('[unsplashQueries]', forgeData.unsplashQueries);

        if (jobId) {
            JobRegistry.updateJob(jobId, {
                progress: 50,
                message: `Generating HTML code for ${lead.name}...`
            });
        }

        // Persist job start to DB for crash recovery visibility
        await prisma.lead.update({
            where: { id: leadId },
            data: { lastLog: `RUNNING: Forge process started at ${new Date().toISOString()}` }
        });

        const htmlContent = await callAIForHTML(systemPrompt + "\n\n" + finalPrompt, modelId);
        
        if (!htmlContent || htmlContent.length < 500) throw new Error("Output AI korup atau terlalu pendek.");

        if (jobId) {
            JobRegistry.updateJob(jobId, {
                progress: 90,
                message: `Finalizing and saving Database for ${lead.name}...`
            });
        }

        // Clean & Update
        const cleanHtml = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();
        
        // Relaxed Validation: Cek struktur dasar dan threshold lebih rendah
        const hasHtmlStructure = cleanHtml.includes('<html') || cleanHtml.includes('<!DOCTYPE');
        const isLongEnough = cleanHtml.length >= 1500;
        
        if (!hasHtmlStructure || !isLongEnough) {
            throw new Error("Output AI tidak valid atau terlalu pendek (min 1500 chars). Pastikan AI menghasilkan full HTML.");
        }

        // Slug Guard: Ensure slug exists for the LIVE link
        let finalSlug = lead.slug;
        if (!finalSlug) {
            const baseSlug = lead.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            finalSlug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
        }

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                htmlCode: cleanHtml,
                slug: finalSlug,
                status: 'LIVE',
                isPro: false,
                lastLog: `Success via AI at ${new Date().toISOString()}`
            }
        });

        revalidatePath('/dashboard/enriched');
        revalidatePath('/dashboard/live');

        if (jobId) {
            JobRegistry.updateJob(jobId, {
                status: 'COMPLETED',
                progress: 100,
                message: `Forge successful for ${lead.name}`,
                data: { success: true }
            });
        }

        return { success: true, html: cleanHtml };

    } catch (error: any) {
        console.error("Forge Failure:", error.message);
        try {
            await prisma.lead.update({
                where: { id: leadId },
                data: { lastLog: `Error: ${error.message}` }
            });
        } catch (dbErr) {
            console.error("Failed to log error to DB:", dbErr);
        }
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: error.message });
        return { success: false, message: error.message };
    }
}

// --- Blueprint Generation ---

export async function generateBlueprintCode(leadId: string, answers: any, jobId?: string, modelId?: string) {
    const session = await getSession();
    if (!session) {
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: 'Not authenticated' });
        return { success: false, message: 'Not authenticated' };
    }

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) throw new Error("Lead tidak ditemukan");

        const systemPrompt = "You are a Senior Web Architect. Forge this master prompt into a high-converting landing page with professional UI/UX. Use Tailwind CSS and ensure the code is production-ready.";

        const promptTemplate = await getEffectivePrompt('MASTER_FORGE_PROMPT');
        const forgeData = buildForgeData(lead);
        const fullAddress = `${lead.address || 'Bali'}, ${lead.city || ''}, ${lead.province || ''}`.trim().replace(/,\s*,/g, ',');
        
        const submission = await prisma.brandDnaSubmission.findUnique({ where: { leadId } });
        const logoUrl = submission?.logoPath || null;
        const mediaUrls = (submission?.mediaFiles as string[] | null) || [];
        const hasCustomAssets = !!(logoUrl || mediaUrls.length > 0);

        const customAssetsBlock = hasCustomAssets ? `
[CLIENT CUSTOM ASSETS — MANDATORY, PRIORITAS TERTINGGI]
Klien telah menyediakan aset visual nyata berikut ini. WAJIB gunakan aset ini. Jangan ganti dengan Unsplash, placeholder, atau gambar lain.

${logoUrl ? `LOGO KLIEN (WebP URL): ${logoUrl}
→ Gunakan sebagai <img src="${logoUrl}"> di: navbar logo, footer logo.
→ Jangan render teks nama brand sebagai pengganti logo jika ada URL ini.` : ''}

${mediaUrls.length > 0 ? `GAMBAR KONTEN KLIEN:
${mediaUrls.map((u, i) => `  ${i + 1}. ${u}`).join('\n')}
→ Gunakan gambar-gambar ini di: Hero background, Gallery section, About/Story section, Product showcase.
→ Untuk section yang sudah punya gambar klien di atas, JANGAN gunakan Unsplash.` : ''}

⚠️ Aset di atas adalah GAMBAR NYATA dari klien. Embed semua ke dalam HTML output.
` : '';

        // Convert answers into readable format for AI
        const blueprintContext = `
[BRAND BLUEPRINT CLIENT ANSWERS — GUNAKAN SEBAGAI DESIGN BRIEF]
- Brand Name: ${answers.brand_name || lead.name}
- One-liner: ${answers.oneliner || ''}
- Tagline/Description: ${answers.tagline || ''}
- Target Audience: ${answers.target || ''}
- USP: ${answers.usp || ''}
- Vibe: ${answers.vibe ? answers.vibe.join(', ') : ''}
- Tone: ${JSON.stringify(answers.tone || {})}
- Keywords: ${answers.kw ? answers.kw.join(', ') : ''} ${answers.kw_extra || ''}
- Goal: ${answers.wg ? answers.wg.join(', ') : ''}
- Colors: ${answers.colors || ''}
- Pages Needed: ${answers.pg ? answers.pg.join(', ') : ''}
- Web Refs: ${answers.webref || ''}
- Notes: ${answers.notes || ''}
        `;

        const finalPrompt = promptTemplate
            .replace('[selectedArchetype]', forgeData.selectedArchetype)
            .replace('[brandName]', answers.brand_name || lead.name)
            .replace('[name]', answers.brand_name || lead.name)
            .replace('[category]', lead.category)
            .replace('[fullAddress]', fullAddress)
            .replace('[address]', lead.address || 'Bali')
            .replace('[waLink]', `https://wa.me/${sanitizeWaNumber(lead.wa)}`)
            .replace('[phone]', lead.wa)
            .replace('[styleDNA]', answers.colors || lead.styleDNA || 'Modern, Professional and Premium')
            .replace('[customAssets]', customAssetsBlock)
            .replace('[painPoints]', blueprintContext)
            .replace('[resolvingIdea]', answers.tagline || lead.resolvingIdea || 'Website premium yang konversi tinggi')
            .replace('[industryPattern]', forgeData.industryPattern)
            .replace('[industryStylePriority]', forgeData.industryStylePriority)
            .replace('[industryColorMood]', forgeData.industryColorMood)
            .replace('[industryKeyEffects]', forgeData.industryKeyEffects)
            .replace('[industryAvoidPatterns]', forgeData.industryAvoidPatterns)
            .replace('[unsplashQueries]', hasCustomAssets 
                ? `${forgeData.unsplashQueries} — HANYA untuk section dekoratif yang tidak punya custom asset di atas` 
                : forgeData.unsplashQueries);

        if (jobId) {
            JobRegistry.updateJob(jobId, {
                progress: 50,
                message: `Generating Blueprint HTML for ${lead.name}...`
            });
        }

        // Persist job start to DB for crash recovery visibility
        await prisma.lead.update({
            where: { id: leadId },
            data: { lastLog: `RUNNING: Blueprint process started at ${new Date().toISOString()}` }
        });

        const htmlContent = await callAIForHTML(systemPrompt + "\n\n" + finalPrompt, modelId);
        
        if (!htmlContent || htmlContent.length < 500) throw new Error("Output AI korup atau terlalu pendek.");

        if (jobId) {
            JobRegistry.updateJob(jobId, {
                progress: 90,
                message: `Finalizing and saving Database for ${lead.name}...`
            });
        }

        // Clean & Update
        const cleanHtml = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();
        
        const hasHtmlStructure = cleanHtml.includes('<html') || cleanHtml.includes('<!DOCTYPE');
        const isLongEnough = cleanHtml.length >= 1500;
        
        if (!hasHtmlStructure || !isLongEnough) {
            throw new Error("Output AI tidak valid atau terlalu pendek (min 1500 chars). Pastikan AI menghasilkan full HTML.");
        }

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                prototypeHtml: cleanHtml,
                lastLog: `Blueprint Generated via AI at ${new Date().toISOString()}`
            }
        });

        await logActivity(leadId, 'BLUEPRINT_GENERATED', 'Brand Blueprint AI generation success');

        if (jobId) {
            JobRegistry.updateJob(jobId, {
                status: 'COMPLETED',
                progress: 100,
                message: `Blueprint generated successfully.`,
                data: { success: true }
            });
        }

        revalidatePath('/dashboard/live');
        revalidatePath(`/${lead.slug || lead.id}`);

        return { success: true, message: 'Code generated successfully' };
    } catch (error: any) {
        console.error("[Generate Blueprint Error]:", error);
        
        await prisma.lead.update({
            where: { id: leadId },
            data: { lastLog: `Blueprint Error: ${error.message}` }
        });
        
        if (jobId) {
            JobRegistry.updateJob(jobId, { status: 'FAILED', message: error.message || 'Unknown error' });
        }
        return { success: false, message: error.message };
    }
}

export async function tweakLeadStyle(leadId: string, styleId: string, instructions?: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { success: false, message: 'Lead not found' };

    try {
        const styleDNA = await getStyleDNA(styleId);
        if (!styleDNA) return { success: false, message: 'Style not found' };

        const fullAddress = `${lead.address}, ${lead.city}, ${lead.province}`;
        const prompt = STYLE_TWEAK_PROMPT
            .replace("[name]", lead.name)
            .replace("[category]", lead.category)
            .replace("[fullAddress]", fullAddress)
            .replace("[waLink]", `https://wa.me/${sanitizeWaNumber(lead.wa)}`)
            .replace("[painPoints]", lead.painPoints || 'General business optimization')
            .replace("[resolvingIdea]", lead.resolvingIdea || 'Professional digital presence')
            .replace("[styleName]", styleDNA.name)
            .replace("[styleDescription]", styleDNA.description)
            .replace("[characteristics]", JSON.stringify(styleDNA.characteristics))
            .replace("[stylingDetails]", JSON.stringify({
                colorPalette: styleDNA.colorPalette,
                typography: styleDNA.typography,
                buttonStyles: styleDNA.buttonStyles,
                cardStyles: styleDNA.cardStyles,
            }))
            .replace("[instructions]", instructions || "Refine the overall design to be more professional and polished.");

        const aiResponse = await callAI("Return JSON. " + prompt, 'fast');
        
        if (!aiResponse) throw new Error("AI Re-generation failed");
        
        const sanitizedContent = cleanAIResponse(aiResponse);
        const result = JSON.parse(sanitizedContent);
        const { masterWebsitePrompt, htmlCode } = result;

        if (!masterWebsitePrompt || !htmlCode) {
            throw new Error("AI failed to generate both blueprint and code.");
        }

        await prisma.lead.update({
            where: { id: leadId },
            data: { 
                selectedStyle: styleId, 
                masterWebsitePrompt,
                htmlCode
            }
        });

        await logActivity(leadId, 'TWEAK', `Design refined with style: ${styleDNA.name}`, { 
            styleId
        });

        revalidatePath('/dashboard/live');
        revalidatePath(`/${lead.slug || lead.id}`);
        
        return { success: true, masterWebsitePrompt, htmlCode };
    } catch (error: any) {
        console.error('Tweak Error:', error);
        return { success: false, message: error.message || 'Tweak failed' };
    }
}

export async function tweakLeadStyleStrict(leadId: string, styleId: string, instructions?: string, previewOnly: boolean = false, jobId?: string, modelId?: string) {
    const session = await getSession();
    if (!session) {
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: 'Not authenticated' });
        return { success: false, message: 'Not authenticated' };
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { success: false, message: 'Lead not found' };

    try {
        let styleDNA = null;
        if (styleId) {
            styleDNA = await getStyleDNA(styleId);
        }

        const fullAddress = `${lead.address}, ${lead.city}, ${lead.province}`;
        
        let enforcementConstraint = `CRITICAL ENFORCEMENT: MAINTAIN EXACT HTML DOM STRUCTURE, SAME IMAGE URLS, SAME SECTION ORDER. DO NOT REMOVE OR CHANGE ANY <img> TAGS OR BACKGROUND-IMAGE CSS. ONLY modify Tailwind utility classes (bg-colors, text-colors, fonts, shadow, border radius, paddings) to match the new Style DNA. DO NOT CHANGE CONTENT OR LAYOUT.`;
        
        if (instructions && instructions.trim() !== '') {
            enforcementConstraint = `USER OVERRIDE OVERHAUL ALLOWED: ${instructions}. You may now change structure or content based exclusively on this specific instruction.`;
        }

        const prompt = STRICT_STYLE_TWEAK_PROMPT
            .replace("[name]", lead.name)
            .replace("[category]", lead.category)
            .replace("[currentHtml]", lead.htmlCode || '')
            .replace("[stylingDetails]", styleDNA ? JSON.stringify({
                colorPalette: styleDNA.colorPalette,
                typography: styleDNA.typography,
                buttonStyles: styleDNA.buttonStyles,
                cardStyles: styleDNA.cardStyles,
            }) : "KEEP CURRENT STYLING - ONLY APPLY THE MANUAL OVERRIDES BELOW")
            .replace("[instructions]", enforcementConstraint);

        if (jobId) {
            JobRegistry.updateJob(jobId, {
                progress: 40,
                message: `Analyzing new style DNA...`
            });
        }

        const aiResponse = await callAIForHTML(prompt, modelId);
        
        if (!aiResponse) throw new Error("AI Re-generation failed");

        if (jobId) {
            JobRegistry.updateJob(jobId, {
                progress: 80,
                message: `Processing generated visual code...`
            });
        }
        
        // Extract HTML from markdown if present
        let htmlCode = aiResponse.trim();
        if (htmlCode.includes('```html')) {
            htmlCode = htmlCode.split('```html')[1].split('```')[0].trim();
        } else if (htmlCode.includes('```')) {
            htmlCode = htmlCode.split('```')[1].split('```')[0].trim();
        }

        if (!htmlCode || htmlCode.length < 10) {
            throw new Error("AI failed to generate valid HTML code.");
        }

        if (!previewOnly) {
            await prisma.lead.update({
                where: { id: leadId },
                data: { 
                    selectedStyle: styleId || lead.selectedStyle, 
                    htmlCode
                }
            });

            await logActivity(leadId, 'TWEAK_STRICT', `Strict Design tweak with style: ${styleDNA ? styleDNA.name : 'Custom Overrides'}`, { 
                styleId
            });

            revalidatePath('/dashboard/live');
            revalidatePath(`/${lead.slug || lead.id}`);
        }

        if (jobId) {
            JobRegistry.updateJob(jobId, {
                status: 'COMPLETED',
                progress: 100,
                message: previewOnly ? `Preview generation complete.` : `Visual update applied successfully.`,
                data: { success: true, htmlCode }
            });
        }
        
        return { success: true, htmlCode };
    } catch (error: any) {
        console.error('Strict Tweak Error:', error);
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: error.message });
        return { success: false, message: error.message || 'Strict Tweak failed' };
    }
}

// --- Recommendations & Archetypes ---

export async function refineLeadStyle(leadId: string, styleId: string, modelId?: string) {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: 'Unauthorized' };

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) throw new Error("Lead not found");

        // 1. Load 20 STYLE MODELS.json
        const styleDataPath = path.join(process.cwd(), 'data', '20 STYLE MODELS.json');
        const styleContent = fs.readFileSync(styleDataPath, 'utf8');
        const styleFile = JSON.parse(styleContent);
        
        // Cari model berdasarkan ID (misal: 'clean-minimal')
        const selectedModel = styleFile.styleModels.models.find((m: any) => m.id === styleId);
        if (!selectedModel) throw new Error("Style model not found");

        // 2. Rakit Prompt dengan injeksi JSON model
        const finalPrompt = STYLE_TWEAK_PROMPT
            .replace('[name]', lead.name)
            .replace('[category]', lead.category)
            .replace('[masterWebsitePrompt]', lead.masterWebsitePrompt || '')
            .replace('[styleConfig]', JSON.stringify(selectedModel));

        // 3. Panggil AI for HTML (Blueprint Prompt generation)
        const refinedBlueprint = await callAIForHTML(finalPrompt, modelId);

        if (!refinedBlueprint) throw new Error("AI failed to refine blueprint");

        // 4. Update Database (Update masterWebsitePrompt dengan blueprint baru)
        const updatedLead = await prisma.lead.update({
            where: { id: leadId },
            data: {
                masterWebsitePrompt: refinedBlueprint,
                selectedStyle: styleId, // Simpan ID style yang dipilih
                lastLog: `Style Refined via ${modelId || 'default model'}: ${selectedModel.name}`
            }
        });

        revalidatePath('/leads');
        revalidatePath('/dashboard/leads');
        revalidatePath('/dashboard/enriched');
        return { success: true, masterWebsitePrompt: refinedBlueprint, updatedLead };
    } catch (error: any) {
        console.error("[Refine Error]:", error.message);
        return { success: false, message: error.message };
    }
}

export async function getRegionalAdvice(province: string, city: string, category: string) {
    try {
        const prompt = REGIONAL_ADVICE_PROMPT
            .replace("[category]", category)
            .replace("[city]", city)
            .replace("[province]", province);

        const aiResponse = await callAI("Return JSON. " + prompt, 'fast');
        
        if (aiResponse) return JSON.parse(aiResponse.replace(/```json/g, '').replace(/```/g, '').trim());
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
        keywords.forEach(kw => { if (textToSearch.includes(kw.toLowerCase())) score += 10; });
        return { id: m.id, score };
    });
    return results.filter((r: any) => r.score > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 3).map((r: any) => r.id);
}

export async function getRecommendedStyles(category: string) {
    return getTop3Styles(category);
}

export async function generateOutreachDraft(leadId: string, persona: string = 'professional') {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: 'Unauthorized' };

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) throw new Error("Lead not found");

        const personaDefinition = OUTREACH_PERSONAS[persona] || OUTREACH_PERSONAS['professional'];

        // STEP 1: Generate bait FIRST — so we know which angle to continue from
        const baitDraft = generateRandomBait(lead.name, lead.city || "", lead.category, lead.rating);

        // STEP 2: Inject the bait into the prompt so AI writes Pesan 2 that flows naturally
        const finalPrompt = OUTREACH_GENERATOR_PROMPT
            .replace('[bait_message]', baitDraft)
            .replace('[persona_definition]', personaDefinition)
            .replace(/\[category\]/g, lead.category)
            .replace(/{{name}}/g, lead.name)
            .replace('{{pain_points}}', lead.painPoints || 'Kurangnya identitas digital yang kuat')
            .replace('{{idea}}', lead.masterWebsitePrompt || 'Landing page premium')
            .replace('{{link}}', lead.status === 'LIVE'
                ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://auto-forge.pro'}/${lead.slug || lead.id}`
                : `${process.env.NEXT_PUBLIC_APP_URL || 'https://auto-forge.pro'}/preview/${lead.slug || lead.id}`)
            .replace('{{my_business_name}}', user.businessName || '[Nama Bisnis Kamu]')
            .replace('{{my_ig}}', user.businessIg || '[IG Kamu]')
            .replace('{{my_wa}}', user.businessWa || '[WA Kamu]');

        const draft = await callAI(finalPrompt, 'fast');

        if (!draft) throw new Error("AI failed to generate draft");

        // SIMPAN KEDUANYA KE DB
        await prisma.lead.update({
            where: { id: leadId },
            data: { 
                outreachDraft: draft,
                baitDraft: baitDraft
            }
        });

        revalidatePath('/leads');
        revalidatePath('/dashboard/leads');
        return { success: true, draft, baitDraft };
    } catch (error: any) {
        console.error("[Outreach Error]:", error.message);
        return { success: false, message: error.message };
    }
}

export async function generateProposalDraft(
    leadId: string, 
    inputs: {
        prices: { tier1: string, tier2: string, tier3: string },
        overrides?: Record<string, string>,
        selectedStyleId: string
    },
    jobId?: string
) {
    const user = await getCurrentUser();
    if (!user) {
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: 'Unauthorized' });
        return { success: false, message: 'Unauthorized' };
    }

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) throw new Error("Lead not found");

        const { buildHtmlProposalPrompt } = await import('@/lib/prompts');

        const data = {
            businessName: inputs.overrides?.businessName || lead.name,
            category: inputs.overrides?.category || lead.category,
            city: inputs.overrides?.city || lead.city || "-",
            address: inputs.overrides?.address || lead.address || "-",
            rating: inputs.overrides?.rating || lead.rating.toString(),
            reviewsCount: inputs.overrides?.reviewsCount || (lead.reviewCount || 0).toString(),
            currentWebsite: inputs.overrides?.currentWebsite || lead.website || "Belum ada",
            igUsername: inputs.overrides?.igUsername || lead.ig || "-",
            painPoints: inputs.overrides?.painPoints || lead.painPoints || "Belum teridentifikasi",
            brandTagline: inputs.overrides?.brandTagline || (lead.brandData as any)?.tagline || "-",
            styleDNA: inputs.overrides?.styleDNA || lead.styleDNA || "Profesional",
            myBusinessName: inputs.overrides?.myBusinessName || user.businessName || "Web Consultant",
            myWa: inputs.overrides?.myWa || user.businessWa || "-",
            myIg: inputs.overrides?.myIg || user.businessIg || "-",
            price1: inputs.prices.tier1,
            price2: inputs.prices.tier2,
            price3: inputs.prices.tier3,
        };

        if (jobId) {
            JobRegistry.updateJob(jobId, { progress: 30, message: 'Consulting AI Architect for Proposal Design...' });
        }

        const finalPrompt = buildHtmlProposalPrompt(data, inputs.selectedStyleId);

        const draft = await callAI(finalPrompt, 'fast');

        if (!draft) throw new Error("AI failed to generate proposal");

        // Clean up markdown code fences if AI added them
        const cleanDraft = draft.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();

        // PERSIST TO DB
        try {
            const { saveProposal } = await import('./proposal');
            await saveProposal({
                leadId,
                html: cleanDraft,
                styleId: inputs.selectedStyleId,
                prices: inputs.prices,
                clientOverrides: inputs.overrides
            });
        } catch (dbErr) {
            console.error("[Proposal DB Persistence Error]:", dbErr);
        }

        if (jobId) {
            JobRegistry.updateJob(jobId, { 
                status: 'COMPLETED', 
                progress: 100, 
                message: 'Proposal generated successfully!',
                data: { draft: cleanDraft }
            });
        }

        return { success: true, draft: cleanDraft };
    } catch (error: any) {
        console.error("[Proposal Generation Error]:", error.message);
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: error.message });
        return { success: false, message: error.message };
    }
}

export async function generateFollowUpDraft(leadId: string, followupNumber: number, persona: string = 'professional', jobId?: string) {
    const user = await getCurrentUser();
    if (!user) {
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: 'Unauthorized' });
        return { success: false, message: 'Unauthorized' };
    }

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) throw new Error("Lead not found");

        const personaDefinition = OUTREACH_PERSONAS[persona] || OUTREACH_PERSONAS['professional'];
        
        const link = lead.status === 'LIVE'
            ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://auto-forge.pro'}/${lead.slug || lead.id}`
            : `${process.env.NEXT_PUBLIC_APP_URL || 'https://auto-forge.pro'}/preview/${lead.slug || lead.id}`;

        const finalPrompt = FOLLOWUP_GENERATOR_PROMPT
            .replace(/\[category\]/g, lead.category)
            .replace('{{followup_number}}', followupNumber.toString())
            .replace('[persona_definition]', personaDefinition)
            .replace(/{{name}}/g, lead.name)
            .replace('{{link}}', link)
            .replace('{{my_business_name}}', user.businessName || '[Nama Bisnis Kamu]')
            .replace('{{my_ig}}', user.businessIg || '[IG Kamu]')
            .replace('{{my_wa}}', user.businessWa || '[WA Kamu]');

        if (jobId) {
            JobRegistry.updateJob(jobId, { progress: 40, message: `Crafting Follow-up #${followupNumber} Persona: ${persona}...` });
        }

        const draft = await callAI(finalPrompt, 'fast');

        if (!draft) throw new Error("AI failed to generate follow-up draft");

        // Prepare WA Link
        const { generateWaLink } = await import('./settings');
        const waLinkRes = await generateWaLink(lead.wa, draft);
        const finalWaLink = waLinkRes.success ? waLinkRes.url : '';

        // SAVE to FollowupQueue
        const existingQueue = await prisma.followupQueue.findFirst({
            where: {
                prospectId: leadId,
                followupNumber: followupNumber
            }
        });

        if (existingQueue) {
            await prisma.followupQueue.update({
                where: { id: existingQueue.id },
                data: {
                    messageText: draft,
                    waLink: finalWaLink || '',
                    status: 'pending'
                }
            });
        } else {
            await prisma.followupQueue.create({
                data: {
                    prospectId: leadId,
                    followupNumber: followupNumber,
                    messageText: draft,
                    waLink: finalWaLink || '',
                    status: 'pending'
                }
            });
        }

        if (jobId) {
            JobRegistry.updateJob(jobId, { 
                status: 'COMPLETED', 
                progress: 100, 
                message: 'Follow-up draft ready!',
                data: { draft, waLink: finalWaLink }
            });
        }

        return { success: true, draft, waLink: finalWaLink };
    } catch (error: any) {
        console.error("[Follow-Up Error]:", error.message);
        if (jobId) JobRegistry.updateJob(jobId, { status: 'FAILED', message: error.message });
        return { success: false, message: error.message };
    }
}
