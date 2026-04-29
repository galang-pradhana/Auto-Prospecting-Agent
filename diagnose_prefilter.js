/**
 * DIAGNOSTIC #2: Cek apa yang sebenarnya dikirim ke AI
 * Simulasi pipeline pre-filter untuk melihat data apa yang lolos vs yang dibuang
 * Run: node diagnose_prefilter.js
 */

// Mirror dari lib/utils.ts
function sanitizeWaNumber(phone) {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }
    if (cleaned.startsWith('628') && cleaned.length >= 10 && cleaned.length <= 15) {
        return cleaned;
    }
    return null;
}

// Data sampel realistis untuk WO Bali (tirukan struktur Go-Scraper output)
const sampleData = [
    { name: "Bali Wedding Planner", phone: "0361-123456", review_rating: "4.5", review_count: 30, website: "https://baliwedding.com" },
    { name: "Denpasar Bride Studio", phone: "+62 361 987654", review_rating: "4.2", review_count: 15, website: "N/A" },
    { name: "Villa Wedding Bali", phone: "08123456789", review_rating: "4.8", review_count: 45, website: "N/A" },
    { name: "Tirta Wedding", phone: "0361456789", review_rating: "4.6", review_count: 22, website: "https://tirtawedding.id" },
    { name: "Putri Event Organizer", phone: "+6281234567890", review_rating: "4.3", review_count: 8, website: "N/A" },
    { name: "Suci Wedding Bali", phone: "", review_rating: "4.7", review_count: 50, website: "N/A" },
    { name: "Alit Organizer", phone: "036177889900", review_rating: "4.1", review_count: 12, website: "N/A" },
    { name: "Royal Bali Events", phone: "(0361) 234-5678", review_rating: "4.9", review_count: 100, website: "https://royalbali.com" },
    { name: "Mawar Wedding", phone: "0812 3456 7890", review_rating: "4.4", review_count: 18, website: "N/A" },
    { name: "Low Rating WO", phone: "08198765432", review_rating: "3.2", review_count: 5, website: "N/A" },
];

console.log("=".repeat(70));
console.log("DIAGNOSA PRE-FILTER — Scraper Pipeline");
console.log("=".repeat(70));

let passedCount = 0;
let droppedRating = 0;
let droppedReview = 0;
let droppedPhone = 0;

for (const item of sampleData) {
    const rawPhone = item.phone || '';
    const sanitizedWa = sanitizeWaNumber(rawPhone);
    const finalRating = parseFloat(item.review_rating || '0');
    const reviewCount = item.review_count || 0;
    
    let status = "PASS ✅";
    let reason = "-";
    
    if (finalRating < 3.5) {
        status = "DROP ❌";
        reason = `Rating terlalu rendah (${finalRating} < 3.5)`;
        droppedRating++;
    } else if (reviewCount < 2) {
        status = "DROP ❌";
        reason = `Review terlalu sedikit (${reviewCount} < 2)`;
        droppedReview++;
    }
    // Catatan: Kita SUDAH hapus syarat sanitizedWa di pre-filter, jadi sekarang ini tidak ada
    
    if (status === "PASS ✅") passedCount++;
    
    console.log(`\n${status} ${item.name}`);
    console.log(`   Raw Phone: "${rawPhone}" → sanitized: ${sanitizedWa || '❌ NULL'}`);
    console.log(`   Rating: ${finalRating}, Reviews: ${reviewCount}`);
    if (reason !== "-") console.log(`   Alasan drop: ${reason}`);
    
    // Ini yang akan dikirim ke AI:
    if (status === "PASS ✅") {
        console.log(`   → Akan dikirim ke AI dengan WA: "${rawPhone || 'tidak ada'}"`);
    }
}

console.log("\n" + "=".repeat(70));
console.log(`RINGKASAN: ${passedCount}/${sampleData.length} lolos pre-filter`);
console.log(`  - Drop karena rating: ${droppedRating}`);
console.log(`  - Drop karena review: ${droppedReview}`);
console.log("\n⚠️  PERHATIAN: Data dengan nomor 0361-xxx (fixed line Bali)");
console.log("   akan lolos PRE-FILTER dan masuk ke AI,");
console.log("   tapi AI akan SKIP karena bukan nomor HP seluler.");
console.log("   Ini kemungkinan penyebab utama tingginya AI Rejected!");
console.log("=".repeat(70));
