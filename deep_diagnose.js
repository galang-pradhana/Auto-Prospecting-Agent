/**
 * DEEP DIAGNOSTIC: Test seluruh pipeline dari raw data sampai DB insert
 * Simulasi persis apa yang terjadi saat scraper berjalan
 * Run: node deep_diagnose.js
 */

// ============================================================
// MIRROR functions dari lib/utils.ts
// ============================================================
function sanitizeWaNumber(phone) {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.substring(1);
    if (cleaned.startsWith('628') && cleaned.length >= 10 && cleaned.length <= 15) return cleaned;
    return null;
}

// ============================================================
// DATA SAMPLE: Simulasi output nyata dari go-scraper untuk Barber Shop Denpasar
// Berdasarkan struktur JSON yang dihasilkan gosom/google-maps-scraper
// ============================================================
const mockScraperData = [
    // Barber shop biasa - nomor HP normal
    { name: "Barber Bros Denpasar", phone: "081234567890", review_rating: "4.5", review_count: 25, website: "N/A", about: null },
    // Barber shop - nomor formatnya ada spasi
    { name: "Classic Cut Barbershop", phone: "0812 3456 7890", review_rating: "4.2", review_count: 12, website: "N/A", about: null },
    // Barber shop - nomor format +62
    { name: "Bali Barber Studio", phone: "+62 812-3456-7891", review_rating: "4.7", review_count: 45, website: "https://balibarber.com", about: null },
    // Barber shop - nomor 0361 (fixed line)
    { name: "Royal Barber Denpasar", phone: "0361-234567", review_rating: "4.3", review_count: 18, website: "N/A", about: null },
    // Barber shop - tanpa nomor
    { name: "Koming Barber", phone: "", review_rating: "4.6", review_count: 30, website: "N/A", about: null },
    // Rating terlalu rendah
    { name: "Bad Barber", phone: "08123456789", review_rating: "3.1", review_count: 3, website: "N/A", about: null },
    // Review terlalu sedikit  
    { name: "New Barber", phone: "08198765432", review_rating: "4.8", review_count: 1, website: "N/A", about: null },
];

// ============================================================
// SIMULASI PIPELINE
// ============================================================
console.log("=".repeat(65));
console.log("DEEP DIAGNOSTIC — Simulasi Full Pipeline Scraper");
console.log("=".repeat(65));

let totalProcessed = 0, aiProcessedCount = 0, totalInserted = 0, aiRejectedCount = 0;

for (const item of mockScraperData) {
    totalProcessed++;
    
    const leadName = item.name;
    const rawPhone = item.phone || '';
    const sanitizedWa = sanitizeWaNumber(rawPhone);
    const website = item.website || 'N/A';
    const finalRating = parseFloat(item.review_rating || '0');
    const reviewCount = item.review_count || 0;
    const aboutText = item.about || 'N/A';

    console.log(`\n[${totalProcessed}] ${leadName}`);
    console.log(`   Raw Phone: "${rawPhone}" → Sanitized: ${sanitizedWa || '❌ NULL'}`);
    console.log(`   Rating: ${finalRating}, Reviews: ${reviewCount}`);
    
    // PRE-FILTER
    if (finalRating < 3.5) {
        console.log(`   → PRE-FILTER DROP: Rating ${finalRating} < 3.5`);
        continue;
    }
    if (reviewCount < 2) {
        console.log(`   → PRE-FILTER DROP: Reviews ${reviewCount} < 2`);
        continue;
    }
    
    // Tidak ada syarat sanitizedWa lagi - semua masuk ke AI
    console.log(`   → PASSES pre-filter, dikirim ke AI`);
    aiProcessedCount++;
    
    // SIMULASI: Apa yang AI akan lihat?
    console.log(`   AI akan menerima: WA="${rawPhone || 'tidak ada'}", website="${website}", about="${aboutText}"`);
    
    // SIMULASI AI response untuk data ini:
    // (Dalam kondisi nyata, ini akan memanggil Kie.ai)
    let mockAiDecision, mockAiWa, mockAiIg;
    
    if (sanitizedWa) {
        // Punya HP valid → AI harusnya PROCEED
        mockAiDecision = 'PROCEED';
        mockAiWa = sanitizedWa;
        mockAiIg = null;
    } else if (rawPhone && rawPhone.match(/^(0361|036|021|022)/)) {
        // Fixed line → AI harusnya SKIP tapi dengan IG discovery
        // Untuk barber shop, AI mungkin lebih ragu menebak IG (tidak seperti WO/salon)
        mockAiDecision = 'PROCEED'; // Karena prompt baru = tebak IG
        mockAiWa = '';
        mockAiIg = leadName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    } else {
        // Tidak ada nomor sama sekali
        mockAiDecision = 'PROCEED'; // Barber shop pasti ada IG
        mockAiWa = '';
        mockAiIg = leadName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    }
    
    console.log(`   MOCK AI Response: decision=${mockAiDecision}, wa="${mockAiWa}", ig="${mockAiIg}"`);
    
    if (mockAiDecision === 'PROCEED') {
        // FAIL-SAFE CHECK
        const rawAiWa = mockAiWa || null;
        const rawAiIg = mockAiIg || null;
        const aiWa = rawAiWa ? sanitizeWaNumber(String(rawAiWa)) : null;
        const fallbackWa = rawAiWa ? String(rawAiWa).replace(/\D/g, '') : null;
        const finalWa = aiWa || sanitizedWa || (fallbackWa && fallbackWa.length >= 10 ? fallbackWa : null);
        const aiIg = rawAiIg && rawAiIg.trim().toLowerCase() !== 'null' && rawAiIg.trim() !== '' ? rawAiIg : null;
        
        console.log(`   After fail-safe: finalWa=${finalWa || 'null'}, aiIg=${aiIg || 'null'}`);
        
        if (!finalWa && !aiIg) {
            console.log(`   → ❌ FAIL-SAFE DROP: No contact info at all`);
            aiRejectedCount++;
            continue;
        }
        
        // DB INSERT CHECK
        // wa field is String? @unique — CAN BE NULL!
        // If finalWa is null, wa column will be null
        // Multiple leads with wa=null are OK in PostgreSQL (null != null for unique constraints)
        console.log(`   → ✅ WOULD INSERT: wa=${finalWa || 'NULL'}, ig=${aiIg || 'NULL'}`);
        totalInserted++;
    } else {
        console.log(`   → ⛔ AI SKIP`);
        aiRejectedCount++;
    }
}

console.log("\n" + "=".repeat(65));
console.log(`SIMULATED RESULT:`);
console.log(`  Extracted:    ${totalProcessed}`);
console.log(`  AI Analysed:  ${aiProcessedCount}`);
console.log(`  AI Rejected:  ${aiRejectedCount}`);
console.log(`  New Leads:    ${totalInserted}`);
console.log(`  Pre-Filter:   ${totalProcessed - aiProcessedCount - totalInserted - aiRejectedCount}`);
console.log("=".repeat(65));

console.log(`\n⚠️  INVESTIGASI KEY QUESTIONS:`);
console.log(`1. Apakah "wa" di schema Prisma nullable? → wa String? @unique → YES, nullable ✅`);
console.log(`2. Apakah multiple NULL wa diizinkan di PostgreSQL? → YES (null != null in unique) ✅`);
console.log(`3. Apakah barber shop di Bali punya HP di Google Maps? → Perlu cek data asli`);
console.log(`\n⚠️  CRITICAL QUESTION: Apakah server sudah di-REBUILD setelah git pull?`);
console.log(`   Jika server masih menjalankan kode lama (compiled Next.js), perubahan tidak aktif!`);
