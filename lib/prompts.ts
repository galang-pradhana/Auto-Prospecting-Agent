// ============================================================
// FORGE PROMPTS — REVISED v2 by Usrok
// Changelog v2:
//   - INDUSTRY_RULES: Tambah 161 reasoning rules dari UI UX Pro Max
//   - ARCHETYPE_MAP: Extended, sekarang include avoidPatterns per industri
//   - MASTER_FORGE_PROMPT: Inject industry rules ke design generation
//   - LANDING_PAGE_GENERATOR_PROMPT: Image fallback strategy (no more blank images)
//   - IMAGE_PROTOCOL: Multi-layer fallback Unsplash → Picsum → CSS gradient
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
6. ⚠️ MOBILE-FIRST MANDATE: All layouts MUST be responsive by default (w-full, px-4) and only expand/restructure on 'md:' (768px) and 'lg:' (1024px).
7. ⚠️ CRITICAL JAVASCRIPT RULE — NEVER USE HTML COMMENTS INSIDE <script> TAGS:
   HTML comments (<!-- -->) inside <script> blocks are NOT valid JavaScript and cause FATAL SYNTAX ERRORS.
   INSIDE <script>: Use ONLY JavaScript comments: // single line  OR  /* multi-line block */
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
// INDUSTRY_RULES — Extracted & adapted dari UI UX Pro Max v2.x
// 161 reasoning rules → distilled ke kategori yang relevan untuk
// bisnis lokal Indonesia (yang kemungkinan di-scrape dari GMaps)
// Struktur per kategori:
//   pattern     : landing page structure yang direkomendasikan
//   stylePriority: visual style utama
//   colorMood   : palet yang tepat untuk industri ini
//   keyEffects  : animasi/interaksi yang cocok
//   avoidPatterns: WAJIB DIHINDARI untuk industri ini
// ============================================================
export const INDUSTRY_RULES: Record<string, {
  pattern: string;
  stylePriority: string;
  colorMood: string;
  keyEffects: string;
  avoidPatterns: string;
}> = {
  // ── FOOD & BEVERAGE ────────────────────────────────────────
  "Restoran": {
    pattern: "Hero-Centric + Social Proof → Menu Highlight → Testimonial → Reservation CTA",
    stylePriority: "Soft UI Evolution atau Organic Biophilic — hangat, sensorial, mengundang",
    colorMood: "Warm amber, deep terracotta, cream — menggugah selera. Hindari biru dingin.",
    keyEffects: "Smooth image reveal on scroll, subtle hover zoom pada menu items, staggered card entrance",
    avoidPatterns: "Dark mode murni, neon colors, AI gradient ungu/pink, layout terlalu teknis/grid kaku",
  },
  "Cafe": {
    pattern: "Storytelling-Driven → Ambience Gallery → Menu Signature → Social Proof → CTA",
    stylePriority: "Avant-Garde Editorial atau Organic Biophilic — artsy, cozy, Instagram-worthy",
    colorMood: "Warm mocha, sage green, off-white — earthy dan instagrammable",
    keyEffects: "Parallax pada hero image, masonry gallery reveal, smooth scroll transitions",
    avoidPatterns: "Corporate feel, terlalu banyak teks, layout simetris membosankan, warna cold/steril",
  },
  "Bakery": {
    pattern: "Hero-Centric (foto produk besar) → Signature Products → Story → CTA Order",
    stylePriority: "Claymorphism atau Soft UI Evolution — playful, warm, artisanal",
    colorMood: "Dusty rose, warm cream, golden wheat — lembut dan menggugah",
    keyEffects: "Gentle float animation pada produk, soft shadow hover, scroll-reveal sections",
    avoidPatterns: "Dark mode, glassmorphism dingin, typography terlalu formal/serif kaku",
  },
  "Catering": {
    pattern: "Social Proof-Focused → Menu Packages → Gallery Event → Pricing → CTA",
    stylePriority: "Trust & Authority + Social Proof-Focused — profesional, terpercaya",
    colorMood: "Warm gold, deep maroon, cream — mewah tapi hangat",
    keyEffects: "Counter angka (total event served), testimonial carousel, image gallery hover",
    avoidPatterns: "Terlalu minimalis sehingga terkesan tidak berisi, warna cerah neon",
  },

  // ── HEALTH & BEAUTY ────────────────────────────────────────
  "Salon": {
    pattern: "Hero Emosional → Before/After Gallery → Services Bento → Testimonial → Booking CTA",
    stylePriority: "Soft UI Evolution — feminin, elegan, premium tanpa terkesan mahal berlebihan",
    colorMood: "Blush pink, champagne, warm white — lembut dan percaya diri",
    keyEffects: "Before/after slider interaktif, smooth card hover, staggered service reveal",
    avoidPatterns: "Dark mode, warna terlalu bold/neon, layout maskulin/industrial, font sans-serif blunt",
  },
  "Spa": {
    pattern: "Immersive Hero (full-screen ambience) → Services → Benefits → Testimonial → Booking",
    stylePriority: "Neumorphism atau Organic Biophilic — tenang, mewah, therapeutic",
    colorMood: "Sage green, warm stone, off-white — calming dan premium",
    keyEffects: "Slow parallax hero, gentle fade-in per section, subtle texture backgrounds",
    avoidPatterns: "Bright colors, fast animations, terlalu banyak elemen, CTA agresif",
  },
  "Klinik": {
    pattern: "Trust & Authority → Services Grid → Doctor Profiles → Testimonial → Appointment CTA",
    stylePriority: "Accessible & Ethical + Minimalism — bersih, terpercaya, profesional",
    colorMood: "Clean white, calm teal/blue-green, soft grey — medis tapi tidak dingin",
    keyEffects: "Clean card hover states, accordion FAQ, smooth form transitions",
    avoidPatterns: "Dark mode, neon colors, glassmorphism berlebihan, animasi terlalu playful, AI purple gradient",
  },
  "Apotek": {
    pattern: "Trust First → Product Categories → Health Info → Testimonial → Contact CTA",
    stylePriority: "Minimalism + Accessible & Ethical — bersih, informatif, terpercaya",
    colorMood: "Clean green-teal, white, light grey — kesehatan dan kepercayaan",
    keyEffects: "Category filter smooth transition, clean card hover, progress indicator",
    avoidPatterns: "Dark theme, warna terlalu colorful, layout terlalu kreatif/artistik",
  },
  "Barbershop": {
    pattern: "Hero Bold → Services + Pricing → Gallery Hasil → Testimonial → Booking CTA",
    stylePriority: "Neubrutalism atau Avant-Garde Editorial — maskulin, bold, contemporary",
    colorMood: "Deep black, warm gold/brass, off-white — maskulin premium",
    keyEffects: "Bold typography entrance, sharp hover states, gallery reveal staggered",
    avoidPatterns: "Pastel colors, rounded-corners berlebihan, feminine aesthetic, terlalu minimalis",
  },

  // ── AUTOMOTIVE & TECHNICAL ─────────────────────────────────
  "Bengkel": {
    pattern: "Hero Bold (mechanic/car visual) → Services → Trust Indicators → Testimonial → CTA",
    stylePriority: "Obsidian Glass atau Dark Mode — industrial, kuat, reliable",
    colorMood: "Deep charcoal, metallic silver, accent red/orange — power dan presisi",
    keyEffects: "Dramatic hero reveal, counter stats (mobil ditangani, tahun berpengalaman), sharp transitions",
    avoidPatterns: "Pastel colors, rounded soft UI, feminine aesthetic, warna pink/lavender, layout terlalu lembut",
  },
  "Dealer Mobil": {
    pattern: "3D Product Preview Hero → Car Catalog → Financing Info → Testimonial → Test Drive CTA",
    stylePriority: "3D & Hyperrealism atau Glassmorphism — premium, sophisticated, high-tech",
    colorMood: "Deep navy, chrome silver, white — premium otomotif",
    keyEffects: "360° car preview, smooth_catalog filter, parallax product shots",
    avoidPatterns: "Warm artisanal colors, handwritten fonts, terlalu casual/playful",
  },
  "Ekspedisi": {
    pattern: "Hero Map Visual → Service Routes → Pricing → Track Order → CTA",
    stylePriority: "Swiss Modernism 2.0 + Trust & Authority — efisien, terpercaya, logistik",
    colorMood: "Strong blue, white, grey — profesional dan reliable",
    keyEffects: "Route animation, progress tracker UI, clean table hover",
    avoidPatterns: "Decorative elements berlebihan, warna warm artisanal, layout terlalu kreatif",
  },

  // ── PROFESSIONAL SERVICES ──────────────────────────────────
  "Law Firm": {
    pattern: "Authority First → Practice Areas → Attorney Profiles → Case Results → Consultation CTA",
    stylePriority: "Swiss Modernism 2.0 + Trust & Authority — authoritative, conservative, premium",
    colorMood: "Deep navy, dark gold, warm white — otoritas dan kepercayaan",
    keyEffects: "Subtle entrance animations, clean hover states, professional transitions only",
    avoidPatterns: "Bright colors, playful animations, neon accents, AI gradient ungu/pink, glassmorphism, dark mode gamer",
  },
  "Akuntan": {
    pattern: "Trust & Authority → Services → Process (How It Works) → Testimonial → Consultation CTA",
    stylePriority: "Minimalism + Trust & Authority — clean, precise, reliable",
    colorMood: "Navy blue, forest green, white, gold accent — financial authority",
    keyEffects: "Number counter animations, clean accordion, smooth section transitions",
    avoidPatterns: "Bright/playful colors, terlalu banyak decorative elements, dark mode murni",
  },
  "Notaris": {
    pattern: "Authority Hero → Services → Legal Expertise → Process → Contact CTA",
    stylePriority: "Swiss Modernism 2.0 — formal, terpercaya, otoritatif",
    colorMood: "Deep maroon, dark gold, cream — klasik dan otoritatif",
    keyEffects: "Minimal clean transitions, professional card hover, no flashy animations",
    avoidPatterns: "Fun colors, playful design, terlalu modern/tech, animasi yang mencolok",
  },

  // ── CREATIVE INDUSTRIES ────────────────────────────────────
  "Fotografer": {
    pattern: "Immersive Portfolio Hero → Gallery Masonry → Style Categories → Testimonial → Booking CTA",
    stylePriority: "Motion-Driven atau Exaggerated Minimalism — visual-first, portfolio showcase",
    colorMood: "Dark cinematic atau clean white — biarkan foto yang berbicara",
    keyEffects: "Masonry grid hover reveal, lightbox gallery, smooth parallax, cursor custom",
    avoidPatterns: "Terlalu banyak teks, warna UI yang bersaing dengan foto, layout simetris membosankan",
  },
  "Desainer Grafis": {
    pattern: "Bold Portfolio Hero → Case Studies Bento → Skills → Testimonial → Hire Me CTA",
    stylePriority: "Brutalism atau Neubrutalism — bold, experimental, authentic",
    colorMood: "High contrast — hitam/putih dengan satu accent color bold",
    keyEffects: "Bold typography animations, experimental hover states, cursor interaction",
    avoidPatterns: "Generic corporate look, terlalu clean/safe, warna pastel membosankan",
  },
  "Event Organizer": {
    pattern: "Cinematic Hero → Event Portfolio → Services → Client Logos → CTA",
    stylePriority: "Avant-Garde Editorial + Vibrant — dynamic, memorable, exciting",
    colorMood: "Bold dan dynamic — sesuaikan dengan event type (wedding: rose gold, corporate: navy)",
    keyEffects: "Video/cinemagraph hero, gallery masonry, counter stats, smooth scroll",
    avoidPatterns: "Terlalu minimalis hingga tidak exciting, warna dull/corporate murni",
  },
  "Videografer": {
    pattern: "Video Hero Background → Portfolio Embed → Production Process → Pricing → CTA",
    stylePriority: "Dark Mode Cinematic + Motion-Driven — sinematik, premium, artsy",
    colorMood: "Dark cinematic, warm gold accent, minimal color — biar video yang jadi focal point",
    keyEffects: "Autoplay video hero (muted), smooth reel transitions, play button interactions",
    avoidPatterns: "Terlalu banyak warna UI, layout ramai yang bersaing dengan video",
  },
  "Interior Design": {
    pattern: "Portfolio Immersive → Style Categories → Process (How We Work) → Testimonial → Konsultasi CTA",
    stylePriority: "Exaggerated Minimalism atau Bento Box Grid — sophisticated, curated, visual-heavy",
    colorMood: "Warm neutral — warm white, sand, terracotta, sage — sesuai style portfolio",
    keyEffects: "Large image reveals, smooth_category filtering, parallax on featured projects",
    avoidPatterns: "Terlalu colorful/loud, layout terlalu teknis/grid kaku, warna neon/futuristik",
  },

  // ── EDUCATION & TRAINING ───────────────────────────────────
  "Pendidikan": {
    pattern: "Hero Aspirational → Program/Course Grid → Benefits → Testimonial → Enrollment CTA",
    stylePriority: "Claymorphism atau Accessible & Ethical — friendly, encouraging, approachable",
    colorMood: "Warm blue, soft green, white — optimistik dan terpercaya",
    keyEffects: "Smooth card reveals, progress indicators, friendly micro-interactions",
    avoidPatterns: "Dark mode, terlalu formal/korporat, warna muram, animasi complex yang membingungkan",
  },
  "Bimbel": {
    pattern: "Hero → Program Unggulan → Success Stats → Testimonial Siswa → Daftar CTA",
    stylePriority: "Claymorphism + Vibrant — semangat, energetik, youth-friendly",
    colorMood: "Bright tapi tidak neon — electric blue, warm yellow, white",
    keyEffects: "Counter stats (alumni sukses, passing rate), testimonial carousel, energetic reveals",
    avoidPatterns: "Terlalu corporate/formal, dark mode, warna terlalu muted/dewasa",
  },

  // ── PROPERTY & CONSTRUCTION ───────────────────────────────
  "Properti": {
    pattern: "Aspirational Hero → Property Listings Grid → Location Map → Testimonial → Konsultasi CTA",
    stylePriority: "Glassmorphism atau Soft UI Evolution — premium, aspirational, modern",
    colorMood: "Deep navy, warm gold, clean white — properti premium",
    keyEffects: "Property card hover reveal, smooth filter/search UI, parallax hero",
    avoidPatterns: "Terlalu casual, warna terlalu colorful, layout tidak terstruktur",
  },
  "Konstruksi": {
    pattern: "Portfolio Projects Hero → Services → Process Timeline → Client Logos → CTA",
    stylePriority: "Obsidian Glass atau Swiss Modernism 2.0 — kuat, profesional, reliable",
    colorMood: "Deep charcoal, concrete grey, accent orange/yellow — industrial strength",
    keyEffects: "Project showcase parallax, counter (projects completed), bold section reveals",
    avoidPatterns: "Pastel colors, terlalu lembut/rounded, feminine aesthetic, warna pink/lavender",
  },

  // ── RETAIL & E-COMMERCE ────────────────────────────────────
  "Toko": {
    pattern: "Product Hero → Category Grid → Featured Products → Testimonial → Shop CTA",
    stylePriority: "Conversion-Optimized + Social Proof-Focused — clean, trust-building, product-first",
    colorMood: "Brand-specific — clean white dengan accent color yang sesuai kategori produk",
    keyEffects: "Product card hover zoom, smooth category filter, add-to-cart micro-interactions",
    avoidPatterns: "Terlalu artistik sehingga product tenggelam, dark mode untuk produk sehari-hari",
  },
  "Butik": {
    pattern: "Editorial Fashion Hero → Collection Grid → Brand Story → Testimonial → Shop CTA",
    stylePriority: "Exaggerated Minimalism atau Avant-Garde Editorial — fashion-forward, curated",
    colorMood: "Monochromatic atau limited palette — hitam/putih, atau brand signature color",
    keyEffects: "Large editorial images, smooth collection transitions, editorial hover effects",
    avoidPatterns: "Terlalu colorful/playful, layout ramai, typography tidak premium",
  },

  // ── HOSPITALITY & WEDDING ─────────────────────────────────
  "Wedding": {
    pattern: "Romantic Hero → Packages → Gallery → Vendor Partners → Testimonial → Konsultasi CTA",
    stylePriority: "Soft UI Evolution + Heritage Suite — romantic, elegant, timeless",
    colorMood: "Blush rose, gold, champagne, cream — romantis dan mewah",
    keyEffects: "Cinematic gallery reveals, soft parallax, elegant typography entrance animations",
    avoidPatterns: "Dark mode, warna terlalu bold/kontras, font sans-serif yang terlalu modern/tech",
  },
  "Hotel": {
    pattern: "Immersive Hero → Room Types → Amenities Bento → Location → Testimonial → Book Now CTA",
    stylePriority: "Glassmorphism atau Liquid Glass — premium hospitality, aspirational",
    colorMood: "Deep teal, warm gold, cream white — luxury hospitality",
    keyEffects: "Full-screen room tour scroll, smooth amenity reveals, room comparison hover",
    avoidPatterns: "Budget/cheerful color scheme untuk hotel premium, terlalu minimalis/dingin",
  },

  // ── TECHNOLOGY & DIGITAL ──────────────────────────────────
  "Teknologi": {
    pattern: "Hero dengan Product Demo → Features Bento → Integrations → Testimonial → Free Trial CTA",
    stylePriority: "AI-Native UI atau Glassmorphism — cutting-edge, innovative, forward-thinking",
    colorMood: "Deep navy atau dark, electric blue/purple accent, clean white — tech premium",
    keyEffects: "Animated product demo, feature grid stagger, smooth scroll reveals",
    avoidPatterns: "Warm artisanal colors, serif heritage fonts, terlalu traditional/corporate",
  },
  "Percetakan": {
    pattern: "Product Showcase Hero → Product Categories → Custom Order Process → Portfolio → CTA",
    stylePriority: "Minimalism + Feature-Rich Showcase — clean, organized, product-focused",
    colorMood: "Bold CMYK reference — clean white dengan accent color strong",
    keyEffects: "Product category smooth filter, portfolio hover reveal, order process stepper",
    avoidPatterns: "Terlalu artistic hingga membingungkan, dark mode yang tidak fungsional",
  },

  // ── DEFAULT FALLBACK ──────────────────────────────────────
  "default": {
    pattern: "Hero-Centric → Services/Products → Social Proof → Testimonial → CTA",
    stylePriority: "Social Proof-Focused + Conversion-Optimized — trust-first, results-driven",
    colorMood: "Brand-appropriate — clean white base dengan accent color dari styleDNA",
    keyEffects: "Smooth scroll reveals, card hover states, subtle entrance animations",
    avoidPatterns: "AI purple/pink gradients, dark mode tanpa alasan, layout terlalu experimental",
  },
};

export const getIndustryRules = (category: string) => {
  const key = Object.keys(INDUSTRY_RULES).find((k) =>
    category.toLowerCase().includes(k.toLowerCase())
  );
  return key ? INDUSTRY_RULES[key] : INDUSTRY_RULES["default"];
};

// ============================================================
// ARCHETYPE MAP — extended dengan avoidPatterns
// ============================================================
export const ARCHETYPE_MAP: Record<string, string> = {
  "Bengkel":          "ARCHETYPE 02: The Obsidian Glass",
  "Konstruksi":       "ARCHETYPE 02: The Obsidian Glass",
  "Teknologi":        "ARCHETYPE 02: The Obsidian Glass",
  "Percetakan":       "ARCHETYPE 02: The Obsidian Glass",
  "Dealer Mobil":     "ARCHETYPE 02: The Obsidian Glass",
  "Videografer":      "ARCHETYPE 02: The Obsidian Glass",

  "Restoran":         "ARCHETYPE 01: The Avant-Garde Editorial",
  "Cafe":             "ARCHETYPE 01: The Avant-Garde Editorial",
  "Fotografer":       "ARCHETYPE 01: The Avant-Garde Editorial",
  "Event Organizer":  "ARCHETYPE 01: The Avant-Garde Editorial",
  "Interior Design":  "ARCHETYPE 01: The Avant-Garde Editorial",
  "Desainer Grafis":  "ARCHETYPE 01: The Avant-Garde Editorial",
  "Butik":            "ARCHETYPE 01: The Avant-Garde Editorial",

  "Salon":            "ARCHETYPE 03: The Heritage Suite",
  "Klinik":           "ARCHETYPE 03: The Heritage Suite",
  "Spa":              "ARCHETYPE 03: The Heritage Suite",
  "Wedding":          "ARCHETYPE 03: The Heritage Suite",
  "Pendidikan":       "ARCHETYPE 03: The Heritage Suite",
  "Law Firm":         "ARCHETYPE 03: The Heritage Suite",
  "Properti":         "ARCHETYPE 03: The Heritage Suite",
  "Hotel":            "ARCHETYPE 03: The Heritage Suite",
  "Akuntan":          "ARCHETYPE 03: The Heritage Suite",
  "Notaris":          "ARCHETYPE 03: The Heritage Suite",

  "default":          "ARCHETYPE 03: The Heritage Suite",
};

export const getArchetype = (category: string): string => {
  const key = Object.keys(ARCHETYPE_MAP).find((k) =>
    category.toLowerCase().includes(k.toLowerCase())
  );
  return key ? ARCHETYPE_MAP[key] : ARCHETYPE_MAP["default"];
};

// ============================================================
// IMAGE_CONFIG — Unsplash query mapping per kategori
// Digunakan untuk generate URL yang paling relevan + fallback
// ============================================================
export const UNSPLASH_QUERY_MAP: Record<string, string[]> = {
  "Restoran":       ["restaurant interior elegant", "fine dining food", "restaurant ambience"],
  "Cafe":           ["coffee shop interior", "cafe aesthetic", "barista coffee"],
  "Bakery":         ["bakery fresh bread", "pastry shop", "artisan bakery"],
  "Salon":          ["hair salon interior", "beauty salon", "hair styling"],
  "Spa":            ["spa wellness interior", "massage therapy", "luxury spa"],
  "Klinik":         ["medical clinic interior", "doctor office", "healthcare modern"],
  "Apotek":         ["pharmacy interior", "medical pharmacy", "drugstore modern"],
  "Barbershop":     ["barbershop interior", "barber classic", "men grooming"],
  "Bengkel":        ["auto mechanic workshop", "car repair garage", "automotive service"],
  "Dealer Mobil":   ["car showroom luxury", "automobile dealership", "cars display"],
  "Fotografer":     ["photography studio", "photographer at work", "camera professional"],
  "Interior Design":["interior design living room", "home decor modern", "architecture interior"],
  "Konstruksi":     ["construction building", "architecture modern", "civil engineering"],
  "Properti":       ["real estate modern house", "property luxury", "apartment interior"],
  "Wedding":        ["wedding decoration elegant", "wedding ceremony", "wedding venue"],
  "Hotel":          ["hotel lobby luxury", "hotel room premium", "resort interior"],
  "Teknologi":      ["technology office modern", "tech startup workspace", "digital innovation"],
  "Pendidikan":     ["classroom modern", "education learning", "school interior"],
  "Bimbel":         ["tutoring class", "students learning", "education youth"],
  "Law Firm":       ["law office professional", "lawyer office", "legal firm interior"],
  "Event Organizer":["event party decoration", "corporate event", "celebration venue"],
  "Catering":       ["catering food service", "banquet buffet", "professional catering"],
  "default":        ["professional business office", "modern workspace", "business professional"],
};

export const getUnsplashQuery = (category: string): string => {
  const key = Object.keys(UNSPLASH_QUERY_MAP).find((k) =>
    category.toLowerCase().includes(k.toLowerCase())
  );
  const queries = key ? UNSPLASH_QUERY_MAP[key] : UNSPLASH_QUERY_MAP["default"];
  return queries.join(" | ");
};

// ============================================================
// LEAD_EVALUATION_PROMPT — v3 with Priority Scoring System
// ============================================================
export const LEAD_EVALUATION_PROMPT = `
### ROLE: LEAD QUALITY ASSURANCE + PRIORITY SCORING ENGINE (SMART FILTER v3)
Tugasmu adalah memvalidasi kualitas bisnis, menentukan kontak terbaik, DAN memberikan skor prioritas
agar tim bisa fokus ke lead yang paling potensial untuk dikonversi.

### 1. ATURAN FILTER NAMA (ANTI-GENERIC):
- SKIP jika nama bisnis murni generik tanpa merek. Contoh: "Studio Yoga", "Warung Nasi", "Bengkel Motor", "Toko Obat".
- PROCEED jika ada identitas merek/brand di dalam namanya. Contoh: "Mahaloka House of Yoga", "Warung Nasi Bu Imas", "Bengkel Motor Setia Budi", "Toko Obat K24".
- CLEANUP: Hapus embel-embel lokasi dari nama bisnis (misal: "Regnum Studio - Denpasar Selatan" menjadi "Regnum Studio").

### 2. ATURAN KONTAK (STRICT):
- wa: HANYA boleh diisi jika nomor adalah HP seluler (awalan 08/628). Jika nomor landline/kantor (0361-xxx), KOSONGKAN field wa.
- ig: 
  - Jika di data [website] ada link instagram.com, ambil username-nya.
  - Jika tidak ada, tebak username IG (confidence >= 70%) format: [namabisnis], [namabisnis]bali, [namabisnis].id.

### 3. ATURAN WEBSITE (TARGETING):
- Kita fokus mencari bisnis yang BELUM memiliki website profesional.
- SKIP jika: Field [website] berisi domain profesional (misal: .com, .id, .net, .co.id) yang BUKAN merupakan Linktree, Instagram, atau bio-link lainnya.
- PROCEED jika: Field [website] kosong, "N/A", atau berisi link bio (Linktree, Instagram, WA, Beacons, dll).

### 4. KEPUTUSAN FINAL:
- PROCEED jika: Memiliki nomor HP seluler DAN/ATAU memiliki Instagram yang valid (pasti/tebakan cerdas) DAN tidak memiliki website profesional.
- PROCEED jika: Hanya memiliki Linktree/Instagram (ini adalah target utama untuk ditawari website asli).
- SKIP jika: Sudah memiliki website profesional (.com, .id, dll).
- SKIP jika: Nama generik, tidak ada HP seluler, dan tidak bisa menemukan IG yang meyakinkan.

---

### 5. PRIORITY SCORING ENGINE (HANYA jika keputusan = PROCEED):

Hitung total score (0–100) dari 4 dimensi berikut. Nilai WAJIB berupa angka integer.

#### [A] BRAND STRENGTH (0–25 poin)
Nilai seberapa kuat identitas merek bisnis ini berdasarkan nama dan deskripsi:
- 20–25: Nama unik + deskripsi kaya (ada USP, cerita, spesialisasi jelas)
- 12–19: Nama bermerek tapi deskripsi tipis atau generik
- 5–11: Nama ada mereknya tapi lemah (nama orang biasa, terlalu panjang, sulit diingat)
- 0–4: Hampir generik, lolos filter tapi barely

#### [B] REVIEW SIGNAL (0–25 poin)
Nilai potensi sosial proof berdasarkan rating dan jumlah review:
- 20–25: Rating ≥ 4.5 dengan ≥ 50 review → Reputasi kuat, mudah dibuatkan social proof
- 14–19: Rating 4.0–4.4 dengan ≥ 20 review, ATAU rating ≥ 4.5 dengan < 50 review
- 7–13: Rating 3.5–3.9 atau review < 20 → Ada potensi tapi perlu kerja keras
- 0–6: Rating < 3.5 atau tidak ada review → Risiko tinggi, konversi sulit
- BONUS +5 (max 25): Jika review menyebut kualitas spesifik (bukan "bagus" generik) → Bahan copywriting kaya

#### [C] WEBSITE GAP URGENCY (0–30 poin)
Nilai seberapa mendesak kebutuhan website bisnis ini:
- 25–30: Tidak ada website SAMA SEKALI + kategori high-value (Klinik, Law Firm, Hotel, Properti, Interior Design, Salon premium, Restoran) → Gap besar, ROI pitch mudah
- 18–24: Tidak ada website + kategori medium-value (Bengkel, Toko, Cafe, Barbershop, dll)
- 10–17: Hanya punya Linktree/Instagram + kategori apapun → Masih butuh website asli
- 3–9: Punya bio-link tapi kategori low-urgency (Warung, UMKM kecil)
- 0–2: Hampir tidak perlu website (bisnis terlalu kecil, offline-only jelas)

#### [D] CONTACT REACHABILITY (0–20 poin)
Nilai kemudahan menjangkau bisnis ini:
- 17–20: Punya WA aktif (HP seluler terverifikasi) DAN Instagram dengan followers jelas
- 12–16: Punya salah satu: WA aktif ATAU Instagram pasti (bukan tebakan)
- 6–11: Hanya tebakan IG dengan confidence ≥ 70%
- 0–5: Kontak sangat terbatas, hanya tebakan IG atau tidak ada WA

#### PRIORITY TIER (berdasarkan total score):
- 🔥 HOT (70–100): Blast sekarang. Auto-queue ke pipeline aktif.
- ⚡ WARM (40–69): Layak diproses setelah HOT selesai.
- 🧊 COLD (< 40): Simpan untuk batch berikutnya atau skip jika kapasitas penuh.

---

### OUTPUT FORMAT (JSON ONLY — no extra text):
{
  "decision": "PROCEED" atau "SKIP",
  "name": "nama bisnis yang sudah dibersihkan",
  "wa": "format 628xxx atau string kosong jika bukan HP",
  "ig": "username tanpa @ atau null",
  "reason": "alasan singkat keputusan filter",
  "score": 85,
  "priority_tier": "HOT",
  "score_breakdown": {
    "brand_strength": 22,
    "review_signal": 20,
    "website_gap_urgency": 28,
    "contact_reachability": 15,
    "total": 85
  }
}

Catatan: Jika decision = "SKIP", field score, priority_tier, dan score_breakdown TETAP diisi dengan nilai 0 dan tier "SKIPPED" agar data tetap konsisten untuk logging.

### DATA BISNIS:
- Nama: [name]
- Kategori: [category]
- Alamat: [address]
- Kota: [city], [province]
- Nomor: [wa]
- Website: [website]
- Rating: [rating]
- Jumlah Review: [reviewsCount]
- Deskripsi Bisnis: [about]
`;

// ============================================================
// ENRICHMENT_PROMPT — Branding Analysis
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
// WA_TEMPLATE_DRAFT_PROMPT — Value-First Outreach
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
- Variables yang WAJIB ada: {{businessName}}, {{category}}, {{draftLink}}, {{my_business_name}}, {{my_ig}}, {{my_wa}}
- Identitas Pengirim (Sertakan di akhir atau pembukaan):
  - Nama Bisnis: {{my_business_name}}
  - Instagram: {{my_ig}}
  - WhatsApp: {{my_wa}}
- ZERO angka diskon yang ngarang.
- ZERO scarcity palsu.
- Output: Teks pesan saja. Tidak ada intro, tidak ada penjelasan.
`;

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
// OUTREACH_PERSONAS — Dynamic presets for message generation
// ============================================================
export const PERSONA_OPTIONS = [
  { value: "professional", label: "👔 Professional" },
  { value: "casual",       label: "🎨 Indie Casual" },
  { value: "expert",       label: "🧠 Growth Expert" },
  { value: "disruptor",    label: "🚀 Disruptor" },
  { value: "storyteller",  label: "📖 Storyteller" },
  { value: "pragmatist",   label: "📊 Pragmatist" },
  { value: "connector",    label: "🤝 Connector" },
];

export const OUTREACH_PERSONAS: Record<string, string> = {

  "professional": `
  ### PERSONA: TRUSTED BUSINESS PARTNER
  Kamu adalah rekan strategis — bukan vendor, bukan agency.
  Kamu berbicara *dengan* mereka, bukan *kepada* mereka.

  TONE: Tenang, deliberate, berbobot. Seperti konsultan senior yang tidak perlu menjual diri
  — karena track record-nya berbicara sendiri.

  PHILOSOPHY: Problem recognition dulu, solusi belakangan.
  Tunjukkan bahwa kamu sudah mengerjakan sesuatu *sebelum* menghubungi mereka.
  Ini bukan cold pitch — ini laporan awal dari riset yang sudah dilakukan.

  LANGUAGE STYLE:
  - Pakai kalimat deklaratif yang tenang: "Saya sempat melakukan audit visual..."
  - Hindari superlative: bukan "terbaik" atau "profesional", tapi "terstruktur" dan "konsisten"
  - Sapaan: "Bapak/Ibu [nama]" — bukan "Halo Kak"
  - Pilih kata yang presisi, bukan kata yang terdengar mahal

  SMALL WIN FRAMING:
  Framing pesan bukan "saya bisa bantu bisnis Anda" tapi
  "saya sudah buat sesuatu untuk bisnis Anda — mau lihat?"
  Ini menggeser posisi dari pengemis perhatian ke pemberi nilai.

  AVOID:
  - Hype words: "luar biasa", "wow", "mantap"
  - Bahasa iklan: "dapatkan sekarang", "jangan lewatkan"
  - Self-promotion eksplisit: "kami berpengalaman 10 tahun..."
  - Ellipsis berlebihan (...)
`,
  "casual": `
    ### PERSONA: INDIE DEVELOPER LOKAL
    Tugas Anda adalah merakit pesan WhatsApp yang ramah, rendah hati, dan personal.
    TONE: Friendly, helpful, non-salesy. Bahasa Indonesia natural (bukan bahasa iklan).
    PHILOSOPHY: "Value-first" — beri feedback/preview dulu. Pakai gaya "Saya lagi riset untuk build portofolio..." atau "Lagi riset visual area sekitar ...".
  `,
  "expert": `
    ### PERSONA: VALUE-FIRST BOUTIQUE CONSULTANT
    Tugas Anda adalah merakit pesan WhatsApp sebagai partner pertumbuhan bisnis.
    TONE: Expert, trustworthy, focus on growth.
    PHILOSOPHY: Berikan value di awal sebelum meminta apa pun. Tekankan pada peningkatan omzet via digital branding.
  `,
   "disruptor": `
    ### PERSONA: DISRUPTOR
    Kamu adalah rekan bisnis yang aware dengan lanskap kompetitif industri mereka.
    TONE: Direct, forward-looking, energik — tapi bukan hype. Seperti sesama pelaku bisnis yang ngerti medan.
    PHILOSOPHY: Buka dengan problem recognition dulu ("market lo bergerak cepat"), lalu tunjukkan quick win konkret yang bisa langsung dirasakan.
    STYLE: Pakai angle competitive advantage — "sementara kompetitor lo masih..." atau "momentum sekarang bagus buat..."
    AVOID: Generik, basa-basi panjang, klaim tanpa konteks.
  `,
  "storyteller": `
    ### PERSONA: STORYTELLER
    Kamu adalah partner yang bantu bisnis menemukan dan menyampaikan cerita mereka.
    TONE: Hangat, emosional, penuh makna — bukan drama, tapi genuine.
    PHILOSOPHY: Koneksi dulu sebelum solusi. Acknowledge perjalanan atau identitas bisnis mereka, baru hubungkan ke visual/digital presence.
    STYLE: Pakai angle brand meaning — "ada cerita di balik bisnis ini yang layak lebih banyak orang tahu..." atau "visual yang kuat bukan soal tampilan, tapi soal rasa..."
    AVOID: Terlalu poetic sampai kehilangan CTA, kesan manipulatif.
  `,
  "pragmatist": `
    ### PERSONA: PRAGMATIST
    Kamu adalah partner yang bicara data dan ROI — bukan sales pitch.
    TONE: Datar, faktual, efisien. Tidak ada bunga-bunga. Respect waktu mereka.
    PHILOSOPHY: Langsung ke angka atau fakta yang relevan. Owner yang sudah jenuh dengan banyak penawaran butuh bukti, bukan janji.
    STYLE: Pakai angle metrics — "rata-rata bisnis [kategori] di area ini kehilangan X% traffic karena..." atau "website yang dioptimasi bisa reduce bounce rate hingga..."
    AVOID: Klaim tanpa dasar, terlalu banyak kata sifat, semua yang berbau "terbaik" atau "terpercaya".
  `,
  "connector": `
    ### PERSONA: CONNECTOR
    Kamu adalah hub — bukan vendor. Lo kenal ekosistem bisnis lokal dan posisi mereka di dalamnya.
    TONE: Kolaboratif, inklusif, subtle FOMO. Seperti teman yang punya akses, bukan salesman.
    PHILOSOPHY: Positioning berdasarkan network effect dan komunitas — "beberapa bisnis di area lo sudah mulai bergerak ke sini..." atau "ada momentum yang sedang terbentuk di [kategori] lokal..."
    STYLE: Pakai angle community & timing — gentle FOMO tanpa pressure. Undang mereka masuk, bukan dorong.
    AVOID: Hard sell, angka palsu, pressure tactic yang obvious.
  `
};

export const OUTREACH_GENERATOR_PROMPT = `
Kamu adalah seorang pebisnis lokal yang sedang mengirim pesan WhatsApp ke prospek UMKM di Indonesia.
Kamu sudah mengirim PESAN PERTAMA (Bait) terlebih dahulu untuk membuka percakapan.
Sekarang tugasmu adalah menulis PESAN KEDUA yang mengalir secara natural sebagai kelanjutannya.

### KONTEKS PESAN PERTAMA (SUDAH TERKIRIM — JANGAN DIULANG):
[bait_message]

### PERSONA YANG DIGUNAKAN:
[persona_definition]

### DATA BISNIS LEAD:
- Nama: {{name}}
- Kategori: [category]
- Pain Point Utama: {{pain_points}}
- Solusi yang Ditawarkan: {{idea}}
- Link Preview Website: {{link}}
- Identitasku:
    - Nama Bisnis: {{my_business_name}}
    - IG: {{my_ig}}
    - WA: {{my_wa}}

### INSTRUKSI PENULISAN PESAN KEDUA:

Pesan kedua ini harus terasa seperti lanjutan organik dari Pesan Pertama di atas.
Baca baik-baik angle dan hook yang sudah dipakai di Pesan Pertama, lalu build on top of it.
JANGAN memperkenalkan diri lagi atau mengulang sapaan.
JANGAN memulai dengan "Halo" atau "Permisi" karena percakapan sudah terbuka.

Struktur PESAN KEDUA (4 bagian, dipisah baris kosong):

Bagian 1 - BRIDGE (1-2 kalimat):
Sambungkan dari angle Pesan Pertama. Kalau bait pakai angle rating → bridge dengan "Nah, karena itulah...". Kalau bait pakai angle penasaran → bridge dengan "Yang kami maksud tadi adalah...". Naturalkan, jangan terasa copy-paste dari bait.

Bagian 2 - THE VALUE DELIVERY (2-3 kalimat):
Sampaikan bahwa kamu sudah iseng buatkan sesuatu khusus untuk {{name}} — konsep visual / blueprint digital — tanpa komitmen apapun.
Langsung berikan linknya di bagian ini: {{link}}
Framing: "coba lihat dulu", bukan promosi.

Bagian 3 - SOFT CTA (1-2 kalimat):
Ajukan satu pertanyaan ringan. Bukan "mau beli?", tapi tanyakan apakah konsepnya sudah cocok dengan arah bisnis mereka. Gunakan nada sesuai persona.

Bagian 4 - CLOSING + IDENTITAS:
Tutup dengan satu kalimat penutup yang humble sesuai persona.
Lalu sertakan identitas PERSIS dalam format ini (tanpa simbol tambahan):

{{my_business_name}}
WA: {{my_wa}}
IG: {{my_ig}}

### ATURAN KETAT:
- ZERO "Halo", ZERO sapaan ulang — pesan sudah terbuka.
- Jangan gunakan tanda bintang, underscore, hashtag, atau simbol markdown.
- Jangan sebut harga atau angka yang mengarang.
- Emoji boleh HANYA jika persona Casual, maksimal 1.
- Bahasa Indonesia natural sesuai persona — bukan bahasa iklan.
- Output: Teks pesan WhatsApp saja. Tanpa label, tanpa penjelasan, tanpa intro.
`;

// ============================================================
// MASTER_FORGE_PROMPT — REVISED v2
// Major changes:
//   1. Inject INDUSTRY_RULES (pattern + colorMood + avoidPatterns)
//   2. Image fallback protocol (3 layer: Unsplash → Picsum → CSS gradient)
//   3. styleDNA sekarang dikombinasikan dgn industry rules, bukan standalone
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

[INDUSTRY INTELLIGENCE — DARI UI/UX PRO MAX REASONING ENGINE]
Berdasarkan kategori "[category]", terapkan aturan industri berikut SECARA KETAT:

Landing Page Pattern: [industryPattern]
Visual Style Priority: [industryStylePriority]
Color Mood: [industryColorMood]
Key Effects: [industryKeyEffects]

⛔ ANTI-PATTERNS — WAJIB DIHINDARI UNTUK INDUSTRI INI:
[industryAvoidPatterns]

PENTING: Anti-patterns di atas bukan saran — ini LARANGAN KERAS. Jika styleDNA dari enrichment
bertentangan dengan anti-pattern industri, PRIORITASKAN anti-pattern industri.

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
- Unsplash queries untuk kategori ini: [unsplashQueries]
- Primary URL: https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=1920&q=80
  (GANTI dengan query yang relevan untuk [category])
- Content: Headline must be professional, punchy Bahasa Indonesia — USE the branding.title from enrichment data.

[IMAGE FAILSAFE PROTOCOL — MANDATORY, NO EXCEPTION]
Setiap elemen gambar di halaman WAJIB menggunakan sistem 3-layer fallback berikut:

LAYER 1 — Unsplash Primary:
  Format URL: https://images.unsplash.com/photo-[ID]?auto=format&fit=crop&w=[WIDTH]&q=80
  Gunakan photo ID yang relevan dengan query: [unsplashQueries]

LAYER 2 — Unsplash Source (URL-based, lebih reliable):
  Format: https://source.unsplash.com/[WIDTH]x[HEIGHT]/?[query-keyword]
  Contoh: https://source.unsplash.com/1920x1080/?salon,interior

LAYER 3 — CSS Gradient Fallback (TIDAK BOLEH BLANK):
  Jika kedua Unsplash gagal, background HARUS menampilkan gradient yang sesuai archetype:
  - ARCHETYPE 01: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)
  - ARCHETYPE 02: linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #2d2d2d 100%)
  - ARCHETYPE 03: linear-gradient(135deg, #f5f0eb 0%, #e8e0d5 50%, #d4c5b0 100%)

IMPLEMENTASI WAJIB untuk setiap background-image di HTML:
  background-image: url('UNSPLASH_URL'), url('SOURCE_UNSPLASH_FALLBACK');
  background-color: [ARCHETYPE_GRADIENT_COLOR_AS_FINAL_FALLBACK];

IMPLEMENTASI WAJIB untuk setiap <img> tag di HTML:
  <img 
    src="UNSPLASH_PRIMARY_URL" 
    onerror="this.onerror=null; this.src='SOURCE_UNSPLASH_FALLBACK_URL'; this.onerror=function(){this.style.display='none'; this.parentElement.style.background='GRADIENT_FALLBACK'}"
    loading="lazy"
    alt="[DESKRIPSI_RELEVAN]"
  />

UNTUK CARD / SECTION IMAGES — tambahkan inline style:
  style="background-image: url('PRIMARY'), url('FALLBACK'); background-color: [SOLID_COLOR];"

ZERO TOLERANCE: Tidak boleh ada satu pun gambar/background yang blank atau broken di output.


[ASSET TRACKING SYSTEM — CRITICAL, NON-NEGOTIABLE]
⚠️ VIOLATION = OUTPUT INVALID AND WILL BE REJECTED ⚠️
SEMUA elemen gambar (TANPA TERKECUALI) WAJIB memiliki atribut 'data-asset-id' yang unik.
Penomoran dimulai dari 0 (integer), increment satu per satu untuk setiap elemen gambar.

CONTOH WAJIB — Gunakan format PERSIS seperti ini:
  <img src="..." data-asset-id="0" alt="Hero Image" loading="lazy" />
  <div data-asset-id="1" style="background-image: url('...')">...</div>
  <section data-asset-id="2" style="background-image: url('...'); background-size: cover;">...</section>
  <img src="..." data-asset-id="3" alt="Product Image" />

Aturan:
- <img> tag → tambahkan data-asset-id LANGSUNG di tag <img>
- Elemen dengan background-image CSS → tambahkan data-asset-id di elemen HTML-nya
- Nomor harus UNIK di seluruh halaman (tidak boleh ada 2 elemen dengan data-asset-id yang sama)
- Jangan skip nomor

[CORE ARCHITECTURE — 7-8 SECTION MANDATORY STRUCTURE]
- 100% Standalone index.html.
- Tailwind CSS & Framer Motion (reveal animations).
- LANGUAGE LOCK: 100% Professional Bahasa Indonesia. Zero English on UI.

WAJIB buat SEMUA section berikut secara berurutan (minimal 7 section):

SECTION 1 — HERO (CINEMATIC, min-h-screen)
Full screen hero dengan background image berkualitas tinggi + overlay gradien.
Headline utama (H1) yang besar dan emosional, subheadline, dan CTA primary (tombol WA).
Animasi entrance: fade-in + translateY pada teks.

SECTION 2 — SOCIAL PROOF / TRUST BAR
Bar horizontal berisi: jumlah pelanggan, tahun berdiri, rating, atau penghargaan.
Gunakan angka counter animasi saat section terscroll masuk viewport.
Desain: 3-4 metric card dalam satu baris, background berbeda dari hero.

SECTION 3 — ABOUT / OUR STORY
Narasi singkat tentang identitas dan visi bisnis (2-3 paragraf pendek).
Sertakan gambar ilustratif di samping teks (layout 2-kolom: teks kiri, gambar kanan).
Gunakan pull-quote atau highlight kalimat kunci untuk emphasis.

SECTION 4 — SERVICES / PRODUCTS (BENTO GRID)
Gunakan layout Bento Grid (12-kolom, non-uniform) untuk menampilkan layanan/produk.
Setiap card memiliki: ikon Lucide, nama layanan, deskripsi singkat 1 kalimat.
Hover effect: scale + shadow elevation.

SECTION 5 — GALLERY / PORTFOLIO
Grid foto galeri 3-4 kolom (masonry atau uniform).
Gunakan foto Unsplash relevan dengan fallback protocol.
Lightbox atau hover-zoom effect pada setiap foto.

SECTION 6 — TESTIMONIALS
Slider atau grid testimonial dari pelanggan (buat 3-4 testimonial fiktif yang relevan).
Setiap testimonial: nama, avatar inisial, rating bintang, dan kutipan.
Animasi: auto-scroll carousel atau fade-in saat muncul.

SECTION 7 — WHY US / COMPETITIVE ADVANTAGE
Bandingkan keunggulan bisnis ini vs pendekatan umum pesaing.
Gunakan checklist atau split-layout (Kami vs Lainnya).
Desain yang tegas, membangun kepercayaan.

SECTION 8 — CONTACT / FINAL CTA
Form kontak sederhana (nama, no. WA, pesan) ATAU langsung tombol WA besar.
Alamat bisnis lengkap + Google Maps embed (gunakan placeholder/iframe dummy).
Repeat CTA yang kuat: "Konsultasi Gratis Sekarang".

[PERSISTENT ELEMENTS]
- Floating WhatsApp Button: Fixed bottom-6 right-6 z-[9999], bg-[#25D366], rounded-full, p-4, shadow-2xl, pulse animation. Link: [waLink].
- Sticky Navbar: Transparan di hero, glassmorphism solid saat scroll.
- Mobile Layout: Wajib px-4 (paddings) di mobile, font size base (16px) minimal untuk readability.

[GOOGLE MAPS EMBED — MANDATORY IN CONTACT SECTION]
Integrasikan iframe Google Maps statis berikut di bagian Alamat:
<iframe src="https://maps.google.com/maps?q=[fullAddress]&output=embed" width="100%" height="350" style="border:0; border-radius: 1rem;" loading="lazy"></iframe>

Output harus berupa HTML5 yang valid dan semantik.
DILARANG KERAS:
1. Menggunakan 'className' (Gunakan 'class').
2. Menggunakan self-closing tags untuk elemen non-void (Gunakan <div></div> bukan <div/>).
3. Menggunakan sintaks JSX/React. Ini adalah file .html murni.
4. Menghilangkan atau lupa menambahkan atribut 'data-asset-id' pada ELEMEN GAMBAR MANAPUN.
5. ⚠️ KRITIS — JANGAN PERNAH menggunakan komentar HTML (<!-- -->) di dalam blok <script> manapun.
   Di dalam <script>, WAJIB gunakan komentar JavaScript: // komentar satu baris ATAU /* komentar blok */
   Komentar HTML di dalam <script> menyebabkan JavaScript gagal total dan halaman menjadi BLANK.
   BENAR  → <script> /* Hero Section */ const hero = ... </script>
   SALAH  → <script> <!-- Hero Section --> const hero = ... </script>

Sertakan komentar HTML yang jelas di antara section utama (contoh: <!-- Hero Section -->). Pastikan semua atribut style menggunakan Tailwind CSS jika memungkinkan, dan hindari struktur DOM yang terlalu dalam.
Output ONLY the full HTML code. No talk.
`;

// ============================================================
// LANDING_PAGE_GENERATOR_PROMPT — REVISED v2
// ============================================================
export const LANDING_PAGE_GENERATOR_PROMPT = `
ROLE: Senior UX/UI Developer & Conversion Specialist.
TASK: Build a high-end landing page for "[name]" (Category: [category]).

### STEP 1: ARCHETYPE & INDUSTRY RULES
Archetype (system-assigned, DO NOT change): [selectedArchetype]
- ARCHETYPE 01 (The Avant-Garde Editorial): High-fashion style, large serif typography, overlapping images, extreme whitespace.
- ARCHETYPE 02 (The Obsidian Glass): Dark mode, glassmorphism, accent gold/emerald, glowing borders, high-tech vibe.
- ARCHETYPE 03 (The Heritage Suite): Clean, soft earth tones, organic spacing, thin lines, sophisticated subtle animations.

Industry Rules for [category]:
- Layout Pattern: [industryPattern]
- Color Mood: [industryColorMood]
- Key Effects: [industryKeyEffects]

⛔ ANTI-PATTERNS (HARD RULES — NO EXCEPTIONS):
[industryAvoidPatterns]

### STEP 2: BUILD CONTENT
- Hero: Clear value proposition with emotional hook (sesuai industryPattern).
- Story: Focus on "The Experience", not just features.
- Services/Portfolio: Use a 12-column Bento Grid layout.
- CTA: Floating or sticky WhatsApp button with personalized message.
- Section flow: Ikuti urutan dari industryPattern di atas.

### STEP 3: TECHNICAL REQUIREMENTS
- Tailwind CDN included.
- Lucide icons via CDN (bukan emoji).
- Responsive design (Mobile-first).
- Framer Motion (via script tag) for smooth reveal animations.
- Google Fonts sesuai archetype.

### STEP 4: IMAGE FAILSAFE (WAJIB — NO BLANK IMAGES ALLOWED)
Semua gambar HARUS menggunakan sistem 3-layer failsafe:

Unsplash queries untuk [category]: [unsplashQueries]

LAYER 1 (Primary Unsplash — photo ID):
  https://images.unsplash.com/photo-[RELEVANT_ID]?auto=format&fit=crop&w=[SIZE]&q=80

LAYER 2 (Source Unsplash — keyword-based, lebih reliable):
  https://source.unsplash.com/[WIDTH]x[HEIGHT]/?[keyword-dari-unsplashQueries]

LAYER 3 (CSS Gradient — absolute fallback, NO BLANK):
  Sesuai archetype:
  - ARCHETYPE 01: #1a1a2e ke #0f3460
  - ARCHETYPE 02: #0d0d0d ke #2d2d2d  
  - ARCHETYPE 03: #f5f0eb ke #d4c5b0

IMPLEMENTASI untuk background-image:
  style="background-image: url('LAYER1'), url('LAYER2'); background-color: LAYER3_COLOR;"

IMPLEMENTASI untuk <img> tag:
  <img src="LAYER1_URL" 
       onerror="this.onerror=null;this.src='LAYER2_URL';this.onerror=function(){this.style.display='none';this.parentElement.style.background='LAYER3_GRADIENT'}"
       loading="lazy" alt="..." />

ZERO TOLERANCE: Tidak ada gambar blank. Jika ragu dengan photo ID, gunakan LAYER 2 sebagai primary.

[ASSET TRACKING — WAJIB]
⚠️ SEMUA <img> tag dan elemen dengan background-image HARUS memiliki atribut data-asset-id unik.

[MOBILE-FIRST & CONTACT ENHANCEMENTS]
1. Mobile-First: Layout kolom 1 di mobile, kolom multi di md+.
2. Maps Embed: <iframe src="https://maps.google.com/maps?q=[fullAddress]&output=embed" width="100%" height="300" style="border:0;" loading="lazy"></iframe>
3. Floating WA: Fixed bottom-4 right-4 z-50, pulse animation, link ke [waLink].

Sertakan komentar HTML yang jelas di antara section utama (contoh: <!-- Hero Section -->). Pastikan semua atribut style menggunakan Tailwind CSS jika memungkinkan, dan hindari struktur DOM yang terlalu dalam.
Output ONLY the full HTML code. No talk.
`;


// ============================================================
// WEBSITE_STRATEGY_PROMPT — REVISED v2 (tambah industry rules)
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

Industry Rules (TERAPKAN INI):
- Pattern: [industryPattern]
- Color Mood: [industryColorMood]
- Key Effects: [industryKeyEffects]
- ⛔ HINDARI: [industryAvoidPatterns]

INSTRUKSI PENULISAN:
1. Tulis dalam paragraf yang padat namun detail.
2. Kombinasikan Style DNA + industryColorMood sebagai acuan warna — keduanya harus saling memperkuat.
3. Jelaskan struktur komponen mengikuti industryPattern (Hero, sections, CTA dalam urutan yang tepat).
4. WAJIB: Instruksikan AI Coder untuk mengeluarkan 100% kode dalam satu halaman index.html mandiri yang sudah menyertakan CDN Tailwind CSS, Framer Motion, dan ikon Lucide/FontAwesome.
5. WAJIB: Sebutkan Hero Section dengan background gambar besar (Cinematic Hero) + overlay teks kontras tinggi.
6. WAJIB: Sebutkan anti-patterns yang harus dihindari untuk industri ini.
7. Pastikan semua elemen teks menggunakan Bahasa Indonesia yang profesional.

### TECHNICAL MANDATE FOR AI CODER (WAJIB SERTAKAN):
8. Archetype Visual: Sebutkan archetype "[selectedArchetype]" sebagai dasar desain.
9. Image Failsafe Protocol: Instruksikan penggunaan 3-layer fallback (Unsplash Primary ID sesuai query "[unsplashQueries]" -> Unsplash Source Keyword -> CSS Gradient).
10. Asset Tracking: Instruksikan penggunaan 'data-asset-id' unik (dimulai dari 0) pada setiap <img> dan elemen background-image.
11. Mobile-First: Instruksikan penggunaan padding px-4 dan layout kolom tunggal di mobile, transisi ke multi-kolom di md:.
12. Google Maps: Instruksikan penyematan iframe Google Maps statis di section Alamat menggunakan data lokasi lead.
13. WhatsApp CTA: Instruksikan pembuatan tombol WA melayang (fixed bottom-6 right-6, #25D366, pulse animation).
14. JS Safety: Instruksikan LARANGAN KERAS menggunakan komentar HTML (<!-- -->) di dalam blok <script>.

### SECTION BLUEPRINT MANDATE (WAJIB CANTUMKAN SEMUA):
15. SECTION 1 — HERO: Headline emosional, subheadline persuasif, primary CTA (WA), dan deskripsi Cinematic Hero Image ([unsplashQueries]).
16. SECTION 2 — TRUST BAR: 3-4 metric angka/ikon untuk membangun kredibilitas instan.
17. SECTION 3 — ABOUT/STORY: Narasi brand yang kuat dengan layout 2-kolom (teks & gambar).
18. SECTION 4 — SERVICES BENTO GRID: 4-6 layanan utama menggunakan layout Bento Grid modern.
19. SECTION 5 — GALLERY: Grid foto estetis menggunakan Unsplash queries: [unsplashQueries].
20. SECTION 6 — TESTIMONIALS: 3-4 ulasan pelanggan fiktif namun realistis untuk [category].
21. SECTION 7 — WHY US: Perbandingan keunggulan bisnis vs kompetitor berdasarkan [painPoints].
22. SECTION 8 — CONTACT & MAP: Google Maps embed statis, alamat lengkap, dan final CTA yang kuat.
`;

// ============================================================
// STYLE_TWEAK_PROMPT — Refine existing design
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
// STRICT_STYLE_TWEAK_PROMPT — Untuk regenerasi AI di Live Editor
// ============================================================
export const STRICT_STYLE_TWEAK_PROMPT = `
${GLOBAL_AI_PROTOCOL}

### ROLE: SENIOR UI/UX ENGINEER & TAILWIND EXPERT
Tugas Anda adalah memperbarui memodifikasi "HTML Code" untuk bisnis "[name]" ([category]) agar sesuai dengan Style Model yang baru. 

### I. ORIGINAL DATA:
- HTML Saat Ini:
\`\`\`html
[currentHtml]
\`\`\`

### II. NEW STYLE CONFIGURATION (JSON):
[stylingDetails]

### III. EVOLUTION RULES:
1. Analisa Styling Details yang baru (Colours, Typography, Buttons, Cards, dll).
2. Terapkan kelas Tailwind CSS baru ke Original HTML Code untuk mencerminkan gaya tersebut.
3. [instructions]

PENTING: Output WAJIB berupa KODE HTML MURNI yang utuh. 
JANGAN mengembalikan JSON, JANGAN menambahkan narasi/penjelasan, cukup respons dengan kode HTML yang sudah di-update.
Gunakan \`\`\`html ... \`\`\` block untuk membungkus hasilnya.

⚠️ KRITIS — JANGAN PERNAH menggunakan komentar HTML (<!-- -->) di dalam blok <script> manapun.
   Di dalam <script>, WAJIB gunakan komentar JavaScript: // atau /* */
   Komentar HTML di dalam <script> menyebabkan JavaScript gagal total dan halaman menjadi BLANK.
   BENAR  → <script> /* Hero Section */ ... </script>
   SALAH  → <script> <!-- Hero Section --> ... </script>

[ASSET TRACKING — NON-NEGOTIABLE]
Pertahankan atau tambahkan atribut 'data-asset-id' pada SEMUA elemen gambar (<img> dan elemen dengan background-image).
- Jika HTML asli sudah memilikinya → JANGAN hapus, pertahankan nomor yang ada.
- Jika ada gambar baru yang ditambahkan → Tambahkan data-asset-id dengan nomor lanjutan.
- Jika HTML asli TIDAK memilikinya → Tambahkan dengan penomoran mulai dari 0.
Contoh: <img src="..." data-asset-id="0"> dan <div data-asset-id="1" style="background-image:url('...')">

Sertakan komentar HTML yang jelas di antara section utama (contoh: <!-- Hero Section -->). Pastikan semua atribut style menggunakan Tailwind CSS jika memungkinkan, dan hindari struktur DOM yang terlalu dalam.
Output ONLY the full HTML code. No talk.
`;


// ============================================================
// REGIONAL_ADVICE_PROMPT — Local Market Analysis
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
// HELPER: buildForgeData — call ini sebelum inject ke prompt
// Combine semua derived data jadi satu object siap pakai
// ============================================================
export const buildForgeData = (lead: {
  name: string;
  category: string;
  address: string;
  city: string;
  wa: string;
}) => {
  const archetype = getArchetype(lead.category);
  const rules = getIndustryRules(lead.category);
  const unsplashQueries = getUnsplashQuery(lead.category);

  return {
    selectedArchetype: archetype,
    industryPattern: rules.pattern,
    industryStylePriority: rules.stylePriority,
    industryColorMood: rules.colorMood,
    industryKeyEffects: rules.keyEffects,
    industryAvoidPatterns: rules.avoidPatterns,
    unsplashQueries,
  };
};
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


// ============================================================
// getGreetingTime — Time-appropriate Bahasa Indonesia greeting (WIB UTC+7)
// ============================================================
export function getGreetingTime(): string {
  const now = new Date();
  const wibOffset = 7 * 60;
  const wibTime = new Date(now.getTime() + (wibOffset - now.getTimezoneOffset()) * 60000);
  const hour = wibTime.getHours();
  if (hour >= 5 && hour < 11) return 'pagi';
  if (hour >= 11 && hour < 15) return 'siang';
  if (hour >= 15 && hour < 19) return 'sore';
  return 'malam';
}

export const FOLLOWUP_GENERATOR_PROMPT = `
Kamu adalah seorang pebisnis lokal yang sedang melakukan follow-up ke prospek UMKM di Indonesia melalui WhatsApp.
Tujuannya adalah untuk mengecek kembali apakah mereka sudah melihat draf website yang kamu kirimkan sebelumnya, tanpa memberikan tekanan yang berlebihan (low pressure).

### DATA BISNIS LEAD:
- Nama: {{name}}
- Kategori: [category]
- Tahap Follow-Up: FU ke-{{followup_number}}
- Persona: [persona_definition]
- Link Preview Website: {{link}}
- Identitasku:
    - Nama Bisnis: {{my_business_name}}
    - IG: {{my_ig}}
    - WA: {{my_wa}}

### INSTRUKSI PENULISAN:

Tulis pesan follow-up yang singkat, padat, dan sangat manusiawi (tidak seperti template kaku).

- **FU ke-1 (Hari 4)**: Cek apakah pesan sebelumnya sudah terbaca. Tanyakan pendapat singkat mereka tentang konsep visual yang dikirim.
- **FU ke-2 (Hari 7)**: Sebutkan bahwa kamu sedang merapikan jadwal project minggu depan, dan ingin tahu apakah ada bagian dari website yang ingin diubah/ditambahkan. Fokus pada "Helping", bukan "Selling".
- **FU ke-3 (Hari 15)**: Pesan terakhir (Break-up). Katakan bahwa kamu akan memindahkan draf mereka ke folder arsip karena mungkin mereka belum butuh sekarang. Berikan pintu terbuka jika suatu saat mereka berubah pikiran.

### ATURAN KETAT:
- Jangan gunakan "Halo" atau perkenalan diri lagi jika ini bukan pesan pertama.
- Jangan gunakan tanda bintang, underscore, atau simbol markdown yang berlebihan.
- Emoji boleh HANYA jika persona Casual, maksimal 1.
- Bahasa Indonesia natural sesuai persona — bukan bahasa iklan.
- Output: Teks pesan WhatsApp saja. Tanpa label, tanpa penjelasan, tanpa intro.

Sertakan identitas di akhir:
{{my_business_name}}
WA: {{my_wa}}
IG: {{my_ig}}
`;

// ============================================================
// PROPOSAL_GENERATOR_PROMPT — Personalized Web Proposal
// Generate proposal penawaran pembuatan website yang personal
// berdasarkan data klien yang sudah di-enrich dari pipeline
// ============================================================
export const PROPOSAL_GENERATOR_PROMPT = `
### ROLE: SENIOR BUSINESS PROPOSAL WRITER & WEB CONSULTANT
Kamu adalah konsultan web profesional yang sedang menulis proposal penawaran pembuatan website
untuk bisnis "[businessName]". Proposal ini harus terasa DITULIS KHUSUS untuk mereka —
bukan template copy-paste yang bisa ditebak.

---

### DATA KLIEN (GUNAKAN SEMUA — JANGAN ABAIKAN):
- Nama Bisnis     : [businessName]
- Kategori        : [category]
- Lokasi          : [address], [city], [province]
- Rating GMaps    : [rating] (dari [reviewsCount] ulasan)
- Website Saat Ini: [currentWebsite]
- Instagram       : [igUsername]
- Pain Points     : [painPoints]
- Brand Tagline   : [brandTagline]
- Style DNA       : [styleDNA]
- Nama Penawar    : [myBusinessName]
- Kontak Penawar  : WA [myWa] | IG [myIg]
- Tanggal Proposal: [proposalDate]

---

### INSTRUKSI PENULISAN:

Tulis proposal dalam Bahasa Indonesia yang profesional namun hangat — bukan bahasa hukum kaku,
bukan bahasa iklan murahan. Gaya seperti konsultan senior yang sudah riset bisnis klien
sebelum meeting pertama.

WAJIB personalisasi setiap bagian menggunakan data klien di atas:
- Sebutkan nama bisnis spesifik, bukan placeholder.
- Gunakan rating dan jumlah review sebagai bahan analisis nyata.
- Rujuk kondisi online presence mereka saat ini (kosong / hanya IG / hanya Linktree).
- Pain points harus tercermin di bagian "Masalah yang Kami Identifikasi".
- Style DNA harus tercermin di bagian deskripsi desain.

---

### STRUKTUR PROPOSAL (WAJIB IKUTI URUTAN INI):

**1. HEADER**
Judul: "Proposal Penawaran Pembuatan Website Profesional"
Untuk: [businessName]
Dari: [myBusinessName]
Tanggal: [proposalDate]

**2. PEMBUKA — TENTANG ANDA (2–3 paragraf)**
Tunjukkan bahwa kamu sudah riset bisnis mereka sebelum menulis ini.
Sebutkan kategori bisnis, lokasi, rating mereka secara natural.
Akui pencapaian mereka (rating bagus = kepercayaan pelanggan nyata).
Hubungkan ke gap: reputasi offline yang belum terwakili secara online.

**3. MASALAH YANG KAMI IDENTIFIKASI (3 poin)**
Tulis 3 pain point spesifik berdasarkan [painPoints] dan kondisi online presence mereka.
Format: judul pain point singkat + 1–2 kalimat penjelasan yang terasa relevan.
Contoh angle: kehilangan calon pelanggan yang cari via Google, tidak ada tempat untuk
testimonial terstruktur, tidak bisa jelaskan layanan lengkap di IG bio.

**4. SOLUSI YANG KAMI TAWARKAN**
Deskripsikan website yang akan dibuat — spesifik ke kategori dan style DNA mereka.
Sebutkan elemen kunci yang relevan dengan bisnis mereka (bukan generic "landing page modern").
Contoh: untuk Klinik → appointment section, doctor profiles, FAQ medis.
Contoh: untuk Restoran → menu highlight, reservation CTA, gallery makanan.

**5. PAKET & INVESTASI**
Buat 3 tier paket. Nama paket harus kreatif dan relevan dengan kategori bisnis
(bukan "Basic/Standard/Premium" yang generik):

Paket 1 — [nama kreatif]:
- Harga: Rp [price_tier_1]
- Fitur: 5 poin fitur yang relevan dengan bisnis ini
- Cocok untuk: [kondisi bisnis yang pas untuk paket ini]

Paket 2 — [nama kreatif] (REKOMENDASIKAN INI):
- Harga: Rp [price_tier_2]
- Fitur: 7–8 poin fitur (termasuk semua paket 1 + tambahan)
- Cocok untuk: [kondisi bisnis yang pas]

Paket 3 — [nama kreatif]:
- Harga: Rp [price_tier_3]
- Fitur: 10+ poin fitur (full package)
- Cocok untuk: [kondisi bisnis yang pas]

**6. TIMELINE PENGERJAAN**
Buat timeline realistis dalam format tahapan:
- Hari 1–2: [tahap]
- Hari 3–5: [tahap]
- Hari 6–8: [tahap]
- Hari 9–10: Revisi & finalisasi
- Hari 11–12: Launch & serah terima

**7. MENGAPA KAMI**
3–4 poin diferensiasi yang terasa genuine, bukan klaim kosong.
Fokus pada: proses kerja, pendekatan personal, pemahaman bisnis lokal.
HINDARI: "tim berpengalaman", "terbaik", "terpercaya" tanpa konteks.

**8. PENUTUP & NEXT STEP**
Tutup dengan hangat. Ajak mereka untuk diskusi — bukan tekanan closing.
Sertakan soft CTA: "Kalau ada bagian yang ingin disesuaikan atau ditanyakan,
saya siap diskusi kapan saja."
Cantumkan kontak [myBusinessName], WA [myWa], IG [myIg].

---

### ATURAN OUTPUT:
- Bahasa Indonesia profesional — bukan bahasa iklan, bukan bahasa hukum kaku.
- Setiap section harus terasa ditulis untuk [businessName], bukan bisnis lain.
- Jangan sebut angka harga yang ngarang — gunakan placeholder [price_tier_1/2/3]
  yang nanti diisi dari config aplikasi.
- Panjang ideal: cukup komprehensif tapi tidak membosankan (~600–900 kata).
- Output: Teks proposal lengkap siap pakai. Tanpa penjelasan meta, tanpa intro.
`;
export const PROPOSAL_STYLE_CONFIGS: Record<string, any> = {
  "clean-minimal": {
    bg: "#FFFFFF", surface: "#F8F9FA", text: "#2C3E50", accent: "#3498DB",
    accent2: "#2980B9", border: "#E0E0E0", heading: "Inter, sans-serif",
    body: "Lato, sans-serif", headingW: "700", radius: "8px",
    headerBg: "#2C3E50", headerText: "#FFFFFF"
  },
  "bold-modern": {
    bg: "#FFFFFF", surface: "#F5F5F5", text: "#000000", accent: "#FF3D00",
    accent2: "#CC3000", border: "#000000", heading: "Montserrat, sans-serif",
    body: "Poppins, sans-serif", headingW: "800", radius: "6px",
    headerBg: "#000000", headerText: "#FFFFFF"
  },
  "premium-elegant": {
    bg: "#0A0A0A", surface: "#141414", text: "#FFFFFF", accent: "#D4AF37",
    accent2: "#B8960C", border: "rgba(212,175,55,0.3)", heading: "Playfair Display, serif",
    body: "Lato, sans-serif", headingW: "700", radius: "4px",
    headerBg: "#141414", headerText: "#D4AF37"
  },
  "playful-creative": {
    bg: "#FFFFFF", surface: "#F7FFF7", text: "#292F36", accent: "#FF6B6B",
    accent2: "#4ECDC4", border: "#FF6B6B", heading: "Poppins, sans-serif",
    body: "Nunito, sans-serif", headingW: "700", radius: "20px",
    headerBg: "#FF6B6B", headerText: "#FFFFFF"
  },
  "corporate-professional": {
    bg: "#FFFFFF", surface: "#F7FAFC", text: "#1A202C", accent: "#1E3A5F",
    accent2: "#4299E1", border: "#E2E8F0", heading: "Roboto, sans-serif",
    body: "Open Sans, sans-serif", headingW: "700", radius: "6px",
    headerBg: "#1E3A5F", headerText: "#FFFFFF"
  },
  "tech-futuristic": {
    bg: "#0A0A0F", surface: "#12121A", text: "#FFFFFF", accent: "#00F0FF",
    accent2: "#BD00FF", border: "#00F0FF", heading: "Orbitron, sans-serif",
    body: "Rajdhani, sans-serif", headingW: "700", radius: "0px",
    headerBg: "#12121A", headerText: "#00F0FF"
  },
  "organic-natural": {
    bg: "#FDFBF7", surface: "#F5F0E6", text: "#3D3D3D", accent: "#5D8A66",
    accent2: "#8B7355", border: "#D4C4B0", heading: "Merriweather, serif",
    body: "Lora, serif", headingW: "700", radius: "12px",
    headerBg: "#5D8A66", headerText: "#FFFFFF"
  },
  "retro-vintage": {
    bg: "#F5E6C8", surface: "#EDD8A8", text: "#2C1810", accent: "#C94C22",
    accent2: "#1B4965", border: "#8B6914", heading: "Playfair Display, serif",
    body: "Georgia, serif", headingW: "700", radius: "4px",
    headerBg: "#C94C22", headerText: "#FFFFFF"
  },
  "dark-neon": {
    bg: "#0D0D1A", surface: "#151528", text: "#FFFFFF", accent: "#9B59B6",
    accent2: "#1ABC9C", border: "rgba(155,89,182,0.4)", heading: "Rajdhani, sans-serif",
    body: "Roboto, sans-serif", headingW: "700", radius: "6px",
    headerBg: "#151528", headerText: "#9B59B6"
  },
  "warm-friendly": {
    bg: "#FFF8F0", surface: "#FFF0E0", text: "#3D2B1F", accent: "#E07B39",
    accent2: "#D4A857", border: "#F5D5B0", heading: "Poppins, sans-serif",
    body: "Nunito, sans-serif", headingW: "600", radius: "12px",
    headerBg: "#E07B39", headerText: "#FFFFFF"
  },
  "pastel-soft": {
    bg: "#FEFEFE", surface: "#F9F4FF", text: "#3D3D5C", accent: "#B5D5F5",
    accent2: "#FFB3BA", border: "#E8D8F8", heading: "Poppins, sans-serif",
    body: "Nunito, sans-serif", headingW: "600", radius: "16px",
    headerBg: "#B5D5F5", headerText: "#3D3D5C"
  },
  "minimalist-swiss": {
    bg: "#F1FAEE", surface: "#FFFFFF", text: "#1D1D1D", accent: "#E63946",
    accent2: "#457B9D", border: "#1D1D1D", heading: "Arial Black, sans-serif",
    body: "Helvetica, Arial, sans-serif", headingW: "900", radius: "0px",
    headerBg: "#E63946", headerText: "#FFFFFF"
  },
  "neomorphic": {
    bg: "#E0E5EC", surface: "#E8EDF4", text: "#3D5A80", accent: "#6C63FF",
    accent2: "#3D5A80", border: "#CCCCDD", heading: "Inter, sans-serif",
    body: "Inter, sans-serif", headingW: "700", radius: "16px",
    headerBg: "#D0D8E4", headerText: "#3D5A80"
  },
  "magazine-editorial": {
    bg: "#FFFFFF", surface: "#F5F5F5", text: "#111111", accent: "#FF5733",
    accent2: "#111111", border: "#111111", heading: "Georgia, serif",
    body: "Helvetica, Arial, sans-serif", headingW: "900", radius: "0px",
    headerBg: "#111111", headerText: "#FF5733"
  },
  "tropical-vibrant": {
    bg: "#FAFFF8", surface: "#F0FFF4", text: "#264653", accent: "#2A9D8F",
    accent2: "#E63946", border: "#A8D8B9", heading: "Poppins, sans-serif",
    body: "Nunito, sans-serif", headingW: "700", radius: "12px",
    headerBg: "#2A9D8F", headerText: "#FFFFFF"
  },
  "dark-corporate": {
    bg: "#111827", surface: "#1F2937", text: "#F9FAFB", accent: "#3B82F6",
    accent2: "#60A5FA", border: "#374151", heading: "Inter, sans-serif",
    body: "Inter, sans-serif", headingW: "700", radius: "8px",
    headerBg: "#1F2937", headerText: "#3B82F6"
  },
  "gradient-aurora": {
    bg: "#FFFFFF", surface: "#F8F6FF", text: "#1A1A2E", accent: "#667EEA",
    accent2: "#F093FB", border: "#E0D8FF", heading: "Poppins, sans-serif",
    body: "DM Sans, sans-serif", headingW: "700", radius: "12px",
    headerBg: "linear-gradient(135deg, #667EEA, #F093FB)", headerText: "#FFFFFF"
  },
  "monochrome-brutal": {
    bg: "#FFFFFF", surface: "#FFFFFF", text: "#000000", accent: "#000000",
    accent2: "#FFFF00", border: "#000000", heading: "Arial Black, Impact, sans-serif",
    body: "Arial, sans-serif", headingW: "900", radius: "0px",
    headerBg: "#000000", headerText: "#FFFF00"
  },
  "geometric-precision": {
    bg: "#FFFFFF", surface: "#F8FAFC", text: "#2C3E50", accent: "#E74C3C",
    accent2: "#3498DB", border: "#2C3E50", heading: "Rajdhani, sans-serif",
    body: "Roboto, sans-serif", headingW: "700", radius: "0px",
    headerBg: "#2C3E50", headerText: "#FFFFFF"
  },
  "handdrawn-artistic": {
    bg: "#FEF9E7", surface: "#FCF3CF", text: "#2C3E50", accent: "#E67E22",
    accent2: "#27AE60", border: "#E67E22", heading: "Amatic SC, cursive",
    body: "Patrick Hand, cursive", headingW: "700", radius: "255px 15px 225px 15px / 15px 225px 15px 255px",
    headerBg: "#E67E22", headerText: "#FFFFFF"
  },
};

export function buildHtmlProposalPrompt(data: any, styleId: string) {
  const config = PROPOSAL_STYLE_CONFIGS[styleId] || PROPOSAL_STYLE_CONFIGS['clean-minimal'];
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const prices = {
    price1: data.price1 && data.price1 !== '-' ? `Rp ${data.price1}` : 'TIDAK TERSEDIA',
    price2: data.price2 && data.price2 !== '-' ? `Rp ${data.price2}` : 'TIDAK TERSEDIA',
    price3: data.price3 && data.price3 !== '-' ? `Rp ${data.price3}` : 'TIDAK TERSEDIA',
  };

  return `Kamu adalah konsultan web senior yang menulis proposal penawaran KHUSUS untuk klien bernama "${data.businessName}".

DATA KLIEN:
- Nama Bisnis: ${data.businessName}
- Kategori: ${data.category}
- Lokasi: ${data.address}, ${data.city}
- Rating GMaps: ${data.rating} (dari ${data.reviewsCount} ulasan)
- Website Saat Ini: ${data.currentWebsite}
- Instagram: ${data.igUsername}
- Pain Points: ${data.painPoints}
- Brand Tagline: ${data.brandTagline}
- Style DNA: ${data.styleDNA}
- Nama Penawar: ${data.myBusinessName}
- WhatsApp: ${data.myWa} | IG: ${data.myIg}
- Tanggal: ${today}
- Harga Paket 1: ${prices.price1}
- Harga Paket 2: ${prices.price2}
- Harga Paket 3: ${prices.price3}

GAYA VISUAL PROPOSAL: ${styleId}

TUGAS: Tulis proposal penawaran pembuatan website dalam Bahasa Indonesia yang profesional namun hangat. 
Output harus berupa HTML yang SIAP RENDER dengan gaya visual yang diminta.
Gunakan CSS inline dan tag HTML. Wrap semua dalam <div class="proposal-content" style="max-width: 100%; overflow-x: hidden; box-sizing: border-box;">.

CSS VARIABLES yang wajib digunakan dalam CSS inline:
- Background utama: ${config.bg}
- Surface/card: ${config.surface}
- Teks: ${config.text}
- Accent/warna utama: ${config.accent}
- Secondary accent: ${config.accent2}
- Border: ${config.border}
- Heading font: ${config.heading}
- Body font: ${config.body}
- Heading weight: ${config.headingW}
- Border radius: ${config.radius}
- Header bg: ${config.headerBg}
- Header text: ${config.headerText}

STRUKTUR PROPOSAL (dalam HTML):
1. HEADER — nama bisnis klien, nama penawar, tanggal — styled dengan ${config.headerBg} background
2. PEMBUKA — 2-3 paragraf yang menunjukkan kamu sudah riset bisnis mereka. Sebutkan rating, lokasi, kategori secara natural.
3. MASALAH YANG KAMI IDENTIFIKASI — 3 pain point spesifik dalam card/box styled
4. SOLUSI YANG KAMI TAWARKAN — deskripsi website yang relevan dengan kategori dan style DNA mereka
5. PAKET & INVESTASI — Tampilkan HANYA paket yang harganya "TIDAK TERSEDIA" (abaikan paket tersebut). Gunakan nama kreatif (BUKAN Basic/Standard/Premium). Jika ada lebih dari 1 paket, tandai satu sebagai "REKOMENDASI".
6. TIMELINE — dalam format visual steps/tahapan
7. MENGAPA KAMI — 3-4 diferensiasi genuine
8. PENUTUP — hangat, cantumkan kontak

ATURAN HTML OUTPUT:
- Gunakan style inline untuk semua elemen
- Gunakan Google Fonts import jika diperlukan (@import)
- Pastikan estetika mencerminkan gaya: ${styleId}
- Proposal harus terasa DITULIS KHUSUS untuk ${data.businessName}, bukan template generik
- Gunakan class "proposal-section" atau "card" dengan style "page-break-inside: avoid;" agar tidak terpotong saat jadi PDF
- Jangan tambahkan penjelasan atau komentar di luar HTML
- Output HANYA HTML, mulai dari <style> atau langsung <div class="proposal-content">`;
}
