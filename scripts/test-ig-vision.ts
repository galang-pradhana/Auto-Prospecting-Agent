/**
 * TEST: Kie.ai Gemini Vision dengan Base64 Image
 * 
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-ig-vision.ts [path/to/screenshot.jpg]
 * 
 * Kalau tidak ada argumen, script akan download test image dari internet.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ─── Config ───────────────────────────────────────────────────────────────────
const API_KEY = process.env.KIE_AI_API_KEY || '911cf0b26f09473270e11ce76e33d99a';
const GEMINI_URL = 'https://api.kie.ai/gemini-3.1-pro/v1/chat/completions';
const GPT_URL = 'https://api.kie.ai/gpt-5-2/v1/chat/completions'; // fallback test

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadImageAsBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                // follow redirect
                downloadImageAsBase64(res.headers.location!).then(resolve).catch(reject);
                return;
            }
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
            res.on('error', reject);
        }).on('error', reject);
    });
}

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
    };
    return mimeMap[ext] || 'image/jpeg';
}

// ─── Test Kie.ai Vision ───────────────────────────────────────────────────────

async function testKieAIVision(base64: string, mimeType: string, endpoint: 'gemini' | 'gpt') {
    const url = endpoint === 'gemini' ? GEMINI_URL : GPT_URL;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const prompt = `Kamu adalah AI ekstraksi data bisnis dari screenshot Instagram.
Analisis gambar ini dan ekstrak informasi berikut dalam format JSON murni (tanpa markdown):

{
  "name": "Nama bisnis atau nama lengkap akun (bukan username)",
  "ig": "@username Instagram (dengan tanda @)",
  "category": "Kategori bisnis yang paling relevan (contoh: Interior Designer, Arsitek, Kontraktor, dll)",
  "bio": "Teks bio profil lengkap persis seperti tertulis",
  "followers": "Jumlah followers sebagai string (contoh: 12.5K, 1.2M)",
  "location": "Lokasi yang tertera di profil (kota/negara), null jika tidak ada",
  "contact": "Nomor HP/WA atau email jika ada di bio atau link, null jika tidak ada",
  "website": "URL website atau link yang ada di profil, null jika tidak ada"
}

Penting:
- Isi null (bukan string "null") untuk field yang tidak tersedia
- Jangan mengarang atau mengasumsikan data yang tidak terlihat
- Output HANYA JSON, tidak ada teks lain`;

    const body: any = {
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: dataUrl } }
            ]
        }],
        stream: false
    };

    // GPT butuh format sedikit beda
    if (endpoint === 'gpt') {
        body.reasoning_effort = 'medium';
    }

    console.log(`\n🚀 Testing ${endpoint.toUpperCase()} endpoint...`);
    console.log(`   URL: ${url}`);
    console.log(`   Base64 Size: ${(base64.length / 1024).toFixed(1)} KB`);

    const startTime = Date.now();

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(90000)
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const data = await response.json();

        console.log(`   Status: ${response.status} (${elapsed}s)`);

        if (!response.ok) {
            console.error(`   ❌ Error:`, JSON.stringify(data, null, 2));
            return null;
        }

        // Parse content dari berbagai format response
        const content =
            data.choices?.[0]?.message?.content ||
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            data.content?.[0]?.text;

        if (!content) {
            console.error(`   ❌ Empty content. Full response:`, JSON.stringify(data, null, 2));
            return null;
        }

        console.log(`\n   ✅ Raw Response:\n`);
        console.log('   ' + content.split('\n').join('\n   '));

        // Coba parse JSON
        try {
            const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            console.log(`\n   ✅ Parsed Successfully:`);
            console.log(JSON.stringify(parsed, null, 4));
            return parsed;
        } catch {
            console.log(`\n   ⚠️  Response is not valid JSON (might be plain text)`);
            return { rawText: content };
        }

    } catch (err: any) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`   ❌ Fetch Error (${elapsed}s):`, err.message);
        return null;
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  🧪 TEST: Kie.ai Vision API untuk Leads IG Feature');
    console.log('═══════════════════════════════════════════════════\n');

    let base64: string;
    let mimeType = 'image/jpeg';
    const imagePath = process.argv[2];

    // ─── Load Image ───────────────────────────────────────────
    if (imagePath && fs.existsSync(imagePath)) {
        console.log(`📂 Loading image from: ${imagePath}`);
        const buffer = fs.readFileSync(imagePath);
        base64 = buffer.toString('base64');
        mimeType = getMimeType(imagePath);
        console.log(`   ✅ Size: ${(buffer.length / 1024).toFixed(1)} KB | Type: ${mimeType}`);
    } else {
        // Pakai test image dari internet (foto profil contoh)
        // Ganti URL ini dengan link foto IG yang mau ditest
        const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Bikesgonewild.png/320px-Bikesgonewild.png';
        console.log(`📥 No image provided. Downloading test image...`);
        console.log(`   URL: ${testImageUrl}`);
        console.log(`\n   ⚠️  TIP: Untuk test nyata, jalankan:`);
        console.log(`   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-ig-vision.ts /path/to/screenshot-ig.jpg\n`);
        base64 = await downloadImageAsBase64(testImageUrl);
        mimeType = 'image/png';
        console.log(`   ✅ Downloaded: ${(base64.length * 0.75 / 1024).toFixed(1)} KB`);
    }

    // ─── Test Gemini ──────────────────────────────────────────
    console.log('\n─── TEST 1: Gemini Vision ───────────────────────────');
    const geminiResult = await testKieAIVision(base64, mimeType, 'gemini');

    if (!geminiResult) {
        // ─── Fallback: Test GPT ───────────────────────────────
        console.log('\n─── TEST 2: GPT Vision (Fallback) ──────────────────');
        console.log('   Gemini gagal, mencoba GPT...');
        const gptResult = await testKieAIVision(base64, mimeType, 'gpt');

        if (!gptResult) {
            console.log('\n❌ KESIMPULAN: Kedua endpoint gagal. Cek API key atau format request.');
        } else {
            console.log('\n✅ KESIMPULAN: GPT berhasil! Gunakan GPT untuk fitur Leads IG.');
        }
    } else {
        console.log('\n✅ KESIMPULAN: Gemini berhasil! Bisa pakai Gemini untuk fitur Leads IG (lebih hemat).');
    }

    console.log('\n═══════════════════════════════════════════════════\n');
}

main().catch((err) => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
