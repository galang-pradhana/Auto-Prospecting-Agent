# Workflow: The UMKM Factory Pipeline

## Phase 1: Data Mining (The Scraper)
1. Jalankan script Python (Playwright) berdasarkan keyword (misal: "Barbershop Makassar").
2. Ambil data: Nama, WA, Rating, Alamat, dan Top 5 Reviews.
3. Simpan ke Supabase dalam status `pending_enrichment`.

## Phase 2: AI Branding (The Engine)
1. Trigger API Kie.ai (BYOC) untuk setiap baris data baru.
2. Generate: Headline, Sub-headline, Service Descriptions, dan Polished Reviews.
3. Update database dengan konten yang sudah jadi, set status ke `ready_to_preview`.

## Phase 3: Deployment & Presentation
1. Generate Slug unik untuk setiap bisnis.
2. Assign 1 dari 5 template Dribbble-style secara acak (Randomized Template ID).
3. Pastikan Open Graph (OG Image) ter-render dengan nama bisnis untuk preview link WA.

## Phase 4: Pitching (The Closing)
1. Kirim pesan WA tersistem: "Value-First Pitch".
2. Isi pesan: Nama Bisnis + Link Preview + Call to Action (CTA) klaim website.
3. Monitoring klik link via analytics/database.

## Phase 5: Upselling
1. Jika tertarik Paket Starter, arahkan ke onboarding otomatis.
2. Jika butuh kustomisasi, tarik ke Paket Business (4-5jt) atau Custom (10jt).