/**
 * DEBUG SCRIPT: Test apa yang AI benar-benar kembalikan untuk data WO Denpasar
 * Run: node diagnose_ai.js
 */

async function callKieAI(prompt, apiKey) {
    const url = "https://api.kie.ai/gemini-3.1-pro/v1/chat/completions";
    const body = { 
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
        stream: false
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000)
    });
    const data = await response.json();
    if (!data.choices) throw new Error(`API Error: ${JSON.stringify(data)}`);
    return data.choices[0].message.content;
}

function cleanAIResponse(text) {
    return text.replace(/```json|```/g, "").trim();
}

// Ini adalah prompt BARU yang sedang digunakan di produksi
const LEAD_EVALUATION_PROMPT = `
### ROLE: LEAD QUALIFIER
Tugasmu adalah memvalidasi data bisnis dari Google Maps dan memutuskan apakah bisa dihubungi atau tidak.

### ATURAN KEPUTUSAN (MUTLAK - IKUTI PERSIS):
- PROCEED jika ada MINIMAL SATU dari ini: (a) Nomor HP Seluler Indonesia awalan 08 atau 628, ATAU (b) Ada link/username Instagram.
- SKIP jika: Nomor yang ada adalah telepon rumah/kantor (021, 022, 0361, dll) DAN tidak ada IG sama sekali.
- JANGAN pernah SKIP hanya karena sudah punya website. Website ada atau tidak = tidak mempengaruhi keputusan.
- Rating tidak mempengaruhi keputusan. Itu sudah difilter sebelumnya.

### OUTPUT FORMAT (JSON ONLY - NO TEXT):
{
  "decision": "PROCEED" atau "SKIP",
  "wa": "nomor dalam format 628xxx, atau kosong jika telepon rumah",
  "ig": "username instagram atau null",
  "reason": "alasan singkat max 10 kata"
}

### DATA:
- Nama: [name]
- Nomor: [wa]
- Website: [website]
- Instagram: (cek dari deskripsi bisnis jika ada)
- Kategori: [category]
- Kota: [city]
`;

// Test cases — simulasi data nyata dari scraper
const testCases = [
    {
        label: "WO dengan HP valid",
        name: "Bali Indah Wedding Organizer",
        wa: "081234567890",
        website: "https://baliindahwedding.com",
        category: "Wedding Organizer",
        city: "Denpasar"
    },
    {
        label: "WO tanpa nomor HP (telpon kantor)",
        name: "Surya Wedding Bali",
        wa: "036112345",
        website: "N/A",
        category: "Wedding Organizer",
        city: "Denpasar"
    },
    {
        label: "Salon dengan HP valid",
        name: "Beauty Salon Ayu",
        wa: "08567890123",
        website: "N/A",
        category: "Salon Kecantikan",
        city: "Denpasar"
    },
    {
        label: "WO tanpa nomor sama sekali",
        name: "Kenanga Bride",
        wa: "tidak ada",
        website: "https://kenangabride.com",
        category: "Wedding Organizer",
        city: "Denpasar"
    }
];

const API_KEY = "911cf0b26f09473270e11ce76e33d99a";

async function run() {
    console.log("=".repeat(60));
    console.log("DIAGNOSA AI RESPONSE — Scraper Pipeline");
    console.log("=".repeat(60));
    
    for (const tc of testCases) {
        console.log(`\n📋 Testing: ${tc.label}`);
        console.log(`   Nama: ${tc.name}, WA: ${tc.wa}`);
        
        const prompt = LEAD_EVALUATION_PROMPT
            .replace('[name]', tc.name)
            .replace('[category]', tc.category)
            .replace('[city]', tc.city)
            .replace('[wa]', tc.wa)
            .replace('[website]', tc.website);
        
        try {
            const rawResponse = await callKieAI(prompt, API_KEY);
            console.log(`   RAW RESPONSE: ${rawResponse}`);
            
            const cleaned = cleanAIResponse(rawResponse);
            try {
                const parsed = JSON.parse(cleaned);
                console.log(`   ✅ JSON Parsed OK - Decision: ${parsed.decision}`);
                console.log(`   WA: ${parsed.wa || '(empty)'}, IG: ${parsed.ig || '(empty)'}`);
                console.log(`   Reason: ${parsed.reason}`);
            } catch (e) {
                console.log(`   ❌ JSON PARSE FAILED! Raw: ${cleaned.substring(0, 200)}`);
                console.log(`   ERROR: ${e.message}`);
            }
        } catch (err) {
            console.log(`   ❌ API CALL FAILED: ${err.message}`);
        }
        
        // Delay agar tidak kena rate limit
        await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("Diagnosa selesai.");
}

run();
