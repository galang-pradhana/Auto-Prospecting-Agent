'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession, getCurrentUser } from '@/lib/auth';
import { sanitizeWaNumber } from '@/lib/utils';
import { OUTREACH_GENERATOR_PROMPT, OUTREACH_PERSONAS } from '@/lib/prompts';

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
        const model = settings?.aiEngine || 'gemini-3.1-pro';
        const apiKey = settings?.kieAiApiKey || process.env.KIE_AI_API_KEY;
        const endpoint = `https://api.kie.ai/${model}/v1/chat/completions`;

        const personaDefinition = OUTREACH_PERSONAS['professional'];
        const prompt = OUTREACH_GENERATOR_PROMPT
            .replace("[persona_definition]", personaDefinition)
            .replace("[category]", category)
            .replace("{{name}}", "[Business Name]")
            .replace("{{pain_points}}", "[Specific Pain Points]")
            .replace("{{idea}}", "[Our Proposed Solution]")
            .replace("{{link}}", "[Preview Link]")
            .replace("{{my_business_name}}", settings.businessName || "[Nama Bisnis]")
            .replace("{{my_ig}}", settings.businessIg || "[IG Kamu]")
            .replace("{{my_wa}}", settings.businessWa || "[WA Kamu]");

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
            const model = settings?.aiEngine || 'gemini-3.1-pro';
            const apiKey = settings?.kieAiApiKey || process.env.KIE_AI_API_KEY;
            const endpoint = `https://api.kie.ai/${model}/v1/chat/completions`;

            const personaDefinition = OUTREACH_PERSONAS['casual'];
            const prompt = OUTREACH_GENERATOR_PROMPT
                .replace("[persona_definition]", personaDefinition)
                .replace("[category]", lead.category)
                .replace("{{name}}", lead.name)
                .replace("{{pain_points}}", lead.painPoints || 'kebutuhan bisnis')
                .replace("{{idea}}", lead.resolvingIdea || 'solusi digital')
                .replace("{{link}}", finalLink);

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
                message = (data.choices?.[0]?.message?.content || 'Halo!') + footer;
            } else {
                message = `Halo ${lead.name}, saya punya solusi digital untuk ${lead.category} Anda.\n\nCek di sini: ${finalLink}${footer}`;
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
        select: { 
            kieAiApiKey: true, 
            byocMode: true, 
            aiEngine: true,
            businessName: true,
            businessIg: true,
            businessWa: true,
            fonnteTokens: true
        }
    });
}

export async function updateUserSettings(data: { 
    kieAiApiKey?: string,
    businessName?: string,
    businessIg?: string,
    businessWa?: string,
    fonnteTokens?: string[]
}) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.user.update({
            where: { id: session.userId },
            data: {
                kieAiApiKey: data.kieAiApiKey,
                businessName: data.businessName,
                businessIg: data.businessIg,
                businessWa: data.businessWa,
                fonnteTokens: data.fonnteTokens
            }
        });

        // Revalidate path agar UI langsung update datanya
        revalidatePath('/dashboard/settings');
        return { success: true };
    } catch (error) {
        console.error('Update User Settings error:', error);
        return { success: false, message: 'Failed to update settings' };
    }
}

export async function checkKieStatus(manualKey?: string) {
    const user = await getCurrentUser();
    
    // LOGIKA FALLBACK: 
    // 1. Pake key yang lagi diketik di UI (manualKey) buat testing.
    // 2. Kalau gak ada, ambil dari DB user.
    // 3. Kalau gak ada juga, ambil dari .env server.
    const apiKey = manualKey || user?.kieAiApiKey || process.env.KIE_AI_API_KEY;

    if (!apiKey) {
        return { success: false, message: 'API Key kosong, mesin gak bisa nyala.' };
    }

    const url = "https://api.kie.ai/api/v1/chat/credit";

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            cache: 'no-store', // Jangan di-cache biar datanya real-time
            signal: AbortSignal.timeout(10000) // 10 detik cukup lah
        });

        const data = await response.json();

        if (response.ok) {
            return { 
                success: true, 
                message: 'Connected!', 
                credit: data.data?.credit || '0', // Asumsi struktur Kie.ai
                engine: user?.aiEngine || 'gemini-3.1-pro'
            };
        }

        return { 
            success: false, 
            message: data.msg || 'API Key Invalid atau Expired.' 
        };

    } catch (error) {
        console.error("[checkKieStatus Error]:", error);
        return { success: false, message: 'Kie.ai Server Timeout / Unreachable.' };
    }
}

export async function getAiPulseStatus() {
    try {
        const status = await checkKieStatus(); // Fungsi yang kita buat tadi
        
        if (status.success) {
            // IJO: Koneksi lancar & saldo ada
            return {
                status: 'online',
                color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                pulseColor: 'bg-emerald-500',
                label: `Ready: $${status.credit}`,
            };
        } else {
            // MERAH: Key salah atau expired
            return {
                status: 'error',
                color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                pulseColor: 'bg-rose-500',
                label: 'API Disconnected',
            };
        }
    } catch (e) {
        // KUNING: Masalah network atau Kie.ai lagi down
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
