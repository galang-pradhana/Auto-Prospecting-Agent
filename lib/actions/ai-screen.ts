'use server';

import { prisma } from '@/lib/prisma';
import { callAI } from './ai';
import { LEAD_EVALUATION_PROMPT } from '@/lib/prompts';
import { JobRegistry } from '@/lib/jobRegistry';
import { cleanAIResponse } from '@/lib/utils';

export async function runAIScreenInline(leadIds: string[], jobId: string, userId: string) {
    return runAIScreen(leadIds, jobId, userId);
}

export async function runAIScreen(leadIds: string[], jobId: string, userId: string) {
    let processed = 0;
    let approved = 0;
    let rejected = 0;

    console.log(`[AI Screen] Starting for ${leadIds.length} leads...`);

    for (const id of leadIds) {
        processed++;

        const lead = await prisma.lead.findUnique({ where: { id, userId } });
        if (!lead) continue;

        // Update progress in JobRegistry
        if (jobId) {
            JobRegistry.updateJob(jobId, {
                message: `AI Filtering: ${processed}/${leadIds.length} (✅${approved} passed / ❌${rejected} rejected)`,
                // Map to 80-100% of the overall job if it's part of a scraper job
                // Or 0-100% if it's a standalone AI_SCREEN job
                progress: JobRegistry.getJob(jobId)?.type === 'AI_SCREEN' 
                    ? Math.round((processed / leadIds.length) * 100)
                    : 80 + Math.round((processed / leadIds.length) * 20),
                data: { 
                    processed: JobRegistry.getJob(jobId)?.data?.processed || leadIds.length, 
                    new: approved, 
                    rejected: rejected, 
                    total: leadIds.length 
                }
            });
        }

        try {
            const prompt = LEAD_EVALUATION_PROMPT
                .replace('[name]', lead.name)
                .replace('[category]', lead.category)
                .replace('[address]', lead.address)
                .replace('[city]', lead.city)
                .replace('[province]', lead.province)
                .replace('[wa]', lead.wa || 'tidak ada')
                .replace('[website]', lead.website || 'N/A')
                .replace('[about]', 'N/A') // Scraper doesn't extract full about yet
                .replace('[rating]', lead.rating.toString())
                .replace('[reviewsCount]', (lead.reviewCount || 0).toString());

            const aiResponse = await callAI(prompt, 'fast');
            const raw = cleanAIResponse(aiResponse);
            let result: any;

            try {
                result = JSON.parse(raw);
                if (Array.isArray(result)) result = result[0];
            } catch (e) {
                console.error(`[AI Screen] JSON parse error for lead ${lead.name}:`, e);
                // On parse error, skip to next lead, keep as RAW or log error
                continue;
            }

            const decision = String(result.decision || '').toUpperCase();

            if (decision === 'PROCEED') {
                await prisma.lead.update({
                    where: { id },
                    data: {
                        status: 'FRESH',
                        name: result.name || lead.name,
                        wa: result.wa || lead.wa,
                        ig: result.ig || lead.ig,
                        score: result.score ? parseInt(String(result.score)) : null,
                        priorityTier: result.priority_tier || null,
                        aiAnalysis: { 
                            reason: result.reason, 
                            score_breakdown: result.score_breakdown,
                            ig_confidence: result.ig_confidence 
                        },
                        lastLog: `AI Filter: PROCEED (score: ${result.score}, tier: ${result.priority_tier})`
                    }
                });
                approved++;
            } else {
                // MOVE TO SANDBOX for rejected leads
                await prisma.$transaction([
                    prisma.leadSandbox.create({
                        data: {
                            name: result.name || lead.name,
                            wa: lead.wa,
                            category: lead.category,
                            province: lead.province,
                            city: lead.city,
                            district: lead.district,
                            address: lead.address,
                            rating: lead.rating,
                            reviewCount: lead.reviewCount,
                            website: lead.website,
                            mapsUrl: lead.mapsUrl,
                            ig: result.ig || lead.ig,
                            aiAnalysis: { 
                                reason: result.reason, 
                                rejection_reason: result.rejection_reason || 'GENERIC_FILTER',
                                score_breakdown: result.score_breakdown 
                            },
                            reason: result.rejection_reason || 'AI_REJECTED',
                            lastLog: `AI Filter: REJECTED — ${result.reason}`,
                            userId: userId,
                            rawSource: lead.reviews as any // Reusing reviews field to store some raw data if needed
                        }
                    }),
                    prisma.lead.delete({ where: { id } })
                ]);
                rejected++;
            }
        } catch (err) {
            console.error(`[AI Screen] Error processing lead ${lead.id}:`, err);
            // On error, leave as RAW for manual retry later if needed
        }
    }

    if (jobId && JobRegistry.getJob(jobId)?.type === 'AI_SCREEN') {
        JobRegistry.updateJob(jobId, {
            status: 'COMPLETED',
            message: `AI Screen done. Approved: ${approved}, Rejected: ${rejected}`,
            progress: 100
        });
    }

    return { success: true, processed, approved, rejected };
}
