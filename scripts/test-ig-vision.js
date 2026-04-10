/**
 * TEST: Kie.ai Gemini Vision dengan Base64 Image
 * Jalankan: node scripts/test-ig-vision.js [path/to/screenshot.jpg]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const API_KEY = '911cf0b26f09473270e11ce76e33d99a';
const GEMINI_URL = 'https://api.kie.ai/gemini-3.1-pro/v1/chat/completions';
const GPT_URL = 'https://api.kie.ai/gpt-5-2/v1/chat/completions';

// ─── Helper: Download image ─────────────────────────────────────────────────
function downloadAsBase64(url, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        if (redirectCount > 5) return reject(new Error('Too many redirects'));
        const lib = url.startsWith('https') ? https : http;
        lib.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return downloadAsBase64(res.headers.location, redirectCount + 1)
                    .then(resolve).catch(reject);
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
            res.on('error', reject);
        }).on('error', reject);
    });
}

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[ext] || 'image/jpeg';
}

// ─── Core Test Function ─────────────────────────────────────────────────────
async function testVision(base64, mimeType, endpoint) {
    const url = endpoint === 'gemini' ? GEMINI_URL : GPT_URL;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const prompt = `Kamu adalah AI ekstraksi data bisnis dari screenshot Instagram.
Analisis gambar ini dan ekstrak informasi berikut dalam format JSON murni (TANPA markdown, TANPA backtick):

{
  "name": "Nama bisnis atau nama lengkap akun (bukan username)",
  "ig": "@username Instagram (dengan tanda @)",
  "category": "Kategori bisnis (contoh: Interior Designer, Arsitek, Kontraktor)",
  "bio": "Teks bio profil lengkap",
  "followers": "Jumlah followers sebagai string (contoh: 12.5K, 1.2M)",
  "location": "Kota/lokasi jika ada di profil, null jika tidak ada",
  "contact": "Nomor HP/WA atau email dari bio, null jika tidak ada",
  "website": "URL website atau link di profil, null jika tidak ada"
}

Isi null (bukan string "null") untuk field yang tidak tersedia. Jangan mengarang data.`;

    const body = {
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: dataUrl } }
            ]
        }],
        stream: false,
        ...(endpoint === 'gpt' ? { reasoning_effort: 'medium' } : {})
    };

    console.log(`\n🚀 [${endpoint.toUpperCase()}] Sending request...`);
    console.log(`   Base64 size: ${(base64.length / 1024).toFixed(1)} KB`);

    const startTime = Date.now();

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

    console.log(`   HTTP ${response.status} (${elapsed}s)`);

    if (!response.ok) {
        console.error('   ❌ API Error:', JSON.stringify(data, null, 2));
        return null;
    }

    const content =
        data.choices?.[0]?.message?.content ||
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        data.content?.[0]?.text;

    if (!content) {
        console.error('   ❌ Empty content. Response:', JSON.stringify(data, null, 2));
        return null;
    }

    console.log('\n   📝 Raw Response:');
    console.log('   ' + content.split('\n').join('\n   '));

    try {
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        console.log('\n   ✅ Parsed JSON:');
        console.log(JSON.stringify(parsed, null, 4));
        return parsed;
    } catch {
        console.log('\n   ⚠️  Not valid JSON — raw text response');
        return { rawText: content };
    }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
    console.log('═══════════════════════════════════════════════');
    console.log('  🧪 Kie.ai Vision API Test — Leads IG Feature');
    console.log('═══════════════════════════════════════════════');

    let base64, mimeType = 'image/jpeg';
    const imagePath = process.argv[2];

    if (imagePath && fs.existsSync(imagePath)) {
        console.log(`\n📂 Loading local image: ${imagePath}`);
        const buf = fs.readFileSync(imagePath);
        base64 = buf.toString('base64');
        mimeType = getMimeType(imagePath);
        console.log(`   Size: ${(buf.length / 1024).toFixed(1)} KB | Type: ${mimeType}`);
    } else {
        // Pakai logo Unsplash sebagai test (gambar nyata, bukan IG tapi cukup untuk test vision)
        const testUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=320&q=80';
        console.log(`\n📥 No image provided. Using test image...`);
        console.log(`   URL: ${testUrl}`);
        console.log(`\n   💡 Untuk test dengan SS Instagram asli:`);
        console.log(`   node scripts/test-ig-vision.js /path/to/screenshot.jpg\n`);
        try {
            base64 = await downloadAsBase64(testUrl);
            mimeType = 'image/jpeg';
            console.log(`   Downloaded: ${(base64.length * 0.75 / 1024).toFixed(1)} KB`);
        } catch (e) {
            console.log(`   ❌ Download failed: ${e.message}`);
            console.log(`   Buat gambar test manual...`);
            // Fallback: buat 1x1 pixel PNG base64
            base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            mimeType = 'image/png';
            console.log(`   Using 1x1 pixel test image (minimal test)`);
        }
    }

    // ─── Test 1: Gemini ─────────────────────────────────────
    console.log('\n──────────────────────────────────────────────');
    console.log('  TEST 1: Gemini Vision');
    console.log('──────────────────────────────────────────────');
    let result = null;
    try {
        result = await testVision(base64, mimeType, 'gemini');
    } catch (err) {
        console.error('   ❌ Exception:', err.message);
    }

    if (!result) {
        // ─── Test 2: GPT fallback ────────────────────────────
        console.log('\n──────────────────────────────────────────────');
        console.log('  TEST 2: GPT Vision (Fallback)');
        console.log('──────────────────────────────────────────────');
        try {
            result = await testVision(base64, mimeType, 'gpt');
        } catch (err) {
            console.error('   ❌ Exception:', err.message);
        }
    }

    // ─── Kesimpulan ──────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════');
    if (result) {
        console.log('  ✅ SUKSES! Vision API berfungsi.');
        console.log('  → Siap implementasi Leads IG feature.');
    } else {
        console.log('  ❌ GAGAL. Dua endpoint tidak merespons.');
        console.log('  → Cek API key atau format payload.');
    }
    console.log('══════════════════════════════════════════════\n');
}

main().catch((err) => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
