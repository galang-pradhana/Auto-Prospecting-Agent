// ============================================================
// FORGE PROMPTS — REVISED by Usrok
// Changelog:
//   - ENRICHMENT_PROMPT: tambah konteks spesifik biar output unik
//   - ARCHETYPE_MAP: archetype dipilih by kategori, bukan random
//   - MASTER_FORGE_PROMPT: inject archetype dari map, bukan shuffle
//   - WA_TEMPLATE: ganti ke value-first approach (cocok buat introvert)
//   - LEAD_EVALUATION: tambah prospectScore field
// ============================================================

export const GLOBAL_AI_PROTOCOL = `
[SYNAPSE PRO] MANDATORY DESIGN PROTOCOL:
1. TYPOGRAPHY PAIRING (EXCLUSIVE):
   - Option A: 'Syne' (Display) + 'Inter' (Sans) -> (Vibe: Tech, Boutique, Avant-garde)
   - Option B: 'Playfair Display' (Serif) + 'Outfit' (Sans) -> (Vibe: Luxury, Professional, Heritage)
2. LAYOUT DYNAMICS:
   - MANDATORY: Use Bento Grid structures for services/features sections.
   - MANDATORY: Implement Asymmetric Layouts (absolute decorative elements, negative margins, grid-cols-12 chaos).
3. COLOR THEORY: 禁止 Pure #000000. Use deep zinc/obsidian tones or brand-specific muted palettes.
4. IMAGE PROTOCOL: Unsplash &auto=format&fit=crop&w=1920&q=80.
5. LANGUAGE: 100% Professional, High-Conversion Bahasa Indonesia only.
`;

export const TONE_MAP: Record<string, string> = {
  "Interior Design": "Gunakan gaya bahasa kreatif, modern, dan sophisticated. Fokus pada estetika, fungsionalitas, dan transformasi ruang.",
  "Salon": "Gunakan gaya bahasa hangat, feminin, dan elegan. Fokus pada kepercayaan diri, perawatan diri, dan hasil nyata.",
  "Bengkel": "Gunakan gaya bahasa tegas, teknis, dan terpercaya. Fokus pada keandalan, ketepatan waktu, dan garansi kerja.",
  "Restoran": "Gunakan gaya bahasa sensorial dan mengundang. Fokus pada cita rasa, pengalaman makan, dan bahan berkualitas.",
  "Klinik": "Gunakan gaya bahasa profesional, tenang, dan empatik. Fokus pada kesehatan, kepercayaan, dan pelayanan prima.",
  "Toko": "Gunakan gaya bahasa ramah dan informatif. Fokus pada kemudahan berbelanja, pilihan produk, dan harga terbaik.",
  "default": "Gunakan gaya bahasa profesional dan persuasif. Fokus pada nilai bisnis dan kepercayaan pelanggan.",
};

// ============================================================
// ARCHETYPE MAP — berdasarkan kategori bisnis, bukan random
// Tambahkan kategori baru sesuai kebutuhan scraping
// ============================================================
export const ARCHETYPE_MAP: Record<string, string> = {
  // Dark/Industrial vibe
  "Bengkel": "ARCHETYPE 02: The Obsidian Glass",
  "Konstruksi": "ARCHETYPE 02: The Obsidian Glass",
  "Teknologi": "ARCHETYPE 02: The Obsidian Glass",
  "Percetakan": "ARCHETYPE 02: The Obsidian Glass",

  // Editorial/Modern vibe
  "Restoran": "ARCHETYPE 01: The Avant-Garde Editorial",
  "Cafe": "ARCHETYPE 01: The Avant-Garde Editorial",
  "Fotografer": "ARCHETYPE 01: The Avant-Garde Editorial",
  "Event Organizer": "ARCHETYPE 01: The Avant-Garde Editorial",
  "Interior Design": "ARCHETYPE 01: The Avant-Garde Editorial",

  // Heritage/Elegant vibe
  "Salon": "ARCHETYPE 03: The Heritage Suite",
  "Klinik": "ARCHETYPE 03: The Heritage Suite",
  "Spa": "ARCHETYPE 03: The Heritage Suite",
  "Wedding": "ARCHETYPE 03: The Heritage Suite",
  "Pendidikan": "ARCHETYPE 03: The Heritage Suite",
  "Law Firm": "ARCHETYPE 03: The Heritage Suite",
  "Properti": "ARCHETYPE 03: The Heritage Suite",

  // Default fallback
  "default": "ARCHETYPE 03: The Heritage Suite",
};

export const getArchetype = (category: string): string => {
  const key = Object.keys(ARCHETYPE_MAP).find((k) =>
    category.toLowerCase().includes(k.toLowerCase())
  );
  return key ? ARCHETYPE_MAP[key] : ARCHETYPE_MAP["default"];
};

// ============================================================
// LEAD_EVALUATION_PROMPT — ditambah prospectScore
// ============================================================
export const LEAD_EVALUATION_PROMPT = `
### ROLE: ELITE DATA SCRAPER & LEAD QUALIFIER (SYNAPSE LOGIC)
Tugas Anda adalah membedah data bisnis dari Google Maps dan melakukan filter ketat untuk mencari "High-Potential Leads". Anda harus berpikir seperti pakar strategi digital.

### I. KRITERIA FILTER (STRICT LOGIC):
1. WEBSITE STATUS (PRIORITAS): 
   - Loloskan bisnis yang TIDAK punya website.
   - Loloskan jika website hanya: "business.site", "linktree", "instagram.com", "facebook.com", atau "taplink".
   - SKIP jika sudah punya website custom yang profesional.

2. RATING & REVIEWS (LOGIKA TRADER): 
   - Range Rating: 3.5 - 4.8. 
   - Justifikasi: Rating 5.0 (Seringkali sudah punya tim marketing/agency), Rating < 3.0 (Kualitas bisnis buruk/Toxic). Kita cari yang potensial tapi butuh perbaikan branding.

3. FOLLOW-UP ACCESS: 
   - Wajib memiliki nomor WhatsApp aktif ATAU akun Instagram yang valid. Jika tidak ada WhatsApp tapi ada IG, tetap loloskan.

### II. DATA FIELDS (MANDATORY JSON):
{
  "name": "Nama Bisnis (Bersihkan karakter aneh)",
  "category": "Kategori Spesifik",
  "wa": "Nomor WhatsApp (Sanitized, format 62xxx)",
  "ig": "Username/URL Instagram (Jika ada)",
  "address": "Alamat Lengkap",
  "city": "Kota",
  "rating": "Rating Angka",
  "website": "URL Website saat ini (atau N/A)",
  "mapsUrl": "URL Google Maps",
  "reviewsCount": "Jumlah Review",
  "reason": "Alasan singkat kenapa ini Hot Lead (e.g., 'High reviews but no website, only IG')",
  "prospectScore": "Skor 1-10. Formula: (rating/5 * 4) + (min(reviewsCount,100)/100 * 4) + (2 jika tidak ada website sama sekali). Bulatkan ke 1 desimal."
}

### III. OUTPUT INSTRUCTION:
- HANYA keluarkan format JSON array.
- ZERO YAPPING.
- Jika data tidak memenuhi kriteria rating atau website, jangan masukkan ke hasil.
- Urutkan hasil dari prospectScore tertinggi ke terendah.
`;

// ============================================================
// ENRICHMENT_PROMPT — REVISED
// Problem lama: input terlalu generik → output mirip semua
// Fix: inject konteks spesifik (rating, review count, lokasi, sample review)
// ============================================================
export const ENRICHMENT_PROMPT = `
${GLOBAL_AI_PROTOCOL}
Strictly NO Yapping. No preamble. Output ONLY valid JSON.

You are a Senior Brand Strategist who deeply understands Indonesian local business culture.

### BUSINESS CONTEXT (USE ALL OF THIS — DO NOT IGNORE):
- Business Name: [businessName]
- Category: [category]
- City / Area: [city], [province]
- Address: [address]
- Rating: [rating] (from [reviewsCount] reviews)
- Sample Reviews (if available): [sampleReviews]
- Current Online Presence: [currentWebsite]

### TASK:
Analisis bisnis ini secara mendalam. Jangan gunakan template generic.
Gunakan konteks lokasi, rating, dan review nyata untuk membentuk narasi yang UNIK dan SPESIFIK untuk bisnis ini.

OUTPUT JSON (strict):
{
  "branding": {
    "title": "Headline utama yang bold dan spesifik untuk bisnis ini — BUKAN template generic",
    "tagline": "Sub-headline emosional max 12 kata, relevan dengan kategori dan lokasi",
    "description": "2-3 kalimat deskripsi yang terasa ditulis khusus untuk bisnis ini, bukan copy-paste template"
  },
  "painPoints": [
    "Pain point spesifik 1 berdasarkan kategori bisnis dan kondisi pasar lokal",
    "Pain point spesifik 2 yang relevan dengan rating dan jumlah review mereka",
    "Pain point spesifik 3 yang bisa diselesaikan dengan kehadiran website"
  ],
  "resolutions": [
    "Solusi konkret 1 yang langsung menjawab pain point 1",
    "Solusi konkret 2 yang langsung menjawab pain point 2",
    "Solusi konkret 3 yang langsung menjawab pain point 3"
  ],
  "styleDNA": "Deskripsi singkat visual identity yang cocok untuk bisnis ini berdasarkan kategori dan vibe lokalnya (e.g., 'Earthy & warm — palet cokelat tembakau dan krem, serif elegan, foto produk close-up')"
}
`;

// ============================================================
// WA_TEMPLATE_DRAFT_PROMPT — REVISED
// Problem lama: hard-sell, angka diskon ngarang, terlalu pushy
// Fix: value-first approach — kasih dulu, minta feedback, bukan closing
// Cocok buat lo yang introvert — nggak perlu pitch verbal
// ============================================================
export const WA_TEMPLATE_DRAFT_PROMPT = `
You are a Conversion Copywriter who specializes in "Value-First" outreach — the opposite of pushy sales.
The sender is an indie web developer reaching out to local Indonesian businesses.

Target business category: [category]

### PHILOSOPHY:
- Give value BEFORE asking anything.
- The goal of the first message is NOT to close — it's to get a reply.
- No fake urgency. No made-up discounts. No "hanya untuk 3 orang pertama".
- Short, human, and specific. It must NOT feel like a blast message.

### MESSAGE STRUCTURE:
1. Opening: Perkenalan singkat, minta maaf gangguin (1 kalimat, natural).
2. Hook: Sebutkan bahwa sender sudah iseng buatkan gambaran website untuk bisnis mereka — spesifik, bukan generic.
3. Value Delivery: Kasih link dummy website langsung — tanpa syarat, tanpa minta apa-apa dulu.
4. Soft CTA: Tanya pendapat mereka — bukan "mau beli nggak?". Contoh: "Sesuai nggak sama vibe bisnis Bapak/Ibu?"
5. Closing: Satu kalimat humble. Kalau cocok, bisa diskusi lebih lanjut.

### CONSTRAINTS:
- Language: 100% Bahasa Indonesia natural, bukan bahasa formal kaku.
- Tone: Ramah, rendah hati, tidak memaksa.
- Length: Maksimal 5-7 baris. Pendek = lebih mungkin dibaca.
- Variables yang WAJIB ada: {{businessName}}, {{category}}, {{draftLink}}
- ZERO angka diskon yang ngarang.
- ZERO scarcity palsu.
- Output: Teks pesan saja. Tidak ada intro, tidak ada penjelasan.
`;

// ============================================================
// WA_AI_FALLBACK_PROMPT — minor tweak, konsisten dengan filosofi value-first
// ============================================================
export const WA_AI_FALLBACK_PROMPT = `
Generate a short, human "Hook Message" for a WhatsApp outreach. 
Business: [businessName]
Category: [category]
Proposed Solution: [resolvingIdea]
Website Draft: [draftLink]

Persona: Indie developer lokal — ramah, rendah hati, tidak terkesan sales.
Philosophy: Value-first. Beri dulu, minta feedback, bukan closing.
Language: Natural Bahasa Indonesia. Bukan bahasa formal. Bukan bahasa iklan.
Length: Maksimal 5-7 baris.

Output: The message only (no quotes, no intro, no explanation).
`;

// ============================================================
// LANDING_PAGE_GENERATOR_PROMPT — unchanged, still solid
// ============================================================
export const LANDING_PAGE_GENERATOR_PROMPT = `
ROLE: Senior UX/UI Developer & Conversion Specialist.
TASK: Build a high-end landing page for "[name]" (Category: [category]).

### STEP 1: SELECT ARCHETYPE (USE ARCHETYPE_MAP, NOT RANDOM)
Use the archetype determined by the system for this category: [selectedArchetype]
- ARCHETYPE 01 (The Avant-Garde Editorial): High-fashion style, large serif typography, overlapping images, extreme whitespace.
- ARCHETYPE 02 (The Obsidian Glass): Dark mode, glassmorphism, accent gold/emerald, glowing borders, high-tech vibe.
- ARCHETYPE 03 (The Heritage Suite): Clean, soft earth tones, organic spacing, thin lines, sophisticated subtle animations.

### STEP 2: BUILD CONTENT
- Hero: Clear value proposition with emotional hook.
- Story: Focus on "The Experience", not just features.
- Portfolio: Use a 12-column Bento Grid layout.
- CTA: Floating or sticky WhatsApp button with personalized message.

### STEP 3: TECHNICAL REQUIREMENTS
- Tailwind CDN included.
- Lucide-react icons.
- Responsive design (Mobile-first logic).
- Framer Motion (via script tag) for smooth reveal animations.
`;

// ============================================================
// MASTER_FORGE_PROMPT — REVISED
// Fix: archetype di-inject dari ARCHETYPE_MAP, bukan "randomly"
// ============================================================
export const MASTER_FORGE_PROMPT = `
${GLOBAL_AI_PROTOCOL}

[SYNAPSE PRO | PRE-GEN LOGIC]
Direction: Before generating code, deeply analyze the business essence.
Goal: Transform [category] data into a UNIQUE visual identity — no two businesses should look the same.

[ARCHETYPE DIRECTIVE — SYSTEM ASSIGNED, DO NOT OVERRIDE]
Use this specific archetype for this generation:
[selectedArchetype]

Archetype definitions:
- ARCHETYPE 01 "The Avant-Garde Editorial": Typography Syne/Inter. High whitespace, large text, asymmetric overlaps. Vibe: modern, bold, editorial.
- ARCHETYPE 02 "The Obsidian Glass": Typography Syne/Inter. Dark mode, heavy glassmorphism, accent gold/emerald, glowing borders. Vibe: premium, industrial, tech.
- ARCHETYPE 03 "The Heritage Suite": Typography Playfair/Outfit. Clean, serif-driven, elegant lines, sophisticated muted tones. Vibe: trusted, refined, heritage.

[STRICT BUSINESS DATA]
- Brand Name: [brandName]
- Category: [category]
- Real Address: [fullAddress]
- WhatsApp Link: [waLink]
- Style DNA: [styleDNA]
- Core Pain Points: [painPoints]
- Winning Solution: [resolvingIdea]

[HERO SECTION REQUIREMENTS: SYNAPSE-LEVEL]
- Cinematic Hero: Full min-h-screen, high-contrast overlay.
- HTML Structure: <div class="hero" style="background-image: url('UNSPLASH_URL_RELEVANT_TO_CATEGORY'), linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.9)); background-color: #121212;">
- Content: Headline must be professional, punchy Bahasa Indonesia — USE the branding.title from enrichment data.
- Unsplash query MUST match the business category (e.g., bengkel → mechanic workshop, salon → hair salon interior).

[CORE ARCHITECTURE]
- 100% Standalone index.html.
- Tailwind CSS & Framer Motion (reveal animations).
- LANGUAGE LOCK: 100% Professional Bahasa Indonesia. Zero English on UI.

[VISUAL ENFORCEMENT]
- Bento Grid: All services and features sections MUST use a non-standard Bento Grid layout.
- Asymmetry: Use absolute elements or col-span variations to break the grid flow.
- Color palette MUST align with styleDNA — do NOT use default colors.

[LEAD CONVERSION FAB]
- Persistent WhatsApp FAB: Bottom right, #25D366, pulse animation, "Konsultasi Sekarang".

Output ONLY the full HTML code. No talk.
`;

// ============================================================
// REGIONAL_ADVICE_PROMPT — unchanged
// ============================================================
export const REGIONAL_ADVICE_PROMPT = `
Tugas: Berikan saran wilayah (kecamatan/area) yang paling potensial untuk bisnis kategori "[category]" di "[city], [province]".

Instruksi:
1. Analisa demografi atau karakteristik ekonomi wilayah tersebut jika memungkinkan.
2. Rekomendasikan minimal 3 kecamatan atau area spesifik.
3. Berikan alasan singkat mengapa area tersebut potensial (misal: pusat keramaian, banyak pemukiman elit, area sekolah, dll).
4. Gunakan gaya bahasa yang profesional dan informatif.

Output WAJIB JSON murni dengan struktur:
{
  "recommendations": [
    { "area": "...", "reason": "..." }
  ],
  "summary": "..."
}
`;

// ============================================================
// STYLE_TWEAK_PROMPT — unchanged
// ============================================================
export const STYLE_TWEAK_PROMPT = `
${GLOBAL_AI_PROTOCOL}

### ROLE: SENIOR WEB ARCHITECT & DESIGN EVOLUTION EXPERT
Tugas Anda adalah memperbarui "Master Blueprint" (Master Website Prompt) untuk bisnis "[name]" ([category]) berdasarkan Style Model baru yang dipilih.

### I. ORIGINAL BLUEPRINT:
[masterWebsitePrompt]

### II. NEW STYLE CONFIGURATION (JSON):
[styleConfig]

### III. EVOLUTION RULES:
1. Analisa Style Config baru (Color Palette, Typography, Button Styles, dsb).
2. Tanamkan elemen-elemen dari Style Config tersebut ke dalam Blueprint yang sudah ada.
3. Pastikan outputnya tetap berupa narasi/instruksi yang sangat detail (Master Prompt) untuk AI Coder.
4. Jangan ubah esensi bisnis, hanya evolusi visual dan struktur komponen agar sesuai dengan gaya baru.

PENTING: Output HANYA berupa narasi instruksi (Master Prompt) yang baru. Jangan sertakan teks lain atau JSON.
`;

// ============================================================
// MASTER_PRO_BLUEPRINT_PROMPT — unchanged, solid
// ============================================================
export const MASTER_PRO_BLUEPRINT_PROMPT = `
### ROLE: LEAD UI/UX ENGINEER & BRAND STRATEGIST (UI/UX PRO MAX SKILL)
Tugas Anda adalah membedah bisnis "[name]" ([category]) dan merancang "Blueprint Master" (Master Prompt) menggunakan framework UI/UX Pro Max untuk landing page 1 halaman.

### I. DATA INPUT:
- Business: [name]
- Category: [category]
- Location: [address]
- Style DNA: [styleDNA]

### II. DESIGN SYSTEM GENERATION (INTERNAL REASONING):
Berdasarkan data kategori dan Style DNA, Anda wajib menentukan:
1. LANDING PAGE PATTERN: Pilih (Hero-Centric / Conversion-Optimized / Storytelling-Driven).
2. VISUAL STYLE: Gunakan Style DNA sebagai acuan utama. Pilih dari (Glassmorphism / Minimalism / Soft UI Evolution / Neubrutalism / Tropical Brutalism) sebagai teknik pelengkap.
3. SECTION FLOW: Tentukan urutan (e.g., Hero → Features/Bento → Social Proof → CTA).
4. ANTI-PATTERNS TO AVOID: Tentukan apa yang HARUS DIHINDARI untuk industri ini (e.g., "Jangan pakai warna neon untuk Law Firm").

### III. UI-UX PRO MAX MANDATORY RULES:
Di dalam field 'masterWebsitePrompt', instruksikan AI Coder untuk:
- TYPOGRAPHY: Gunakan pairing eksklusif (e.g., 'Syne' + 'Inter' atau 'Playfair Display' + 'Outfit').
- COLOR THEORY (60-30-10): Tentukan HEX Code spesifik dari Style DNA. 禁止 Pure #000000. Gunakan Deep Obsidian/Charcoal.
- GRID SYSTEM: Wajib gunakan Bento Grid dynamic 12-column untuk section layanan.
- INTERACTION: Wajib pakai Framer Motion CDN untuk Staggered Reveal & Scroll Animations.
- CTA: WhatsApp Sticky Button dengan subtle glow & high-conversion copywriting.

### IV. OUTPUT FORMAT (MANDATORY JSON):
{
  "brandData": "Ringkasan identitas brand & visual style yang dipilih",
  "aiAnalysis": "Analisis posisi pasar & target audience persona",
  "painPoints": "3 Masalah utama klien yang akan diselesaikan oleh desain ini",
  "masterWebsitePrompt": "Instruksi LENGKAP dalam Bahasa Indonesia untuk AI Coder (Gemini). Wajib sertakan Style DNA, warna HEX spesifik, dan struktur section yang detail."
}

PENTING: Jangan berikan teks lain selain JSON.
`;

// ============================================================
// WEBSITE_STRATEGY_PROMPT — minor tweak, tambah styleDNA
// ============================================================
export const WEBSITE_STRATEGY_PROMPT = `
${GLOBAL_AI_PROTOCOL}
Strictly NO Yapping. No preamble. Output ONLY the instruction text (paragraf padat).

Anda adalah Senior Web Strategist. Tugas Anda menulis instruksi teknis dan kreatif untuk 'Forge' (Pembuat Website).
Tuliskan instruksi pembuatan website yang kreatif (bespoke) untuk:
Bisnis: [brandName]
Kategori: [category]
Pain Points: [painPoints]
Winning Idea: [resolvingIdea]
Style DNA: [styleDNA]

INSTRUKSI PENULISAN:
1. Tulis dalam paragraf yang padat namun detail.
2. Gunakan Style DNA sebagai acuan warna dan vibe — jangan abaikan.
3. Jelaskan struktur komponen (Hero, Benefits, Gallery, CTA).
4. WAJIB: Instruksikan penggunaan Hero Section dengan background gambar besar (Cinematic Hero) dan overlay teks yang kontras tinggi untuk tampilan premium.
5. Pastikan semua elemen teks menggunakan Bahasa Indonesia yang profesional.

Contoh Gaya Output:
"Buat website dengan vibe cinematic yang premium untuk Maria Photo Studio. Gunakan palet warna charcoal dan emas untuk kesan mewah. Hero section wajib menggunakan background full-screen dari foto studio terbaik dengan overlay gelap 50% agar headline putih terlihat tajam. Tampilkan bento grid untuk portofolio hasil foto..."
`;
