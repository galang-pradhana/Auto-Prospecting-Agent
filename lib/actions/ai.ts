'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession, getCurrentUser } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';
import * as fsPromises from 'fs/promises';
import { cleanAIResponse, isValidWhatsApp, sanitizeWaNumber } from '@/lib/utils';
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
    OUTREACH_PERSONAS,
    buildForgeData,
} from '@/lib/prompts';
import { getEffectivePrompt } from './prompt';
import { getUserSettings } from './settings';

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
            next: { revalidate: 60 },
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

export async function callKieAI(prompt: string) {
    const user = await getCurrentUser();
    
    // LOGIKA FALLBACK: Prioritas DB User -> Fallback ke .env Server
    const apiKey = user?.kieAiApiKey || process.env.KIE_AI_API_KEY;

    if (!apiKey) {
        throw new Error("API Key tidak ditemukan di Database maupun .env. Mesin mogok!");
    }

    const url = "https://api.kie.ai/gemini-3.1-pro/v1/chat/completions";
    const body = { 
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
        stream: false
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(180000) 
        });

        const data = await response.json();
        if (!response.ok) {
            console.error(`[Kie.ai Error] ${url}:`, data);
            throw new Error(`Kie.ai Error: ${data.msg || data.message || 'Rejected'}`);
        }

        // PARSING LOGIC (Cari teks di mana saja)
        const content = data.choices?.[0]?.message?.content || 
               data.candidates?.[0]?.content?.parts?.[0]?.text || 
               data.content?.[0]?.text;
        
        if (!content) {
            console.error("[Kie.ai Error] Empty content result:", data);
            throw new Error("AI returned no content.");
        }

        return content;
    } catch (error: any) {
        console.error(`[callKieAI Failure]:`, error.message);
        throw error;
    }
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

            const researchRaw = await callKieAI(
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
                    .replace('[unsplashQueries]', forgeData.unsplashQueries);

                const masterPrompt = await callKieAI(stratPrompt);

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
    }

    if (jobId) {
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

export async function generateForgeCode(leadId: string, jobId?: string) {
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
            .replace('[fullAddress]', fullAddress)   // FIX: sesuai template MASTER_FORGE_PROMPT
            .replace('[address]', lead.address || 'Bali')
            .replace('[waLink]', `https://wa.me/${sanitizeWaNumber(lead.wa)}`)
            .replace('[phone]', lead.wa)
            .replace('[styleDNA]', lead.styleDNA || 'Modern, Professional and Premium')
            .replace('[painPoints]', lead.painPoints || 'Kurangnya digital presence yang profesional')  // FIX
            .replace('[resolvingIdea]', lead.resolvingIdea || 'Website premium yang konversi tinggi')    // FIX
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

        const htmlContent = await callKieAI(systemPrompt + "\n\n" + finalPrompt);
        
        if (!htmlContent || htmlContent.length < 500) throw new Error("Output AI korup atau terlalu pendek.");

        if (jobId) {
            JobRegistry.updateJob(jobId, {
                progress: 90,
                message: `Finalizing and saving Database for ${lead.name}...`
            });
        }

        // Clean & Update
        const cleanHtml = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                htmlCode: cleanHtml,
                status: 'LIVE',
                isPro: false,
                lastLog: `Success via GEMINI 3.1 PRO at ${new Date().toISOString()}`
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

        const aiResponse = await callKieAI("Return JSON. " + prompt);
        
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

export async function tweakLeadStyleStrict(leadId: string, styleId: string, instructions?: string, previewOnly: boolean = false, jobId?: string) {
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

        const aiResponse = await callKieAI(prompt);
        
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

export async function refineLeadStyle(leadId: string, styleId: string) {
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

        // 3. Panggil Kie.ai
        const refinedBlueprint = await callKieAI(finalPrompt);

        if (!refinedBlueprint) throw new Error("AI failed to refine blueprint");

        // 4. Update Database (Update masterWebsitePrompt dengan blueprint baru)
        const updatedLead = await prisma.lead.update({
            where: { id: leadId },
            data: {
                masterWebsitePrompt: refinedBlueprint,
                selectedStyle: styleId, // Simpan ID style yang dipilih
                lastLog: `Style Refined: ${selectedModel.name}`
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

        const aiResponse = await callKieAI("Return JSON. " + prompt);
        
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

        // Pakai variabel yang sudah ada dari hasil Enrichment
        const finalPrompt = OUTREACH_GENERATOR_PROMPT
            .replace('[persona_definition]', personaDefinition)
            .replace('[category]', lead.category)
            .replace('{{name}}', lead.name)
            .replace('[category]', lead.category)
            .replace('{{pain_points}}', lead.painPoints || 'Kurangnya identitas digital yang kuat')
            .replace('{{idea}}', lead.masterWebsitePrompt || 'Landing page premium')
            .replace('{{link}}', lead.status === 'LIVE'
                ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://auto-forge.pro'}/${lead.slug || lead.id}`
                : `${process.env.NEXT_PUBLIC_APP_URL || 'https://auto-forge.pro'}/preview/${lead.slug || lead.id}`)
            .replace('{{my_business_name}}', user.businessName || '[Nama Bisnis Kamu]')
            .replace('{{my_ig}}', user.businessIg || '[IG Kamu]')
            .replace('{{my_wa}}', user.businessWa || '[WA Kamu]');

        const draft = await callKieAI(finalPrompt);

        if (!draft) throw new Error("AI failed to generate draft");

        // SIMPAN KE DB
        await prisma.lead.update({
            where: { id: leadId },
            data: { outreachDraft: draft }
        });

        revalidatePath('/leads');
        revalidatePath('/dashboard/leads');
        return { success: true, draft };
    } catch (error: any) {
        console.error("[Outreach Error]:", error.message);
        return { success: false, message: error.message };
    }
}
