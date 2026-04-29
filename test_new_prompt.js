/**
 * TEST: Verifikasi prompt baru dengan skenario WO Denpasar
 * (nomor 0361 / telpon kantor — kondisi real di produksi)
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

// Prompt BARU yang sudah diupdate
const NEW_PROMPT = `
### ROLE: LEAD CONTACT QUALIFIER
Tugasmu adalah dua hal: (1) Tentukan apakah bisnis ini bisa dihubungi, dan (2) Temukan kontak terbaik mereka.

### ATURAN KEPUTUSAN:
- PROCEED jika: Nomor adalah HP seluler (awalan 08/628) DAN/ATAU kamu bisa menemukan/menebak username Instagram mereka.
- SKIP HANYA jika: Tidak ada HP seluler DAN kamu YAKIN tidak ada IG (bisnis sangat kecil, nama generik, tidak ada identitas digital).
- Nomor 0361-xxx, (0361), atau awalan kota lain = telepon kantor = BUKAN WA. Kosongkan field wa.

### INSTAGRAM DISCOVERY (KRITIS):
Jika bisnis adalah Wedding Organizer, Salon, Event Organizer, Catering, Florist, atau bisnis serupa:
- Bisnis-bisnis ini HAMPIR PASTI punya Instagram. Tebak username dengan format:
  [namabisnis], [namabisnis]bali, [namabisnis]id, [namabisnis]wedding, dll.
- Contoh: "Bali Shanti Wedding" → coba "balishantiwedding" atau "bali.shanti.wedding"
- Set ig jika confidence >= 60%. Lebih baik menebak daripada melewatkan lead.

### OUTPUT FORMAT (JSON ONLY - NO TEXT LAIN):
{
  "decision": "PROCEED" atau "SKIP",
  "wa": "format 628xxx atau string kosong jika bukan HP",
  "ig": "username_tanpa_@ atau null jika benar-benar tidak ada",
  "reason": "alasan singkat"
}

### DATA BISNIS:
- Nama: [name]
- Kategori: [category]
- Alamat: [address]
- Kota: [city], [province]
- Nomor: [wa]
- Website: [website]
- Deskripsi Bisnis: [about]
`;

const testCases = [
    {
        label: "WO Denpasar — nomor 0361 (kondisi real produksi)",
        name: "Bali Dream Wedding Organizer",
        category: "Wedding Organizer",
        address: "Jl. Raya Sesetan No.45, Denpasar Selatan",
        city: "Denpasar", province: "Bali",
        wa: "0361-234567",
        website: "N/A",
        about: "N/A"
    },
    {
        label: "WO Denpasar — tanpa nomor sama sekali",
        name: "Tirta Dewi Wedding",
        category: "Wedding Organizer",
        address: "Jl. Bypass Ngurah Rai, Denpasar",
        city: "Denpasar", province: "Bali",
        wa: "tidak ada",
        website: "https://tirtadewiwedding.com",
        about: "N/A"
    },
    {
        label: "Salon — nomor 0361",
        name: "Salon Kecantikan Ayu Bali",
        category: "Salon Kecantikan",
        address: "Jl. Teuku Umar No.12, Denpasar Barat",
        city: "Denpasar", province: "Bali",
        wa: "036198765",
        website: "N/A",
        about: "N/A"
    },
    {
        label: "WO — dengan deskripsi yang menyebut Instagram",
        name: "Indah Wedding Bali",
        category: "Wedding Organizer",
        address: "Jl. Gatot Subroto, Denpasar",
        city: "Denpasar", province: "Bali",
        wa: "0361-456789",
        website: "N/A",
        about: "Follow us on Instagram @indahweddingbali for our portfolio"
    }
];

const API_KEY = "911cf0b26f09473270e11ce76e33d99a";

async function run() {
    console.log("=".repeat(65));
    console.log("TEST PROMPT BARU — Skenario WO Denpasar (Landline 0361)");
    console.log("=".repeat(65));
    
    let proceedCount = 0, skipCount = 0, errorCount = 0;
    
    for (const tc of testCases) {
        console.log(`\n📋 ${tc.label}`);
        
        const prompt = NEW_PROMPT
            .replace('[name]', tc.name)
            .replace('[category]', tc.category)
            .replace('[address]', tc.address)
            .replace('[city]', tc.city)
            .replace('[province]', tc.province)
            .replace('[wa]', tc.wa)
            .replace('[website]', tc.website)
            .replace('[about]', tc.about);
        
        try {
            const raw = await callKieAI(prompt, API_KEY);
            const cleaned = raw.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            
            const icon = parsed.decision === 'PROCEED' ? '✅' : '⛔';
            if (parsed.decision === 'PROCEED') proceedCount++;
            else skipCount++;
            
            console.log(`   ${icon} Decision: ${parsed.decision}`);
            console.log(`   WA: ${parsed.wa || '(empty)'} | IG: ${parsed.ig || 'null'}`);
            console.log(`   Reason: ${parsed.reason}`);
        } catch(e) {
            console.log(`   ❌ ERROR: ${e.message}`);
            errorCount++;
        }
        
        await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log("\n" + "=".repeat(65));
    console.log(`HASIL: ${proceedCount} PROCEED | ${skipCount} SKIP | ${errorCount} ERROR`);
    console.log(`Target: minimal 2-3 PROCEED dari 4 test cases`);
    if (proceedCount >= 2) {
        console.log("✅ Prompt baru lebih agresif dalam menemukan kontak!");
    } else {
        console.log("⚠️  Prompt masih terlalu ketat untuk kondisi Denpasar.");
    }
    console.log("=".repeat(65));
}

run();
