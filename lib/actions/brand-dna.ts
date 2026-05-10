'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { buildForgeData } from '@/lib/prompts';
import { getEffectivePrompt } from '@/lib/actions/prompt';
import { sanitizeWaNumber } from '@/lib/utils';
import { callAI } from '@/lib/actions/ai';
import { BLUEPRINT_ENRICHMENT_PROMPT, WEBSITE_STRATEGY_PROMPT } from '@/lib/prompts';
export async function getBrandDnaLeads(filters: {
    query?: string,
    category?: string,
    city?: string,
    district?: string
}) {
    const session = await getSession();
    if (!session) return [];

    return prisma.lead.findMany({
        where: {
            userId: session.userId,
            status: 'LIVE', // Hanya tampilkan data yang sudah LIVE (minimal uji coba)
            htmlCode: { not: null }, // Pastikan sudah ada dummy website-nya
            name: filters.query ? { contains: filters.query, mode: 'insensitive' } : undefined,
            category: filters.category || undefined,
            city: filters.city || undefined,
            district: filters.district || undefined,
        },
        include: {
            brandDna: true
        },
        orderBy: {
            updatedAt: 'desc'
        },
        take: 50
    });
}

export async function generateBrandDnaLink(leadId: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        const existing = await prisma.brandDnaSubmission.findUnique({
            where: { leadId }
        });

        if (existing) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            return { 
                success: true, 
                link: `${baseUrl}/b/${existing.token}`,
                token: existing.token
            };
        }

        const created = await prisma.brandDnaSubmission.create({
            data: {
                leadId,
                status: 'PENDING'
            }
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        revalidatePath('/dashboard/brand-dna');
        
        return { 
            success: true, 
            link: `${baseUrl}/b/${created.token}`,
            token: created.token
        };
    } catch (error) {
        console.error('Generate BrandDNA error:', error);
        return { success: false, message: 'Failed to generate link' };
    }
}

export async function getUniqueCategories() {
    const session = await getSession();
    if (!session) return [];

    const categories = await prisma.lead.findMany({
        where: { 
            userId: session.userId,
            status: 'LIVE',
            htmlCode: { not: null }
        },
        select: { category: true },
        distinct: ['category']
    });

    return categories.map(c => c.category);
}

export async function assembleAndSaveFinalPrompt(leadId: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId }
        });

        if (!lead) return { success: false, message: 'Lead not found' };

        const submission = await prisma.brandDnaSubmission.findUnique({ where: { leadId } });
        const answers = (submission?.answers as any) || null;
        const logoUrl = submission?.logoPath || null;
        const mediaUrls = (submission?.mediaFiles as string[] | null) || [];
        const hasBlueprint = !!answers;
        const hasCustomAssets = !!(logoUrl || mediaUrls.length > 0);

        const promptTemplate = await getEffectivePrompt('MASTER_FORGE_PROMPT');
        const forgeData = buildForgeData(lead);
        const fullAddress = `${lead.address || 'Bali'}, ${lead.city || ''}, ${lead.province || ''}`.trim().replace(/,\s*,/g, ',');

        const customAssetsBlock = hasCustomAssets ? `
[CLIENT CUSTOM ASSETS — MANDATORY, PRIORITAS TERTINGGI]
Klien telah menyediakan aset visual nyata berikut ini. WAJIB gunakan aset ini. Jangan ganti dengan Unsplash, placeholder, atau gambar lain.

${logoUrl ? `LOGO KLIEN (WebP URL): ${logoUrl}
→ Gunakan sebagai <img src="${logoUrl}"> di: navbar logo, footer logo.
→ Jangan render teks nama brand sebagai pengganti logo jika ada URL ini.` : ''}

${mediaUrls.length > 0 ? `GAMBAR KONTEN KLIEN:
${mediaUrls.map((u: string, i: number) => `  ${i + 1}. ${u}`).join('\n')}
→ Gunakan gambar-gambar ini di: Hero background, Gallery section, About/Story section, Product showcase.
→ Untuk section yang sudah punya gambar klien di atas, JANGAN gunakan Unsplash.` : ''}

⚠️ Aset di atas adalah GAMBAR NYATA dari klien. Embed semua ke dalam HTML output.
` : '';

        const blueprintContext = answers ? `
Brand Name: ${answers.brand_name || lead.name}
One-liner: ${answers.oneliner || ''}
Tagline: ${answers.tagline || ''}
Target: ${answers.target || ''}
USP: ${answers.usp || ''}
Vibe: ${answers.vibe ? answers.vibe.join(', ') : ''}
Tone: ${JSON.stringify(answers.tone || {})}
Keywords: ${answers.kw ? answers.kw.join(', ') : ''} ${answers.kw_extra || ''}
Goal: ${answers.wg ? answers.wg.join(', ') : ''}
Colors: ${answers.colors || ''}
Pages: ${answers.pg ? answers.pg.join(', ') : ''}
Web Refs: ${answers.webref || ''}
Notes: ${answers.notes || ''}
` : '';

        // --- STEP 1: AI ENRICHMENT (Sintesis Blueprint ke Strategy JSON) ---
        const aiEnrichPrompt = BLUEPRINT_ENRICHMENT_PROMPT.replace('[clientAnswers]', blueprintContext);
        const researchRaw = await callAI(aiEnrichPrompt, 'fast');
        
        if (!researchRaw) throw new Error("AI failed to enrich blueprint data");

        const resData = JSON.parse(researchRaw.replace(/```json/g, '').replace(/```/g, '').trim());

        // Extract synthesized data
        const painPoints = Array.isArray(resData.painPoints) ? resData.painPoints.join(', ') : (resData.painPoints || "");
        const resolvingIdea = resData.branding?.description || resData.resolutions?.[0] || "";
        const styleDNA = resData.styleDNA || "";

        // --- STEP 2: STRATEGY ASSEMBLY (Generate masterWebsitePrompt Paragraf) ---
        const stratPrompt = WEBSITE_STRATEGY_PROMPT
            .replace('[brandName]', answers?.brand_name || lead.name)
            .replace('[category]', lead.category)
            .replace('[painPoints]', painPoints)
            .replace('[resolvingIdea]', resolvingIdea)
            .replace('[styleDNA]', styleDNA)
            .replace('[analysis]', JSON.stringify(resData))
            .replace('[industryPattern]', forgeData.industryPattern)
            .replace('[industryStylePriority]', forgeData.industryStylePriority)
            .replace('[industryColorMood]', forgeData.industryColorMood)
            .replace('[industryKeyEffects]', forgeData.industryKeyEffects)
            .replace('[industryAvoidPatterns]', forgeData.industryAvoidPatterns)
            .replace('[unsplashQueries]', forgeData.unsplashQueries)
            .replace('[selectedArchetype]', forgeData.selectedArchetype);

        const masterPrompt = await callAI(stratPrompt, 'fast');

        // --- STEP 3: UPDATE LEAD WITH SYNTESIZED DATA ---
        await prisma.lead.update({
            where: { id: leadId },
            data: { 
                painPoints: painPoints,
                resolvingIdea: resolvingIdea,
                styleDNA: styleDNA,
                masterWebsitePrompt: masterPrompt || researchRaw, // Simpan strategy paragraph
                aiAnalysis: resData // Simpan JSON analisis
            }
        });

        revalidatePath('/dashboard/enriched');
        revalidatePath('/dashboard/live');
        revalidatePath('/dashboard/brand-dna');

        return { success: true, prompt: masterPrompt || researchRaw };
    } catch (error: any) {
        console.error("Assemble Prompt Error:", error);
        return { success: false, message: error.message };
    }
}

export async function getEnrichBlueprintLeads(filters: {
    query?: string,
    category?: string,
    city?: string,
    district?: string
}) {
    const session = await getSession();
    if (!session) return [];

    return prisma.lead.findMany({
        where: {
            userId: session.userId,
            brandDna: {
                isNot: null
            },
            name: filters.query ? { contains: filters.query, mode: 'insensitive' } : undefined,
            category: filters.category || undefined,
            city: filters.city || undefined,
            district: filters.district || undefined,
        },
        include: {
            brandDna: true
        },
        orderBy: {
            updatedAt: 'desc'
        },
        take: 50
    });
}

export async function getBrandFolderAssets(leadId: string) {
    const session = await getSession();
    if (!session) return [];

    try {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { brandDna: true }
        });

        if (!lead || !lead.brandDna?.token) return [];

        const { listR2Files } = await import('@/lib/r2-storage');
        
        const sanitizedBusinessName = lead.name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
            
        const folderPath = `brand-assets/${sanitizedBusinessName}-${lead.brandDna.token.slice(0, 8)}`;
        
        const files = await listR2Files(folderPath);
        return files;
    } catch (error) {
        console.error('getBrandFolderAssets error:', error);
        return [];
    }
}
