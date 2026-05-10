import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { buildForgeData } from '@/lib/prompts';
import { getEffectivePrompt } from '@/lib/actions/prompt';
import { sanitizeWaNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        const leadId = params.id;
        if (!leadId) {
            return NextResponse.json({ success: false, message: 'Lead ID required' }, { status: 400 });
        }

        const lead = await prisma.lead.findUnique({
            where: { id: leadId }
        });

        if (!lead) {
            return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
        }

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
` : '';

        const noAssetDesignBlock = (hasBlueprint && !hasCustomAssets) ? `
[BRAND COLOR & DESIGN DIRECTIVE — WAJIB DITERAPKAN]
Klien tidak menyediakan gambar/logo. Gunakan Unsplash untuk visual.
WAJIB terapkan identitas brand via warna dan tipografi:
- Primary Color / Vibe: ${answers.colors || answers.vibe?.join(', ') || 'modern professional'}
- Gunakan warna tersebut sebagai accent, button, navbar, footer, section backgrounds.
- Buat inisial logo dari nama brand di navbar jika tidak ada logo URL.
` : '';

        const finalPrompt = promptTemplate
            .replace('[selectedArchetype]', forgeData.selectedArchetype)
            .replace('[brandName]', answers?.brand_name || lead.name)
            .replace('[name]', answers?.brand_name || lead.name)
            .replace('[category]', lead.category)
            .replace('[fullAddress]', fullAddress)
            .replace('[address]', lead.address || 'Bali')
            .replace('[waLink]', `https://wa.me/${sanitizeWaNumber(lead.wa)}`)
            .replace('[phone]', lead.wa)
            .replace('[styleDNA]', answers?.colors || lead.styleDNA || 'Modern, Professional and Premium')
            .replace('[customAssets]', customAssetsBlock + "\\n" + noAssetDesignBlock)
            .replace('[painPoints]', hasBlueprint ? blueprintContext : (lead.painPoints || 'Kurangnya digital presence yang profesional'))
            .replace('[resolvingIdea]', answers?.tagline || lead.resolvingIdea || 'Website premium yang konversi tinggi')
            .replace('[industryPattern]', forgeData.industryPattern)
            .replace('[industryStylePriority]', forgeData.industryStylePriority)
            .replace('[industryColorMood]', forgeData.industryColorMood)
            .replace('[industryKeyEffects]', forgeData.industryKeyEffects)
            .replace('[industryAvoidPatterns]', forgeData.industryAvoidPatterns)
            .replace('[unsplashQueries]', (hasCustomAssets || hasBlueprint)
                ? `${forgeData.unsplashQueries} — HANYA untuk section dekoratif yang tidak punya custom asset/brief di atas` 
                : forgeData.unsplashQueries);

        return NextResponse.json({ success: true, prompt: finalPrompt });

    } catch (error: any) {
        console.error("[API Prompt Preview Error]:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
