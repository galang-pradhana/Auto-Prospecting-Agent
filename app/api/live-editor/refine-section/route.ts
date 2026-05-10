import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callAIForHTML } from '@/lib/actions/ai';

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { sectionHtml, instruction, brandContext, modelKey } = body;

        if (!sectionHtml || !instruction) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const systemPrompt = `You are a senior brand copywriter and web designer specializing in brand strategy. 
Your task: Rewrite the HTML section below to be more persuasive, clear, and aligned with the Brand Context provided.

RULES:
- Return ONLY the complete, raw HTML of the section. No markdown. No explanations.
- Keep all CSS classes, IDs, and attributes intact unless necessary for design refinement.
- Only change visible text content and optionally minor class adjustments for visual impact.
- Do NOT change the section's fundamental structure, tags, or layout logic unless explicitly asked.`;

        const finalPrompt = `
BRAND CONTEXT:
${brandContext || 'A professional business website.'}

USER INSTRUCTION:
${instruction}

SECTION HTML TO REWRITE:
${sectionHtml}
`;

        const refinedHtml = await callAIForHTML(systemPrompt + "\n\n" + finalPrompt, modelKey);

        if (!refinedHtml) {
            throw new Error('AI returned empty response');
        }

        // Clean any markdown fences if AI accidentally included them
        const cleanRefinedHtml = refinedHtml.replace(/```html/g, '').replace(/```/g, '').trim();

        return NextResponse.json({ refinedHtml: cleanRefinedHtml });
    } catch (error: any) {
        console.error('[Refine Section Error]:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
