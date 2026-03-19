'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sanitizeWaNumber } from '@/lib/utils';
import { WA_TEMPLATE_DRAFT_PROMPT, WA_AI_FALLBACK_PROMPT } from '@/lib/prompts';

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
        const settings = await getUserSettings();
        const model = settings?.aiEngine || 'gemini-3-flash';
        const apiKey = settings?.kieAiApiKey || process.env.KIE_AI_API_KEY;
        const endpoint = `https://api.kie.ai/${model}/v1/chat/completions`;

        const prompt = WA_TEMPLATE_DRAFT_PROMPT.replace("[category]", category);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
                stream: false
            }),
        });

        if (response.ok) {
            const data = await response.json();
            const draft = data.choices?.[0]?.message?.content || '';
            return { success: true, draft };
        }
        return { success: false, message: 'AI Generation failed' };
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
        if (template) {
            activeTemplateName = template.title;
            message = template.content
                .replace(/{{name}}/g, lead.name)
                .replace(/{{category}}/g, lead.category)
                .replace(/{{idea}}/g, lead.resolvingIdea || 'solusi digital')
                .replace(/{{pain_points}}/g, lead.painPoints || 'kebutuhan bisnis')
                .replace(/{{link}}/g, `${process.env.NEXT_PUBLIC_APP_URL || 'https://auto-prospecting.vercel.app'}/${lead.slug || ''}`);
        } else {
            activeTemplateName = 'AI Generated (Fallback)';
            const settings = await getUserSettings();
            const model = settings?.aiEngine || 'gemini-3-flash';
            const apiKey = settings?.kieAiApiKey || process.env.KIE_AI_API_KEY;
            const endpoint = `https://api.kie.ai/${model}/v1/chat/completions`;

            const prompt = WA_AI_FALLBACK_PROMPT
                .replace("[businessName]", lead.name)
                .replace("[category]", lead.category)
                .replace("[resolvingIdea]", lead.resolvingIdea || '')
                .replace("[draftLink]", `${process.env.NEXT_PUBLIC_APP_URL || 'https://auto-prospecting.vercel.app'}/${lead.slug || ''}`);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
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

        const sanitizedPhone = sanitizeWaNumber(lead.wa);
        const waUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
        return { success: true, url: waUrl, message, templateName: activeTemplateName };
    } catch (error) {
        console.error('Generate WA Link error:', error);
        return { success: false, message: 'Failed to generate link' };
    }
}

// --- User Settings ---

export async function getUserSettings() {
    const session = await getSession();
    if (!session) return null;
    return prisma.user.findUnique({
        where: { id: session.userId },
        select: { kieAiApiKey: true, byocMode: true, aiEngine: true }
    });
}

export async function updateUserSettings(data: { kieAiApiKey?: string, byocMode?: boolean, aiEngine?: string }) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };
    try {
        await prisma.user.update({ where: { id: session.userId }, data });
        revalidatePath('/dashboard/settings');
        return { success: true };
    } catch (error) {
        console.error('Update User Settings error:', error);
        return { success: false, message: 'Failed to update settings' };
    }
}
