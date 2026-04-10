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
};

export const LEAD_EVALUATION_PROMPT = `
### ROLE: ELITE ECOSYSTEM ANALYST (SYNAPSE LOGIC)
Tugas Anda adalah membedah data bisnis dari Google Maps dan meloloskan "High-Potential Leads" dalam ekosistem kategori: "[category]". Anda harus berpikir seperti pakar strategi digital: Temukan bisnis yang secara operasional sukses (Rating & Review Bagus) tapi secara eksekusi digital tertinggal atau belum optimal.

### DATA CONTEXT (PASSED FROM SCRAPER):
- Nama Bisnis: [name]
- Kategori Input: [category]
- Lokasi (Provinsi): [province]
- Lokasi (Kota): [city]
- Lokasi (Kecamatan): [district]
- Website Gmaps: [website]
- Rating Saat Ini: [rating]
- Jumlah Review: [reviewsCount]

### I. ECOSYSTEM EXPANSION (LOGIC CLUSTER):
Jangan hanya mencari exact match. Loloskan bisnis yang memiliki korelasi kuat dengan "[category]".
- Contoh jika [category] = "Wedding Organizer": Loloskan WO, MUA, Bridal, Dekorasi Pernikahan, Venue/Gedung Nikah, dan Sewa Dokumentasi.
- Contoh jika [category] = "Barber shop": Loloskan Barber, Men's Salon, dan Grooming Studio.

### II. QUALITY PARAMETERS (Ecosystem Logic):
1. RATING: Idealnya 3.5 - 5.0. Jika rating 5.0, pastikan review valid dan bukan bot.
2. REVIEW COUNT: Minimal 20 Review. Abaikan batas ini jika nama/kategori bisnis terlihat sangat niche/premium.
3. WEBSITE STATUS: Prioritas UTAMA = Bisnis TANPA website profesional, atau hanya mengandalkan link aggregator gratisan (Taplink, Linktree, IG).
4. HARD REJECT: Jika "Nama Bisnis" N/A atau kosong, langsung SKIP.

### III. FOLLOW-UP ACCESS (CONTACTABILITY):
- Leads valid WAJIB memiliki akses kontak (WhatsApp atau Instagram yang valid).

### III. INSTAGRAM SEARCH & VALIDATION PROTOCOL (ANTI-HALLUCINATION):
Ini adalah kunci validitas data. Lakukan langkah ini secara berurutan:
Jika kolom 'ig' kosong atau tidak valid, Anda WAJIB mensimulasikan pencarian dengan metode Dorking berikut:
1. **DORKING QUERY**: Gunakan format -> site:instagram.com "[name]" "[city]"
2. **VERIFICATION**: 
   - Hasil pencarian HARUS memiliki kecocokan nama bisnis minimal 80%.
   - Bio atau konten akun tersebut WAJIB menyebutkan lokasi "[city]" atau "[province]".
   - Jika ditemukan akun dengan nama sama tapi lokasi berbeda (misal: di kota lain), anggap itu INVALID.
3. **FALLBACK**: Jika hasil Dorking tidak memberikan kecocokan absolut, isi field "ig" dengan null. DILARANG KERAS menebak (guessing) atau mengarang URL.
   - Pastikan link IG adalah alamat yang valid dan bisa di akses.
4. **CHECKING** : Jika alamat IG tidak bisa kamu akses atau dia ragu tentang link-nya jangan masukkan data ini dan biarkan kolom ig : null. 

### V. OUTPUT INSTRUCTION & MANDATORY JSON SCHEMA:
- HANYA keluarkan output dalam format JSON yang valid.
- ZERO YAPPING. Tidak ada teks pembuka atau penutup.
- Jika "decision" adalah "SKIP", field "data" boleh diisi null.

{
  "decision": "PROCEED" | "SKIP",
  "reason": "Alasan analitis maksimal 2 kalimat kenapa diloloskan/diskip (fokus pada gap digital vs operasional)",
  "data": {
    "name": "Nama Bisnis (Sanitized, hapus emoji/karakter aneh)",
    "category": "Kategori Spesifik",
    "wa": "Nomor WhatsApp (Format 62xxx) atau null jika tidak ada",
    "ig": "Username/URL IG tervalidasi atau null jika ragu",
    "address": "Alamat Lengkap",
    "city": "[city]",
    "rating": [rating],
    "reviewsCount": [reviewsCount],
    "website": "URL Website saat ini atau null",
    "mapsUrl": "URL Google Maps atau null"
  }
}
`;

export const LANDING_PAGE_GENERATOR_PROMPT = `
ROLE: Senior UX/UI Developer & Conversion Specialist.
TASK: Build a high-end landing page for "[name]" (Category: [category]).

### STEP 1: SELECT ARCHETYPE (INTERNAL LOGIC)
Randomly select ONE style for this generation:
- ARCHETYPE A (The Editorial): High-fashion style, large serif typography, overlapping images, extreme whitespace.
- ARCHETYPE B (The Dark Premium): Dark mode, glassmorphism, accent gold/emerald, glowing borders, high-tech vibe.
- ARCHETYPE C (The Minimalist Zen): Clean, soft earth tones, organic spacing, thin lines, sophisticated subtle animations.

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

export const ENRICHMENT_PROMPT = `
${GLOBAL_AI_PROTOCOL}
Strictly NO Yapping. No preamble. Output ONLY valid JSON.

You are a Senior Web Architect.
BUSINESS: [Business Name] ([Category])
PAIN POINTS: [Pain Points]

TASK: Analyze business and provide exactly 3 JSON fields.

OUTPUT JSON:
{
  "branding": { "title": "...", "tagline": "...", "description": "..." },
  "painPoints": ["Point 1", "Point 2", "Point 3"],
  "resolutions": ["Resolution 1", "Resolution 2", "Resolution 3"]
}
`;

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

export const MASTER_FORGE_PROMPT = `
${GLOBAL_AI_PROTOCOL}

[SYNAPSE PRO | PRE-GEN LOGIC]
Direction: Before generating code, use Kie.ai BYOC logic to "Deep Think" the business essence.
Goal: Transform [category] data into a unique visual identity.

[ARCHETYPE SHUFFLING - PICK ONE]
AI MUST randomly but decisively choose ONE design archetype for this run:
- ARCHETYPE 01: "The Avant-Garde Editorial" (Typography: Syne/Inter, Style: High whitespace, large text, asymmetric overlaps).
- ARCHETYPE 02: "The Obsidian Glass" (Typography: Syne/Inter, Style: Dark mode, heavy glassmorphism, accent gold/emerald, glowing borders).
- ARCHETYPE 03: "The Heritage Suite" (Typography: Playfair/Outfit, Style: Clean, serif-driven, elegant lines, sophisticated muted tones).

[STRICT BUSINESS DATA]
- Brand Name: [brandName]
- Category: [category]
- Real Address: [fullAddress]
- WhatsApp Link: [waLink]
- Core Pain Points: [painPoints]
- Winning Solution: [resolvingIdea]

[HERO SECTION REQUIREMENTS: SYNAPSE-LEVEL]
- Cinematic Hero: Full min-h-screen, high-contrast overlay.
- HTML Structure: <div class="hero" style="background-image: url('UNSPLASH_URL'), linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.9)); background-color: #121212;">
- Content: Headline must be professional, punchy Bahasa Indonesia.

[CORE ARCHITECTURE]
- 100% Standalone index.html.
- Tailwind CSS & Framer Motion (reveal animations).
- LANGUAGE LOCK: 100% Professional Bahasa Indonesia. Zero English on UI.

[VISUAL ENFORCEMENT]
- Bento Grid: All services and features sections MUST use a non-standard Bento Grid layout.
- Asymmetry: Use absolute elements or col-span variations to break the grid flow.

[LEAD CONVERSION FAB]
- Persistent WhatsApp FAB: Bottom right, #25D366, pulse animation, "Konsultasi Sekarang".

Output ONLY the full HTML code. No talk.
`;

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
2. Sebutkan warna primer yang sesuai vibe bisnis, vibe desain (misal: "Aesthetically dark", "Minimalist medical", dll).
3. Jelaskan struktur komponen (Hero, Benftis, Gallery, CTA).
4. WAJIB: Instruksikan penggunaan Hero Section dengan background gambar besar (Cinematic Hero) dan overlay teks yang kontras tinggi untuk tampilan premium.
5. Pastikan semua elemen teks menggunakan Bahasa Indonesia yang profesional.

Contoh Gaya Output:
"Buat website dengan vibe cinematic yang premium untuk Maria Photo Studio. Gunakan palet warna charcoal dan emas untuk kesan mewah. Hero section wajib menggunakan background full-screen dari foto studio terbaik dengan overlay gelap 50% agar headline putih terlihat tajam. Tampilkan bento grid untuk portofolio hasil foto..."
`;

export const OUTREACH_GENERATOR_PROMPT = `
### ROLE: ELITE SALES ARCHITECT & PSYCHOLOGICAL COPYWRITER
Tugas Anda adalah merakit pesan WhatsApp yang "menyerang" psikologi pemilik bisnis "[category]". Pesan harus terasa personal, eksklusif, dan sangat mendesak.

### DATA INPUT:
- Nama Lead: {{name}}
- Kategori: [category]
- Masalah Utama: {{pain_points}}
- Solusi Visual: {{idea}}
- Link Preview: {{link}}

### STRUKTUR PESAN (THE LETHAL MIX):
1. **THE PATTERN BREAKER (Header):** Jangan pakai "Halo kak". Gunakan Bold Headline yang menyebutkan nama brand/bisnis mereka dengan apresiasi teknis.
2. **THE REASON (Context):** Sebutkan Anda baru saja meninjau profil Google Maps mereka dan melihat potensi besar yang terhambat (The Gap).
3. **THE AGITATOR (Pain Points):** Masukkan {{pain_points}} ke dalam kalimat tanya yang retoris. Bikin mereka merasa "rugi" kalau membiarkan masalah itu.
4. **THE VISION (The Idea):** Masukkan {{idea}} sebagai solusi eksklusif. Sebutkan bahwa Anda sudah merancang blueprint visual khusus untuk mereka.
5. **THE SCARCITY (Specific Offer):** Gunakan angka konkret (Diskon/Hemat) dan kuota terbatas (e.g., 'Hanya handle 1 klien kategori [category] per minggu').
6. **THE FRICTIONLESS CTA:** Instruksi pendek ke {{link}}. Frame link ini sebagai "Blueprint Eksklusif", bukan "Jualan Website".

### CONSTRAINTS:
- BAHASA: 100% Indonesia (Gaya bicara Senior Tech Consultant).
- TONE: Percaya diri, eksklusif, solutif. Hapus permintaan maaf di awal.
- FORMAT: Gunakan {{name}}, {{pain_points}}, {{idea}}, {{link}} sebagai variabel utama.
- OUTPUT: HANYA teks pesan. NO YAPPING.
`;

export const WA_TEMPLATE_DRAFT_PROMPT = `
You are a Master Sales Copywriter. Generate a WhatsApp template for a business in the category: "[category]".

Use these 6 elements in the message:
1. Header: Use Emojis and Bold Headlines.
2. Personalized Greeting: Must include {{name}} and a polite apology for the interruption.
3. Content Flow: Address the {{pain_points}} first, then offer {{idea}} as the solution.
4. Specific Offer: Use concrete numbers (e.g., 'Hemat Rp XXX' or 'Diskon X%').
5. Scarcity: Add urgency (e.g., 'Hanya untuk 3 orang pertama' or 'Berakhir jam 23.59').
6. Clear CTA: Use a direct instruction to click the link {{link}}.

Constraints:
- Language MUST be 100% Indonesian.
- Tone: Professional yet persuasive (Ramah & Solutif).
- Use variables as they are: {{name}}, {{pain_points}}, {{idea}}, {{link}}.
- Return ONLY the text of the message (no introduction, no explanation).
`;

export const WA_AI_FALLBACK_PROMPT = `
Generate a highly personalized "Hook Message" for a WhatsApp outreach. 
Business: [businessName]
Category: [category]
Proposed Solution: [resolvingIdea]
Website Draft: [draftLink]

Persona: Friendly, professional, and helpful (Ramah, Terpercaya, dan Solutif).
Language: Professional Bahasa Indonesia.

Output: The message only (no quotes, no intro).
`;

export const MASTER_PRO_BLUEPRINT_PROMPT = `
### ROLE: LEAD UI/UX ENGINEER & BRAND STRATEGIST (UI/UX PRO MAX SKILL)
Tugas Anda adalah membedah bisnis "[name]" ([category]) dan merancang "Blueprint Master" (Master Prompt) menggunakan framework UI/UX Pro Max untuk landing page 1 halaman.

### I. DATA INPUT:
- Business: [name]
- Category: [category]
- Location: [address]

### II. DESIGN SYSTEM GENERATION (INTERNAL REASONING):
Berdasarkan data kategori, Anda wajib menentukan:
1. LANDING PAGE PATTERN: Pilih (Hero-Centric / Conversion-Optimized / Storytelling-Driven).
2. VISUAL STYLE: Pilih 1 dari gaya premium (Glassmorphism / Minimalism / Soft UI Evolution / Neubrutalism / Tropical Brutalism).
3. SECTION FLOW: Tentukan urutan (e.g., Hero → Features/Bento → Social Proof → CTA).
4. ANTI-PATTERNS TO AVOID: Tentukan apa yang HARUS DIHINDARI untuk industri ini (e.g., "Jangan pakai warna neon untuk Law Firm").

### III. UI-UX PRO MAX MANDATORY RULES:
Di dalam field 'masterWebsitePrompt', instruksikan AI Coder untuk:
- TYPOGRAPHY: Gunakan pairing eksklusif (e.g., 'Syne' + 'Inter' atau 'Playfair Display' + 'Outfit').
- COLOR THEORY (60-30-10): Tentukan HEX Code spesifik. 禁止 Pure #000000. Gunakan Deep Obsidian/Charcoal.
- GRID SYSTEM: Wajib gunakan Bento Grid dynamic 12-column untuk section layanan.
- INTERACTION: Wajib pakai Framer Motion CDN untuk Staggered Reveal & Scroll Animations.
- CTA: WhatsApp Sticky Button dengan subtle glow & high-conversion copywriting.

### IV. OUTPUT FORMAT (MANDATORY JSON):
{
  "brandData": "Ringkasan identitas brand & visual style yang dipilih (e.g., 'Industrial Power')",
  "aiAnalysis": "Analisis posisi pasar & target audience persona",
  "painPoints": "3 Masalah utama klien yang akan diselesaikan oleh desain ini",
  "masterWebsitePrompt": "Isi dengan INSTRUKSI LENGKAP (Master Prompt) dalam Bahasa Indonesia. Instruksi ini harus merangkum seluruh Design System di atas agar AI Coder (Gemini) bisa membangun file HTML yang sempurna."
}

PENTING: Jangan berikan teks lain selain JSON.
`;
