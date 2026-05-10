# Prompt untuk Google Gemini / Claude Code / Cursor
## Konteks: Integrasi Brand DNA Form Adaptif + DNA Processor ke dalam Auto-Prospecting Agent

---

## BAGIAN A — Prompt Implementasi Form Brand DNA Baru

Gunakan prompt ini ketika kamu mau minta AI coding assistant untuk mengintegrasikan form baru ke dalam kodebase Next.js-mu.

---

### PROMPT A (tempel ke Gemini/Cursor/Claude Code):

```
Saya punya sebuah Next.js 14 (App Router) project bernama Auto-Prospecting-Agent dengan stack:
- Frontend: Next.js 14, Tailwind CSS
- Database: Supabase (PostgreSQL) via Prisma ORM
- Auth: sudah ada middleware.ts

KONTEKS BISNIS:
Aplikasi ini adalah prospecting agent otomatis untuk UMKM Indonesia. Flow-nya:
1. Scrape lead dari Google Maps → simpan ke DB
2. AI enricher generate brand DNA draft dari data GMaps
3. Generate HTML website dummy untuk pitch ke klien
4. Klien deal → isi form Brand DNA real (ini yang akan kita buat)
5. AI proses jawaban → update brand_dna_real di DB
6. Inject brand_dna_real ke HTML template (tanpa generate ulang HTML)

TASK:
Implementasikan form Brand DNA adaptif dan API route untuk memprosesnya. Ikuti spesifikasi berikut dengan teliti.

---

PERUBAHAN SCHEMA PRISMA:
Tambahkan field berikut ke model Lead (atau model yang menyimpan data klien):

```prisma
model Lead {
  // ... existing fields tetap ada ...

  // Brand DNA fields — TAMBAHKAN INI:
  brandDnaDraft    Json?     @map("brand_dna_draft")    // hasil AI dari GMaps data (existing)
  aiAnalysis       Json?     @map("ai_analysis")         // existing field
  painPoints       String?   @map("pain_points")         // existing field
  htmlTemplate     String?   @db.Text @map("html_template")  // HTML dengan {{placeholders}}
  
  brandDnaRaw      Json?     @map("brand_dna_raw")       // jawaban mentah dari form klien (BARU)
  brandDnaReal     Json?     @map("brand_dna_real")      // hasil setelah diproses AI (BARU)
  dnaFilledAt      DateTime? @map("dna_filled_at")        // timestamp submit form (BARU)
  dnaProcessedAt   DateTime? @map("dna_processed_at")    // timestamp selesai diproses AI (BARU)
  dnaStatus        String?   @default("pending") @map("dna_status") // pending|filled|processed|injected (BARU)
}
```

---

FILE YANG PERLU DIBUAT:

1. PAGE: app/leads/[id]/brand-dna/page.tsx
   - Server component yang fetch lead dari DB
   - Pass gmaps data dan existing draft ke client component
   - Render BrandDnaForm client component

2. CLIENT COMPONENT: components/BrandDnaForm.tsx
   Ini adalah form multi-step (4 bagian) dengan props:
   ```typescript
   interface BrandDnaFormProps {
     leadId: string;
     gmapsData: {
       name: string;
       category: string;
       rating: string;
       reviewCount: number;
       phone: string;
       address: string;
     };
     existingDraft?: Record<string, any>;
   }
   ```
   
   State yang dibutuhkan:
   - currentStep: 0-4 (0 = intro/hero, 1-4 = sections, selesai = summary)
   - confirmed: Record<string, { value: string; source: 'gmaps'|'updated'|'new' }>
   - isSubmitting: boolean
   - timerSeconds: number (countdown dari 600)
   
   Sections:
   - Bagian 1: Konfirmasi Data Dasar (nama, WA, alamat via confirm/update toggle + layanan, tagline)
   - Bagian 2: Cerita & Keunggulan (founding_story, usp, price_positioning, best_moment)
   - Bagian 3: Pelanggan & Visual (target_customer, visual_mood checkboxes, color_vibe, website_goal checkboxes)
   - Bagian 4: Finishing Touch (tone sliders 2x, brand_words_must, additional_notes, one_sentence)
   
   Confirm/Update Pattern untuk field GMaps:
   - Tampilkan data GMaps yang ada dalam card preview
   - Dua tombol: "Ya, masih sama" dan "Berbeda / Perbarui"
   - Jika "Ya": simpan data GMaps ke confirmed dengan source: 'gmaps'
   - Jika "Berbeda": tampilkan input field di bawahnya, simpan dengan source: 'updated'
   
   Submit handler:
   - POST ke /api/leads/[id]/submit-dna
   - Body: { brand_dna_raw: confirmed }
   - Setelah sukses: redirect ke /leads/[id]/brand-dna/success atau tampilkan summary

3. API ROUTE: app/api/leads/[id]/submit-dna/route.ts
   - Method: POST
   - Validasi leadId valid dan lead exists
   - Simpan brand_dna_raw ke DB, update dnaStatus ke 'filled', dnaFilledAt ke now()
   - Trigger background processing (panggil process-dna route atau queue job)
   - Return: { success: true, message: 'Data tersimpan, sedang diproses' }

4. API ROUTE: app/api/leads/[id]/process-dna/route.ts
   - Method: POST
   - Fetch lead (termasuk brandDnaDraft, gmapsData, brandDnaRaw)
   - Build prompt dari PROMPT_TEMPLATE (lihat file 02_prompt-brand-dna-processor.md)
   - Call Anthropic API (model: claude-sonnet-4-6, max_tokens: 2000)
   - Parse response JSON
   - Simpan brandDnaReal ke DB, update dnaStatus ke 'processed', dnaProcessedAt ke now()
   - Return: { success: true, brand_dna: processedData }

5. UTILITY: lib/brandDnaProcessor.ts
   ```typescript
   // Fungsi helper:
   
   export function buildSystemPrompt(): string { ... }
   
   export function buildUserPrompt(
     gmapsData: GmapsData,
     clientAnswers: Record<string, { value: string; source: string }>,
     existingDraft: Record<string, any>
   ): string { ... }
   
   export function injectDnaToTemplate(
     htmlTemplate: string,
     brandDnaReal: BrandDnaReal
   ): string {
     // Simple string replace untuk semua {{field}} di template
     // Map brandDnaReal fields ke placeholder names
     // Return HTML dengan data ter-inject
   }
   
   export function buildDnaToTemplateMap(brandDnaReal: BrandDnaReal): Record<string, string> {
     // Return flat map: { '{{hero.headline}}': 'actual value', ... }
     // untuk semua nested fields dalam brandDnaReal
   }
   ```

---

TEMPLATE PLACEHOLDER FORMAT:
HTML template menggunakan double curly brace format:
- {{meta.business_name}}
- {{hero.headline}}
- {{hero.subheadline}}
- {{hero.description}}
- {{hero.cta_primary}}
- {{about.story}}
- {{about.highlight_1.label}} / {{about.highlight_1.value}}
- {{services.section_title}}
- {{contact.whatsapp_cta}}
- {{footer.tagline}}
- {{meta.whatsapp_url}}
- {{meta.phone}}
- {{meta.address_short}}
- {{meta.rating}}
- {{meta.review_count}}
(lihat struktur lengkap JSON di 02_prompt-brand-dna-processor.md)

---

ENVIRONMENT VARIABLES yang dibutuhkan (tambahkan ke .env.example):
ANTHROPIC_API_KEY=your_key_here

---

PENTING - JANGAN BUAT:
- Jangan generate ulang HTML saat DNA diproses — hanya inject ke template yang ada
- Jangan simpan HTML final di DB sebelum user confirm di edit page
- Jangan hardcode business logic di component — pisahkan ke lib/

Setelah selesai, tunjukkan:
1. Struktur file yang dibuat
2. Perubahan schema Prisma
3. Komponen utama BrandDnaForm (minimal logic confirm/update pattern)
4. Kedua API routes
5. lib/brandDnaProcessor.ts dengan semua fungsi
```

---

## BAGIAN B — Prompt Implementasi Edit Page dengan Block Injection

Gunakan prompt ini setelah form dan processor selesai — untuk membangun edit page yang memungkinkan manual tweak per section.

---

### PROMPT B (tempel ke Gemini/Cursor/Claude Code):

```
Lanjutkan dari implementasi sebelumnya. Sekarang buat edit page untuk HTML website klien.

KONTEKS:
- Lead sudah punya brandDnaReal (JSON terstruktur) di DB
- Lead sudah punya htmlTemplate (HTML dengan {{placeholders}}) di DB  
- Setelah inject otomatis, user (tim saya) perlu bisa tweak manual per section sebelum kirim ke klien
- HTML punya section IDs yang jelas: #hero, #about, #services, #usp, #testimonials, #contact, #footer

TASK: Buat edit page di app/leads/[id]/edit-website/page.tsx

LAYOUT:
Split view dua kolom (pada layar ≥ 1024px):
- Kiri (40%): Form editor dengan tab per section
- Kanan (60%): Preview iframe yang update real-time

TABS di form editor:
1. "Hero" — edit: headline, subheadline, description, cta_primary, cta_secondary
2. "About" — edit: section_title, story, highlight_1/2/3 (label + value)
3. "Layanan" — edit: section_title, section_subtitle, items array (add/remove/edit)
4. "Keunggulan" — edit: section_title, points array
5. "Kontak" — edit: section_title, description, whatsapp_cta, phone, address_short
6. "Style DNA" — read-only display of tone, colors, visual_mood, must_use_words

BEHAVIOR:
- Saat halaman load: fetch lead → inject brandDnaReal ke htmlTemplate → tampilkan di iframe kanan
- Setiap edit di form kiri: debounce 300ms → update preview iframe kanan via postMessage atau iframe srcdoc
- "Auto-save" draft ke localStorage tiap 30 detik (gunakan leadId sebagai key)
- Tombol "Simpan ke DB": PATCH /api/leads/[id]/brand-dna-real dengan data terbaru, update htmlTemplate ter-inject
- Tombol "Preview Full": buka tab baru dengan HTML final ter-inject
- Tombol "Export HTML": download htmlFinal.html

KOMPONEN yang dibutuhkan:
1. WebsiteEditorPage (server component) — fetch data, cek auth
2. WebsiteEditorClient (client component) — split layout, state management
3. SectionEditor (client component) — form per tab dengan field sesuai section
4. WebsitePreview (client component) — iframe dengan srcdoc update

API ROUTE: app/api/leads/[id]/save-website/route.ts
- Method: PATCH
- Body: { brand_dna_real: updatedData }
- Inject brandDnaReal ke htmlTemplate → simpan ke htmlFinal di DB
- Update dnaStatus ke 'injected'
- Return: { success: true, html_preview_url: '/leads/[id]/preview' }

PREVIEW ROUTE: app/leads/[id]/preview/route.ts (route handler, bukan page)
- Return htmlFinal dari DB sebagai text/html response
- Untuk embed di iframe dan untuk download

PENTING:
- Preview iframe harus sandbox="allow-same-origin allow-scripts" 
- Gunakan srcdoc untuk preview — jangan buat request ke server tiap keystroke
- Array items (services, usp points) harus bisa tambah/hapus dengan drag-reorder jika memungkinkan
- Semua edit bersifat optimistic — update state lokal dulu, sync ke DB hanya saat save
```

---

## BAGIAN C — Prompt Debugging & Optimasi (opsional)

Gunakan ketika ada masalah spesifik selama implementasi.

### Jika JSON dari AI tidak valid:

```
Di API route /api/leads/[id]/process-dna, saya mendapat response dari Anthropic API yang kadang tidak valid JSON (ada teks preamble atau markdown fences). 

Buatkan robust JSON parser untuk handle ini:

function parseAIResponse(rawText: string): Record<string, any> {
  // 1. Strip ```json dan ``` fences jika ada
  // 2. Cari substring yang dimulai dengan { dan diakhiri }
  // 3. JSON.parse
  // 4. Validasi minimal: harus punya key meta, hero, about, services, contact
  // 5. Jika invalid, throw error dengan detail untuk logging
}

Juga tambahkan retry logic: jika parse gagal, retry call ke AI maksimal 2x dengan tambahan instruksi "Respond with ONLY valid JSON, no other text"
```

### Jika placeholder tidak ter-inject dengan benar:

```
Fungsi injectDnaToTemplate saya kadang melewatkan placeholder karena nested JSON.

Buatkan fungsi flattenJson yang mengubah nested JSON seperti:
{ "hero": { "headline": "Bunga Segar", "cta": { "primary": "Pesan WA" } } }

Menjadi flat map:
{ "{{hero.headline}}": "Bunga Segar", "{{hero.cta.primary}}": "Pesan WA" }

Lalu gunakan flat map ini untuk replace semua placeholder di htmlTemplate sekaligus menggunakan single-pass regex replacement untuk menghindari double-replace.
```

### Jika form ada di Supabase tapi perlu real-time update:

```
Tambahkan Supabase real-time subscription di edit page untuk listen ke perubahan brandDnaReal pada lead yang sedang diedit. Ini berguna jika ada tim yang mengedit dari device berbeda.

Gunakan supabase.channel() dengan filter pada kolom id lead. Saat ada perubahan, tampilkan toast "Data diperbarui dari device lain" dan tanyakan apakah mau sync.
```

---

## CHECKLIST IMPLEMENTASI

Tandai saat masing-masing selesai:

**Phase 1 — Schema & Model**
- [ ] Prisma schema diperbarui dengan 5 field baru
- [ ] `npx prisma db push` berhasil
- [ ] `npx prisma generate` berhasil

**Phase 2 — Form Brand DNA**
- [ ] Page route `/leads/[id]/brand-dna` ada
- [ ] BrandDnaForm component render dengan GMaps data pre-fill
- [ ] Confirm/update toggle berfungsi untuk nama, WA, alamat
- [ ] Semua 4 section bisa dinagivasi
- [ ] Timer countdown berjalan
- [ ] Summary page tampil dengan source tags
- [ ] Submit POST ke `/api/leads/[id]/submit-dna` berhasil
- [ ] brandDnaRaw tersimpan di DB

**Phase 3 — AI Processor**
- [ ] `lib/brandDnaProcessor.ts` dengan semua fungsi
- [ ] API route `/api/leads/[id]/process-dna` berfungsi
- [ ] Anthropic API terpanggil dengan prompt yang benar
- [ ] JSON parsing robust (strip fences, validate keys)
- [ ] brandDnaReal tersimpan di DB
- [ ] dnaStatus terupdate ke 'processed'

**Phase 4 — Edit Page**
- [ ] Split layout editor + preview berfungsi
- [ ] Semua 5 tabs (Hero, About, Layanan, Keunggulan, Kontak) bisa diedit
- [ ] Preview iframe update real-time saat edit
- [ ] Auto-save ke localStorage berfungsi
- [ ] Tombol "Simpan ke DB" berhasil PATCH
- [ ] Tombol "Preview Full" buka tab baru
- [ ] Tombol "Export HTML" download file
- [ ] dnaStatus terupdate ke 'injected'

**Phase 5 — Quality Check**
- [ ] Test dengan data klien real (bukan dummy)
- [ ] Semua placeholder ter-inject dengan benar
- [ ] Tidak ada call ke AI saat edit page (zero AI di edit flow)
- [ ] Preview iframe tidak memerlukan request ke server tiap keystroke
