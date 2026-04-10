import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentUser } from '@/lib/auth';

const IG_EXTRACTION_PROMPT = `Kamu adalah AI spesialis ekstraksi data bisnis dari screenshot Instagram.

Analisis screenshot profil Instagram ini dengan teliti dan ekstrak semua informasi yang tersedia.
Output HANYA JSON murni tanpa markdown, tanpa backtick, tanpa teks lain.

Format output:
{
  "name": "Nama bisnis atau nama lengkap akun (bukan @username, tapi display name di profil)",
  "ig": "@username Instagram persis seperti tertulis (dengan tanda @)",
  "category": "Kategori bisnis yang paling relevan. Pilih dari: Interior Designer, Arsitek, Kontraktor, Desainer Grafis, Fotografer, Kuliner, Ritel, Jasa, atau deskripsi kategori yang sesuai",
  "bio": "Teks bio profil lengkap persis seperti tertulis, termasuk emoji jika ada",
  "followers": "Jumlah followers sebagai string (contoh: 12.5K, 1.2M, 850)",
  "location": "Kota atau lokasi yang tertera di profil (bukan dari foto), null jika tidak ada",
  "contact": "Nomor HP atau WhatsApp yang dimulai angka 08, 62, atau +62 — jika ada di bio atau highlight. null jika tidak ada",
  "website": "URL website atau link yang ada di profil (bio link), null jika tidak ada"
}

Aturan ketat:
- Isi null (bukan string "null", bukan "") untuk field yang tidak terlihat di screenshot
- Jangan mengarang atau mengasumsikan data yang tidak terlihat
- Jika ada nomor WA di bio (format 08xx, 62xx, atau +62xx), masukkan ke field "contact"
- Output HANYA JSON, tidak ada penjelasan tambahan`;

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { base64, mimeType = 'image/jpeg' } = body;

        if (!base64 || typeof base64 !== 'string') {
            return NextResponse.json({ error: 'base64 image is required' }, { status: 400 });
        }

        // Validasi ukuran (max ~5MB base64 ≈ 3.7MB image)
        if (base64.length > 7_000_000) {
            return NextResponse.json({ error: 'Gambar terlalu besar. Maksimal 5MB.' }, { status: 400 });
        }

        // Ambil API key dari user atau env
        const user = await getCurrentUser();
        const apiKey = user?.kieAiApiKey || process.env.KIE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Kie.ai API key tidak ditemukan' }, { status: 500 });
        }

        const dataUrl = `data:${mimeType};base64,${base64}`;
        const requestBody = {
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: IG_EXTRACTION_PROMPT },
                    { type: 'image_url', image_url: { url: dataUrl } }
                ]
            }],
            stream: false
        };

        const response = await fetch('https://api.kie.ai/gemini-3.1-pro/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(120000)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[IG Extract API Error]:', data);
            return NextResponse.json(
                { error: `AI Error: ${data.msg || data.message || 'Gagal memproses gambar'}` },
                { status: 502 }
            );
        }

        const rawContent =
            data.choices?.[0]?.message?.content ||
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            data.content?.[0]?.text;

        if (!rawContent) {
            return NextResponse.json({ error: 'AI tidak menghasilkan output' }, { status: 502 });
        }

        // Bersihkan dan parse JSON
        const cleaned = rawContent
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        let extracted: Record<string, any>;
        try {
            extracted = JSON.parse(cleaned);
        } catch {
            // Kalau bukan JSON, mungkin ada teks lain — coba cari JSON di dalamnya
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return NextResponse.json({ error: 'AI tidak return format JSON yang valid', raw: rawContent }, { status: 422 });
            }
            extracted = JSON.parse(jsonMatch[0]);
        }

        return NextResponse.json({ success: true, extracted });

    } catch (error: any) {
        console.error('[IG Extract Route Error]:', error.message);
        if (error.name === 'TimeoutError') {
            return NextResponse.json({ error: 'AI timeout. Coba lagi.' }, { status: 504 });
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
