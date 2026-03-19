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
    WEBSITE_STRATEGY_PROMPT,
    ENRICHMENT_PROMPT,
    MASTER_PRO_BLUEPRINT_PROMPT,
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

async function callKieAI(prompt: string, modelType: 'gemini' | 'gpt' | 'claude') {
    const user = await getCurrentUser();
    const apiKey = user?.kieAiApiKey || process.env.KIE_AI_API_KEY;
    if (!apiKey) throw new Error("API Key Missing");

    let url = "";
    let body: any = {};

    // 1. MAPPING REQUEST BODY (STRICT PROTOCOL)
    if (modelType === 'gpt') {
        // SPEK GPT 5.2 KIE.AI (HIGH REASONING + WEB SEARCH)
        url = "https://api.kie.ai/gpt-5-2/v1/chat/completions";
        body = { 
            messages: [{ 
                role: "user", 
                content: [{ type: "text", text: prompt }] // WAJIB ARRAY
            }],
            stream: false,
            reasoning_effort: "high", // Otak Pro Max
            tools: [{ type: "function", function: { name: "web_search" } }]
        };
    } else if (modelType === 'gemini') {
        // SPEK GEMINI (KIE.AI STYLE)
        url = "https://api.kie.ai/gemini-3-flash/v1/chat/completions";
        body = { 
            messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
            stream: false
        };
    } else {
        // SPEK CLAUDE
        url = "https://api.kie.ai/claude/v1/messages";
        body = { 
            model: "claude-3-5-sonnet", 
            max_tokens: 4096,
            messages: [{ role: "user", content: prompt }] 
        };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180000) // 3 Menit (GPT 5.2 mikirnya lama)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Kie.ai Error: ${data.msg || 'Rejected'}`);

    // 2. PARSING LOGIC (Cari teks di mana saja)
    return data.choices?.[0]?.message?.content || 
           data.candidates?.[0]?.content?.parts?.[0]?.text || 
           data.content?.[0]?.text || null;
}

export async function enrichLead(leadId: string, skipCreditCheck: boolean = false, modelType: 'gemini' | 'gpt' | 'claude' = 'gemini') {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { success: false, message: 'Lead not found' };

    if (!isValidWhatsApp(lead.wa)) return { success: false, message: 'Invalid WhatsApp number' };
    if (lead.status !== 'FRESH') return { success: false, message: 'Lead already processed' };

    const isPro = modelType !== 'gemini';

    try {
        const reviews = Array.isArray(lead.reviews)
            ? (lead.reviews as any[])
                .map(r => (typeof r === 'object' && r?.Description) ? r.Description : String(r))
                .filter(Boolean)
                .slice(0, 5) 
            : [];

        const promptType = isPro ? 'PRO_FORGE_PROMPT' : 'ENRICHMENT_PROMPT';
        const basePrompt = await getEffectivePrompt(promptType);
        
        let finalPrompt = basePrompt
            .replace("[Business Name]", lead.name)
            .replace("[name]", lead.name)
            .replace("[Category]", lead.category)
            .replace("[category]", lead.category)
            .replace("[phone]", lead.wa)
            .replace("[address]", lead.address || 'Bali');

        if (!isPro) {
            const styleSummary = await getStyleSummary();
            finalPrompt = finalPrompt
                .replace("[Pain Points]", "Analyzed from reviews below")
                .replace("[Style Models JSON]", styleSummary);
            finalPrompt += `\n\nDATA REVIEW TO ANALYZE (Top 5):\n${reviews.join(' | ')}`;
        }

        const systemInstruction = isPro 
            ? "You are a Senior Web Architect & Business Strategist. " 
            : "You are a lead enrichment specialist. Return JSON format. ";
        
        const aiResponse = await callKieAI(systemInstruction + finalPrompt, modelType);

        if (aiResponse) {
            let updateData: any = {
                status: 'ENRICHED',
                isPro: isPro,
                masterWebsitePrompt: aiResponse
            };

            if (!isPro) {
                try {
                    const jsonResult = JSON.parse(cleanAIResponse(aiResponse));
                    updateData.brandData = jsonResult.branding || jsonResult;
                    updateData.aiAnalysis = jsonResult;
                    updateData.painPoints = Array.isArray(jsonResult.painPoints) ? jsonResult.painPoints.join(', ') : jsonResult.painPoints;
                    updateData.resolvingIdea = jsonResult.resolvingIdea || jsonResult.branding?.description || '';
                    updateData.resolutions = jsonResult.resolutions || [];
                    updateData.suggestedAssets = jsonResult.suggestedAssets || [];
                } catch (e) {
                    console.warn("JSON Parse failed for standard enrichment, fallback to raw prompt", e);
                }
            }

            await prisma.lead.update({
                where: { id: leadId },
                data: updateData
            });

            await logActivity(leadId, 'ENRICH', `Enriched using ${modelType}`, { 
                model: modelType,
                isPro
            });

            revalidatePath('/dashboard/leads');
            return { success: true, message: `${lead.name} enriched successfully.` };
        }
        return { success: false, message: 'AI returned no data' };
    } catch (error: any) {
        console.error(`[Enrichment Error] ${lead.name}:`, error);
        return { success: false, message: error.message };
    }
}


export async function batchEnrichLeads(ids: string[], modelType: 'gemini' | 'gpt' | 'claude' = 'gemini') {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    for (const id of ids) {
        try {
            const lead = await prisma.lead.findUnique({ where: { id } });
            if (!lead) continue;

            // STEP 1: ENRICHMENT (Riset & Analisis JSON)
            const researchRaw = await callKieAI(
                ENRICHMENT_PROMPT
                    .replace('[name]', lead.name)
                    .replace('[category]', lead.category), 
                modelType
            );
            
            if (!researchRaw) continue;

            try {
                const resData = JSON.parse(researchRaw.replace(/```json/g, '').replace(/```/g, '').trim());

                // STEP 2: STRATEGY (Blueprint Paragraf)
                const stratPrompt = WEBSITE_STRATEGY_PROMPT
                    .replace('[brandName]', lead.name)
                    .replace('[category]', lead.category)
                    .replace('[painPoints]', Array.isArray(resData.painPoints) ? resData.painPoints.join(', ') : (resData.painPoints || ""))
                    .replace('[resolvingIdea]', resData.branding?.description || resData.aiAnalysis?.branding || "")
                    .replace('[styleDNA]', "Modern, Premium, and Professional")
                    .replace('[analysis]', JSON.stringify(resData));

                const masterPrompt = await callKieAI(stratPrompt, modelType);

                // DATABASE UPDATE (SIMPAN KE KOLOM YANG BENER)
                await prisma.lead.update({
                    where: { id },
                    data: {
                        brandData: resData.brandData || resData.branding || {},
                        aiAnalysis: resData.aiAnalysis || resData,
                        painPoints: Array.isArray(resData.painPoints) ? resData.painPoints.join(', ') : (resData.painPoints || ""),
                        masterWebsitePrompt: masterPrompt || researchRaw, // Blueprint dewa
                        status: 'ENRICHED',
                        isPro: modelType !== 'gemini',
                        lastLog: `Success: Double-Step via ${modelType.toUpperCase()}`
                    }
                });

                await logActivity(id, 'ENRICH', `Unified Double-Step Enriched via ${modelType.toUpperCase()}`, { model: modelType });
            } catch (e) {
                console.error(`Error parsing JSON on ${id}:`, e);
                // Fallback: simpan raw ke master prompt aja kalau gagal
                await prisma.lead.update({
                    where: { id },
                    data: {
                        masterWebsitePrompt: researchRaw,
                        status: 'ENRICHED',
                        isPro: modelType !== 'gemini',
                        lastLog: `Fallback: Raw Enrichment via ${modelType.toUpperCase()} (JSON Parse Failed)`
                    }
                });
            }
        } catch (error: any) {
            console.error(`[Batch Enrich Error] ${id}:`, error.message);
        }
    }
    
    revalidatePath('/leads');
    revalidatePath('/dashboard/leads');
    return { success: true };
}

// --- Website Generation (Forge) ---

export async function generateForgeCode(leadId: string, isPro: boolean = false) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) throw new Error("Lead tidak ditemukan");

        // Gunakan engine baru
        const modelType = isPro ? 'gpt' : 'gemini';
        
        const systemPrompt = isPro 
            ? "You are a Senior Web Architect. Forge this master prompt into a CINEMATIC luxury landing page with world-class UI/UX, smooth transitions, and high-converting copy. Use Tailwind CSS and ensure the code is production-ready."
            : "You are a Web Designer. Create a basic functional HTML structure based on this prompt. Focus on clarity and standard layouts. Use Tailwind CSS.";

        const promptTemplate = await getEffectivePrompt(isPro ? 'PRO_FORGE_PROMPT' : 'MASTER_FORGE_PROMPT');
        const finalPrompt = promptTemplate
            .replace('[name]', lead.name)
            .replace('[category]', lead.category)
            .replace('[phone]', lead.wa)
            .replace('[address]', lead.address || 'Bali');

        const htmlContent = await callKieAI(systemPrompt + "\n\n" + finalPrompt, modelType);
        
        if (!htmlContent || htmlContent.length < 500) throw new Error("Output AI korup atau terlalu pendek.");

        // Clean & Update
        const cleanHtml = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                htmlCode: cleanHtml,
                status: 'LIVE',
                isPro: isPro,
                lastLog: `Success via ${modelType} at ${new Date().toISOString()}`
            }
        });

        revalidatePath('/dashboard/enriched');
        revalidatePath('/dashboard/live');

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
            .replace("[waLink]", `https://wa.me/${lead.wa}`)
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

        const aiResponse = await callKieAI("Return JSON. " + prompt, 'gemini');
        
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
            styleId, 
            model: "gemini"
        });

        revalidatePath('/dashboard/live');
        revalidatePath(`/${lead.slug || lead.id}`);
        
        return { success: true, masterWebsitePrompt, htmlCode };
    } catch (error: any) {
        console.error('Tweak Error:', error);
        return { success: false, message: error.message || 'Tweak failed' };
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

        // 3. Panggil Kie.ai (Cukup pake Gemini-3-Flash biar irit, karena cuma hasilin teks)
        const refinedBlueprint = await callKieAI(finalPrompt, 'gemini');

        if (!refinedBlueprint) throw new Error("AI failed to refine blueprint");

        // 4. Update Database (Update masterWebsitePrompt dengan blueprint baru)
        await prisma.lead.update({
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
        return { success: true };
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

        const aiResponse = await callKieAI("Return JSON. " + prompt, 'gemini');
        
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
