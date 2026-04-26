// Use built-in fetch

async function callKieAI(prompt) {
    const apiKey = "911cf0b26f09473270e11ce76e33d99a";
    const url = "https://api.kie.ai/gemini-3.1-pro/v1/chat/completions";
    const body = { 
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
        stream: false
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!data.choices) {
        console.error("AI Error Response:", JSON.stringify(data));
        return null;
    }
    return data.choices[0].message.content;
}

const prompt = `
### ROLE: ELITE DATA SCRAPER & LEAD QUALIFIER (SYNAPSE LOGIC)
Tugas Anda adalah membedah data bisnis dari Google Maps dan melakukan filter ketat untuk mencari "High-Potential Leads". Anda harus berpikir seperti pakar strategi digital.

### I. KRITERIA FILTER (STRICT LOGIC):
1. WEBSITE STATUS (PRIORITAS): 
   - LOLOSKAN bisnis yang TIDAK punya website (N/A). Ini adalah target prioritas karena mereka butuh jasa digitalisasi.
   - Loloskan jika website hanya: "business.site", "linktree", "instagram.com", "facebook.com", "blogspot.com", "wordpress.com", atau "taplink".
   - SKIP MUTLAK jika sudah punya website dengan domain profesional/custom (contoh: .com, .co.id, .id, .net) yang terlihat sudah mapan.

2. RATING & REVIEWS (LOGIKA TRADER): 
   - Range Rating: 3.5 - 5.0. 
   - Justifikasi: Cari bisnis yang reputasinya bagus tapi infrastruktur digitalnya (web/sosmed) masih kurang.

3. PHONE & WHATSAPP VALIDATION (STRICT MOBILE ONLY):
   - Jika nomor adalah TELEPON RUMAH / KANTOR (contoh awalan: 021, 022, 0752, dsb), maka KOSONGKAN field "wa".
   - WA wajib berupa NOMOR HP SELULER (Indonesia: awalan 08 atau 628). Jika [wa] yang diberikan adalah nomor HP, gunakan itu.

4. FOLLOW-UP ACCESS IG & WA DISCOVERY ENGINE:
   - Jika GMaps tidak ada link IG: 
     - Lakukan deduksi username berdasarkan nama bisnis.
     - Hanya set "ig" jika Anda yakin > 70%. Jika ragu, set "ig" ke null.
     - ⚠️ PENTING: Jangan menolak bisnis hanya karena IG tidak ditemukan. WA seluler sudah cukup untuk kualifikasi PROCEED.

### II. DATA FIELDS (MANDATORY JSON):
{
  "decision": "PROCEED" atau "SKIP",
  "name": "Nama Bisnis",
  "category": "Kategori",
  "wa": "Nomor WhatsApp Seluler (628xxx). Kosongkan jika telp rumah.",
  "ig": "Username Instagram atau null",
  "reason": "Alasan singkat",
  "prospectScore": "Skor 1-10"
}

### III. OUTPUT INSTRUCTION:
- ZERO YAPPING. HANYA JSON.
- ⚠️ DECISION RULES:
  • PROCEED jika: (Ada WA seluler ATAU Ada IG) DAN (Tidak punya website profesional) DAN (Rating >= 3.5).
  • SKIP jika: (WA kosong DAN IG kosong) ATAU (Punya website profesional) ATAU (Rating < 3.5).
  • CATATAN: Website "N/A" atau gratisan = PROCEED.

PENTING: Gunakan DATA di bawah ini secara LITERAL. JANGAN mengarang nomor WA atau nama bisnis baru.

### IV. DATA TO EVALUATE (DATA ASLI DARI GOOGLE MAPS — JANGAN DIABAIKAN):
- Nama Bisnis: Bali Shanti Wedding
- Kategori Gmaps: Wedding Organizer
- Alamat: Jl. Teuku Umar, Denpasar Barat
- Lokasi: Denpasar, Bali (Denpasar Barat)
- Rating: 4.8
- Nomor Telepon/WA: 081234567890
- Website: N/A
- Jumlah Review: 45

PENTING: Gunakan DATA di atas secara LITERAL. JANGAN mengarang atau mengubah data. JANGAN mengganti nama bisnis dengan nama lain. Nama yang dioutput HARUS SAMA PERSIS dengan "Nama Bisnis" di atas (kecuali membersihkan karakter aneh/simbol berlebihan).
`;

callKieAI(prompt).then(console.log).catch(console.error);
