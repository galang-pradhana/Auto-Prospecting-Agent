'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import * as DEFAULTS from '@/lib/prompts';

export type PromptName = 'MASTER_FORGE_PROMPT' | 'ENRICHMENT_PROMPT';

const PROMPT_LABELS: Record<PromptName, string> = {
    MASTER_FORGE_PROMPT: 'Master Website (Forge)',
    ENRICHMENT_PROMPT: 'Lead Enrichment',
};

const LOGICAL_LOCK_PREFIX = "MANDATORY: Bahasa Indonesia & Cinematic Hero\n\n";

/**
 * Fetches a system prompt from the database. 
 * Falls back to hardcoded defaults in lib/prompts.ts if not found in DB.
 */
export async function getEffectivePrompt(name: PromptName): Promise<string> {
    let content: string;
    try {
        const dbPrompt = await prisma.systemPrompt.findUnique({ where: { name } });
        content = dbPrompt?.content || (DEFAULTS as any)[name] || '';
    } catch {
        content = (DEFAULTS as any)[name] || '';
    }

    // Logical Lock: Prefix permanent instructions
    return LOGICAL_LOCK_PREFIX + content;
}

/**
 * Updates or creates a system prompt override in the database.
 */
export async function updateSystemPrompt(name: PromptName, content: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.systemPrompt.upsert({
            where: { name },
            update: { content },
            create: { name, content }
        });
        revalidatePath('/dashboard/settings');
        return { success: true };
    } catch (error) {
        console.error(`Error updating prompt ${name}:`, error);
        return { success: false, message: 'Failed to update prompt' };
    }
}

/**
 * Resets a prompt by deleting its database override.
 */
export async function resetSystemPrompt(name: PromptName) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        await prisma.systemPrompt.delete({ where: { name } });
        revalidatePath('/dashboard/settings');
        return { success: true };
    } catch (error) {
        // If it doesn't exist, it's already "reset"
        return { success: true };
    }
}

/**
 * Gets the current state of all configurable prompts for the UI.
 */
export async function getCurrentPromptStates() {
    const dbPrompts = await prisma.systemPrompt.findMany();
    const names: PromptName[] = ['MASTER_FORGE_PROMPT', 'ENRICHMENT_PROMPT'];

    const states: Record<string, { current: string; isOverride: boolean; default: string; label: string }> = {};

    for (const name of names) {
        const dbEntry = dbPrompts.find(p => p.name === name);
        const defaultValue = DEFAULTS[name as keyof typeof DEFAULTS];
        const defaultStr = typeof defaultValue === 'string' ? defaultValue : '';
        
        states[name] = {
            current: dbEntry?.content || defaultStr,
            isOverride: !!dbEntry,
            default: defaultStr,
            label: PROMPT_LABELS[name]
        };
    }
    return states;
}
