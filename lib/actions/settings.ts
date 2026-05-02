'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession, getCurrentUser } from '@/lib/auth';
import { sanitizeWaNumber } from '@/lib/utils';
import { OUTREACH_GENERATOR_PROMPT, OUTREACH_PERSONAS } from '@/lib/prompts';
import { getUserSettings, updateUserSettings } from './user-settings';
import { callAI } from './ai';

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
        const personaDefinition = OUTREACH_PERSONAS['professional'];
        const prompt = OUTREACH_GENERATOR_PROMPT
            .replace("[persona_definition]", personaDefinition)
            .replace("[category]", category)
            .replace("{{name}}", "[Business Name]")
            .replace("{{pain_points}}", "[Specific Pain Points]")
            .replace("{{idea}}", "[Our Proposed Solution]")
            .replace("{{link}}", "[Preview Link]")
            .replace("{{my_business_name}}", settings?.businessName || "[Nama Bisnis]")
            .replace("{{my_ig}}", settings?.businessIg || "[IG Kamu]")
            .replace("{{my_wa}}", settings?.businessWa || "[WA Kamu]");

        const draft = await callAI(prompt, 'fast');
        return { success: true, draft };
    } catch (error) {
        console.error('Generate WA Template Draft error:', error);
        return { success: false, message: 'Server error' };
    }
}

export async function generateWaLink(leadId: string, templateId?: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { success: false, message: 'Lead not found' };

        let template = null;
        if (templateId) template = await prisma.waTemplate.findUnique({ where: { id: templateId } });
        if (!template) template = await prisma.waTemplate.findFirst({ where: { category: lead.category } });
        if (!template) template = await prisma.waTemplate.findFirst({ where: { isDefault: true } });

        let message = '';
        let activeTemplateName = '';
        const settings = await getUserSettings();

        // Helper untuk link: Jika status LIVE, pakai link bersih, jika tidak pakai /preview/
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const finalLink = lead.status === 'LIVE' 
            ? `${baseUrl}/${lead.slug || lead.id}`
            : `${baseUrl}/preview/${lead.slug || lead.id}`;

        const footer = `\n\n---\nBest regards,\n*${settings?.businessName || 'Indie Dev'}*\nWA: ${settings?.businessWa || '-'}\nIG: ${settings?.businessIg || '-'}`;

        if (template) {
            activeTemplateName = template.title;
            message = template.content
                .replace(/{{name}}/g, lead.name)
                .replace(/{{category}}/g, lead.category)
                .replace(/{{idea}}/g, lead.resolvingIdea || 'solusi digital')
                .replace(/{{pain_points}}/g, lead.painPoints || 'kebutuhan bisnis')
                .replace(/{{link}}/g, finalLink)
                .replace(/{{my_business_name}}/g, settings?.businessName || '')
                .replace(/{{my_ig}}/g, settings?.businessIg || '')
                .replace(/{{my_wa}}/g, settings?.businessWa || '');
            
            // Tambahkan footer otomatis jika belum ada identitas di dalam template
            if (!message.includes(settings?.businessName || '###')) {
                message += footer;
            }
        } else {
            activeTemplateName = 'AI Generated (Fallback)';
            const personaDefinition = OUTREACH_PERSONAS['casual'];
            const prompt = OUTREACH_GENERATOR_PROMPT
                .replace("[persona_definition]", personaDefinition)
                .replace("[category]", lead.category)
                .replace("{{name}}", lead.name)
                .replace("{{pain_points}}", lead.painPoints || 'kebutuhan bisnis')
                .replace("{{idea}}", lead.resolvingIdea || 'solusi digital')
                .replace("{{link}}", finalLink);

            const draft = await callAI(prompt, 'fast');
            message = draft + footer;
        }

        const sanitizedPhone = sanitizeWaNumber(lead.wa);
        const waUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
        return { success: true, url: waUrl, message, templateName: activeTemplateName };
    } catch (error) {
        console.error('Generate WA Link error:', error);
        return { success: false, message: 'Failed to generate link' };
    }
}

// --- AI Status & Pulse ---

export async function checkAiStatus(manualKey?: string, provider?: string, forcePing = false) {
    const user = await getCurrentUser();
    const currentProvider = provider || user?.aiProvider || 'kie';
    
    // Low-verbosity logging for routine checks
    if (forcePing) {
        console.log(`[checkAiStatus] Starting FULL health check for provider: ${currentProvider}`);
    }

    if (currentProvider === 'kie') {
        const apiKey = manualKey || user?.kieAiApiKey || process.env.KIE_AI_API_KEY;
        if (!apiKey) return { success: false, message: 'API Key Kie.ai kosong.' };

        // 1. Fetch Credits (The lightweight "Ping")
        let credit = '0';
        try {
            const resCredit = await fetch("https://api.kie.ai/api/v1/chat/credit", {
                headers: { "Authorization": `Bearer ${apiKey}` },
                signal: AbortSignal.timeout(5000),
                cache: 'no-store'
            });
            if (resCredit.ok) {
                const creditData = await resCredit.json();
                credit = typeof creditData.data === 'object' ? creditData.data?.credit : creditData.data;
                
                // If we just need a routine check, credit success is enough
                if (!forcePing) {
                    return { success: true, message: 'Engine Ready!', credit: credit || '0', engine: 'Kie.ai' };
                }
            } else if (!forcePing) {
                return { success: false, message: 'Kie.ai API Key Invalid or Service Offline' };
            }
        } catch (e) {
            if (!forcePing) return { success: false, message: 'Kie.ai Connection Failed' };
        }

        // 2. Actual Ping Test (Only if forced)
        const url = "https://api.kie.ai/gemini-3.1-pro/v1/chat/completions";
        const testPrompt = "READY?";
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [
                        { role: "user", content: [{ type: "text", text: testPrompt }] }
                    ],
                    max_tokens: 5,
                    stream: false
                }),
                cache: 'no-store',
                signal: AbortSignal.timeout(15000)
            });
            
            if (response.ok) {
                return { success: true, message: 'Engine Ready!', credit: credit || '0', engine: 'Kie.ai' };
            }
            return { success: false, message: 'Kie.ai Rejected Ping.' };
        } catch (error) {
            return { success: false, message: 'Kie.ai Ping Timeout.' };
        }
    } else {
        // OpenRouter
        const apiKey = manualKey || user?.openrouterApiKey || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API;
        if (!apiKey) return { success: false, message: 'API Key OpenRouter kosong.' };

        // 1. Fetch Credits (The lightweight "Ping")
        let credit = '0';
        try {
            const resCredit = await fetch("https://openrouter.ai/api/v1/credits", {
                headers: { "Authorization": `Bearer ${apiKey}` },
                signal: AbortSignal.timeout(5000),
                cache: 'no-store'
            });
            if (resCredit.ok) {
                const creditData = await resCredit.json();
                credit = creditData.data?.total_credits?.toFixed(2) || '0';
                
                if (!forcePing) {
                    return { success: true, message: 'Engine Ready!', credit: credit, engine: 'OpenRouter' };
                }
            } else if (!forcePing) {
                return { success: false, message: 'OpenRouter API Key Invalid' };
            }
        } catch (e) {
            if (!forcePing) return { success: false, message: 'OpenRouter Connection Failed' };
        }

        // 2. Actual Ping Test (Only if forced)
        const url = "https://openrouter.ai/api/v1/chat/completions";
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    "Authorization": `Bearer ${apiKey}`, 
                    "Content-Type": "application/json",
                    "X-Title": "Automated Prospecting Engine"
                },
                body: JSON.stringify({
                    model: "deepseek/deepseek-v4-pro",
                    messages: [{ role: "user", content: "READY?" }],
                    max_tokens: 5
                }),
                cache: 'no-store',
                signal: AbortSignal.timeout(15000)
            });
            
            if (response.ok) {
                return { success: true, message: 'Engine Ready!', credit: credit, engine: 'OpenRouter' };
            }
            return { success: false, message: 'OpenRouter Rejected Ping.' };
        } catch (error: any) {
            return { success: false, message: 'OpenRouter Ping Timeout.' };
        }
    }
}

// Backward compatibility
export async function checkKieStatus(manualKey?: string) {
    return checkAiStatus(manualKey, 'kie');
}

export async function getAiPulseStatus() {
    try {
        const user = await getCurrentUser();
        const status = await checkAiStatus();
        
        if (status.success) {
            return {
                status: 'online',
                color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                pulseColor: 'bg-emerald-500',
                label: status.credit !== 'N/A' ? `Ready: ${status.credit}` : 'Ready (OR)',
                credit: status.credit,
                provider: user?.aiProvider || 'kie'
            };
        } else {
            return {
                status: 'error',
                color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                pulseColor: 'bg-rose-500',
                label: 'AI Disconnected',
                provider: user?.aiProvider || 'kie'
            };
        }
    } catch (e) {
        return {
            status: 'warning',
            color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            pulseColor: 'bg-amber-500',
            label: 'Connection Lag',
        };
    }
}

export async function getAiUsageHistory(page: number = 1, limit: number = 10) {
    const session = await getSession();
    if (!session) return { success: false, data: [], total: 0 };

    try {
        const skip = (page - 1) * limit;

        const [logs, total] = await prisma.$transaction([
            prisma.activityLog.findMany({
                where: {
                    action: {
                        in: ['ENRICH', 'FORGE', 'REFORGE', 'LIVE', 'AI_REGENERATE', 'STYLE_TWEAK']
                    }
                },
                include: {
                    lead: {
                        select: { name: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.activityLog.count({
                where: {
                    action: {
                        in: ['ENRICH', 'FORGE', 'REFORGE', 'LIVE', 'AI_REGENERATE', 'STYLE_TWEAK']
                    }
                }
            })
        ]);

        return { 
            success: true, 
            data: logs, 
            total,
            totalPages: Math.ceil(total / limit)
        };
    } catch (error) {
        console.error('Fetch AI Usage History error:', error);
        return { success: false, data: [], total: 0 };
    }
}
