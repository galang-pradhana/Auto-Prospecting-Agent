# Forge — Functional Test Cases (Final QA)

**Version:** 1.0  
**Date:** 2026-04-10  
**Scope:** All modules — Admin role  
**Environment:** Staging (Supabase + Go Worker + Next.js)

---

## MODULE 1: Authentication

| TC-ID | Modul | Skenario | Pre-condition | Steps | Input Data | Expected Result | Priority |
|-------|-------|----------|---------------|-------|------------|-----------------|----------|
| AUTH-01 | Auth | Register berhasil dengan data valid | DB kosong, belum ada user | 1. Buka `/login` → klik Register 2. Isi semua field 3. Submit | email: `qa@forge.dev`, pw: `Test1234!`, name: `QA Tester` | Redirect ke `/dashboard`, cookie `forge_session` ter-set, user muncul di DB | P0 |
| AUTH-02 | Auth | Register dengan email yang sudah terdaftar | User `qa@forge.dev` sudah ada di DB | 1. Submit form register | email: `qa@forge.dev` | Error: `"Email already registered"`, tidak ada record baru di DB | P0 |
| AUTH-03 | Auth | Register field kosong — semua wajib | Form register terbuka | 1. Klik Submit tanpa isi apapun | email: `""`, pw: `""`, name: `""` | Error: `"All fields are required"`, tidak ada record baru | P1 |
| AUTH-04 | Auth | Register dengan password sangat pendek | — | 1. Isi form dengan pw 1 karakter | pw: `"a"` | Tes apakah ada validasi minimum length. **Current behavior:** bcrypt akan hash tanpa client-side guard — pastikan ada validasi di server | P1 |
| AUTH-05 | Auth | Login berhasil | User `qa@forge.dev` ada di DB | 1. Isi email & password benar 2. Submit | email: `qa@forge.dev`, pw: `Test1234!` | Redirect ke `/dashboard`, session cookie aktif 7 hari | P0 |
| AUTH-06 | Auth | Login dengan password salah | User active di DB | 1. Submit login | email: `qa@forge.dev`, pw: `WrongPass!` | Error: `"Invalid credentials"`, tidak redirect | P0 |
| AUTH-07 | Auth | Login dengan email tidak terdaftar | — | 1. Submit login | email: `ghost@forge.dev`, pw: `anyPw` | Error: `"Invalid credentials"` — pesan HARUS sama dengan wrong password (u/ prevent enumeration) | P1 |
| AUTH-08 | Auth | Akses dashboard tanpa login | Tanpa cookie session | 1. Buka `/dashboard` langsung | — | Redirect ke `/login` | P0 |
| AUTH-09 | Auth | Logout berhasil | User sudah login | 1. Klik Logout | — | Cookie `forge_session` dihapus, redirect ke `/login`, halaman dashboard tidak bisa diakses | P0 |
| AUTH-10 | Auth | Session cookie tamper | User login, lalu cookie diubah manual | 1. Login 2. Edit cookie value di browser 3. Refresh dashboard | Cookie: `tamper_value_abc123` | `getSession()` return null, redirect ke `/login` | P1 |
| AUTH-11 | Auth | Login dengan format email tidak valid | — | 1. Isi field email dengan string bukan format email | email: `bukan-email`, pw: `Test1234!` | Validasi form menolak input (HTML5 atau server-side) | P2 |

---

## MODULE 2: Lead Management (CRUD)

| TC-ID | Modul | Skenario | Pre-condition | Steps | Input Data | Expected Result | Priority |
|-------|-------|----------|---------------|-------|------------|-----------------|----------|
| LEAD-01 | Lead | Fetch leads — filter status FRESH | User memiliki 5 lead FRESH, 3 ENRICHED | 1. Login 2. Pilih filter `FRESH` | status: `FRESH` | Hanya 5 lead FRESH yang tampil, milik `userId` login saja | P0 |
| LEAD-02 | Lead | Fetch leads — isolasi per user | User A memiliki 10 lead, User B punya 5 lead | 1. Login sebagai User A 2. Lihat leads | — | Hanya 10 lead User A yang tampil, tidak ada milik User B | P0 |
| LEAD-03 | Lead | Search lead berhasil | Lead "Bali Bakery" ada di DB | 1. Ketik `"Bali Bak"` di search bar | search: `"Bali Bak"` | Lead "Bali Bakery" muncul, nama lain tidak muncul | P1 |
| LEAD-04 | Lead | Filter kombinasi: city + category | 10 leads campuran city dan category | 1. Filter city = `"Denpasar"` + category = `"Kuliner"` | — | Hanya lead yang memenuhi KEDUA filter tampil | P1 |
| LEAD-05 | Lead | Pagination — halaman berikutnya | 25 leads tersedia | 1. Lihat halaman 1 (10 leads) 2. Klik halaman 2 | pageSize: 10, page: 2 | Halaman 2 menampilkan 10 leads berikutnya, totalCount 25 | P1 |
| LEAD-06 | Lead | Delete single lead berhasil | Lead X ada di DB | 1. Pilih lead X 2. Klik delete 3. Konfirmasi | ids: `[leadX.id]` | Lead X terhapus dari DB, logs muncul di ActivityLog (cascade), tokens dan events ikut terhapus | P0 |
| LEAD-07 | Lead | Delete lead — cascade ke child tables | Lead Y memiliki 3 ProspectEvent, 1 TrackingToken, 1 FollowupQueue, 5 ActivityLog | 1. Delete lead Y | ids: `[leadY.id]` | Semua child records ikut terhapus (cascade), tidak ada orphan record | P0 |
| LEAD-08 | Lead | Delete batch multi-lead | 5 lead terpilih | 1. Pilih 5 lead 2. Delete | ids: `[5 IDs]` | Semua 5 terhapus dari DB | P1 |
| LEAD-09 | Lead | Delete lead milik user lain | User A login, lead milik User B | 1. User A kirim delete request untuk leadId milik User B | leadId: milik User B | Request ditolak — lead tidak terhapus (auth guard `userId`) | P0 |
| LEAD-10 | Lead | Cleanup leads lama — FRESH > 14 hari | 3 FRESH leads > 14 hari lalu, 2 FRESH leads baru | 1. Jalankan `cleanupOldLeads()` | Threshold 14 hari | Hanya 3 leads lama yang terhapus, 2 yang baru aman | P1 |
| LEAD-11 | Lead | Boundary: rating = 0 (unknown) | — | 1. Tambah lead dengan rating 0 | rating: `0` | Lead diterima, rating tersimpan sebagai `0.0` | P2 |
| LEAD-12 | Lead | Boundary: rating = 5.0 (maksimal) | — | 1. Tambah lead rating 5.0 | rating: `5.0` | Lead diterima | P2 |
| LEAD-13 | Lead | WA unique constraint — duplikat WA | Lead WA `6281234567890` sudah ada | 1. Coba buat lead baru dengan WA sama | wa: `6281234567890` | Error unique constraint, lead baru tidak tersimpan | P0 |
| LEAD-14 | Lead | WA null — lead tanpa nomor WA | — | 1. Buat lead tanpa field `wa` | wa: `null` | Lead berhasil dibuat (WA nullable) | P1 |
| LEAD-15 | Lead | Save outreach draft | Lead ada di DB | 1. Generate draft WA 2. Simpan | draft: `"Halo Pak Budi..."` | Field `outreachDraft` ter-update di DB | P1 |
| LEAD-16 | Lead | Archive ke FINISH | Lead status READY | 1. Pilih lead 2. Archive | ids: `[leadIds]` | Status berubah ke `FINISH` | P1 |
| LEAD-17 | Lead | Update enrichment data | Lead FRESH ada | 1. Update brandData + aiAnalysis | brandData: `{...}` | Status berubah ke `ENRICHED`, ActivityLog terbuat | P1 |

---

## MODULE 3: Scraper Engine

| TC-ID | Modul | Skenario | Pre-condition | Steps | Input Data | Expected Result | Priority |
|-------|-------|----------|---------------|-------|------------|-----------------|----------|
| SCR-01 | Scraper | Health check — binary ada & executable | Binary `google-maps-scraper` tersedia | 1. Buka halaman Scraper 2. Cek health | — | Status: `"Ready to Ignite."`, semua `true` | P0 |
| SCR-02 | Scraper | Health check — binary tidak ada | Binary file tidak ada | 1. Hapus binary 2. Cek health | — | Status: `"Binary missing..."`, `binaryExists: false` | P0 |
| SCR-03 | Scraper | Health check — binary tidak executable | Binary ada tapi `chmod -x` | 1. Cek health | — | Status menunjukkan binary tidak executable | P1 |
| SCR-04 | Scraper | Repair permissions berhasil | Binary ada tapi tidak executable | 1. Klik "Fix Permissions" | — | `chmod +x` executed, health check menjadi executable | P1 |
| SCR-05 | Scraper | Run tanpa login | Tanpa session | 1. Kirim POST request ke scraper action | — | Return `{ success: false, "Not authenticated" }` | P0 |
| SCR-06 | Scraper | Run dengan input valid | Binary ready, API key valid | 1. Pilih category `"Kuliner"` 2. Province `"Bali"` 3. City `"Denpasar"` 4. Klik Run | category: `Kuliner`, province: `Bali`, city: `Denpasar` | Scraper berjalan, leads baru (rating ≥ 3.5) masuk ke DB, stats `{ new, aiRejected, processed }` dikembalikan | P0 |
| SCR-07 | Scraper | Filter rating — lead rating rendah dibuang | Scraper menemukan bisnis rating 2.0 | 1. Run scraper | rating scraper output: `2.0` | Lead dengan rating 2.0 di-skip, tidak masuk DB | P0 |
| SCR-08 | Scraper | Filter duplikasi — WA sudah ada di DB | Lead WA `628xx` sudah ada di DB | 1. Run scraper, scraper menemukan bisnis sama | WA: `628xx` sudah ada | Lead di-skip, tidak terjadi duplikat | P0 |
| SCR-09 | Scraper | Filter duplikasi — mapsUrl sudah ada | Lead dengan mapsUrl sama sudah ada | 1. Run scraper | mapsUrl: `"https://maps.google.com/..."` sudah ada | Di-skip berdasarkan mapsUrl | P1 |
| SCR-10 | Scraper | Filter AI — AI reject lead | AI menilai lead tidak relevan | 1. Run scraper dengan lead yang AI putuskan SKIP | AI response: `{ decision: "SKIP", reason: "..." }` | Lead tidak diinsert ke DB, `aiRejectedCount` bertambah | P1 |
| SCR-11 | Scraper | Radius guard — lead di luar kota | Scraper menemukan bisnis 30km dari pusat kota | 1. Run scraper dengan koordinat kota | distance > 25km | Lead di-skip: `"Outside City boundary"` | P1 |
| SCR-12 | Scraper | Stop scraper | Scraper sedang berjalan | 1. Klik Stop | — | `pkill -f google-maps-scraper` dijalankan, proses berhenti | P1 |
| SCR-13 | Scraper | Safety kill timer — proses hang 30 menit | Proses scraper jalan > 30 menit | — (timeout test) | — | Proses di-kill otomatis setelah 30 menit | P2 |
| SCR-14 | Scraper | Lead tanpa WA, website, dan mapsUrl di-skip | — | Scraper dapat item tanpa contact info | wa: null, website: N/A, mapsUrl: null | Lead di-skip: `"No contact potential"` | P1 |
| SCR-15 | Scraper | Koordinat dari mapsUrl fallback | Item tidak memiliki `lat`/`lng` tapi punya `mapsUrl` | — | mapsUrl: `"...!3d-8.6718!4d115.2126..."` | Koordinat di-parse dari URL |P2|

---

## MODULE 4: AI Enrichment & Forge (Website Generator)

| TC-ID | Modul | Skenario | Pre-condition | Steps | Input Data | Expected Result | Priority |
|-------|-------|----------|---------------|-------|------------|-----------------|----------|
| FORGE-01 | AI Enrich | Batch enrich berhasil | 3 lead FRESH diselect, API key valid | 1. Pilih 3 lead 2. Klik Enrich | selectedIds: `[id1, id2, id3]` | Status berubah ke ENRICHED, field `brandData`, `painPoints`, `resolvingIdea` terisi | P0 |
| FORGE-02 | AI Enrich | Enrich tanpa API key | API key tidak diset di env & user | 1. Klik Enrich | — | Error: `"Kie.ai API key tidak ditemukan"` | P0 |
| FORGE-03 | AI Forge | Generate website code — happy path | Lead ENRICHED tersedia, API key valid | 1. Buka Forge modal 2. Pilih style 3. Generate | leadId: valid, style: `"Modern Dark"` | `htmlCode` tersimpan di DB, status berubah ke `LIVE`, slug ter-generate | P0 |
| FORGE-04 | AI Forge | Generate website — slug auto-generate | Lead name: `"Bali Bakery"` | 1. Forge lead ini | — | slug: `"bali-bakery"` tersimpan di DB | P1 |
| FORGE-05 | AI Forge | Generate website — slug collision | Slug `"bali-bakery"` sudah ada | 1. Forge lead dengan nama sama | — | Slug baru: `"bali-bakery-{random}"` (tidak collision) | P1 |
| FORGE-06 | AI Forge | Tracker script di-inject ke HTML | Lead di-forge | 1. Forge lead 2. Cek `htmlCode` di DB | — | `htmlCode` mengandung `<script src=".../tracker.js" data-token="..."` sebelum `</body>` | P0 |
| FORGE-07 | AI Forge | Token tracking di-generate dan tersimpan | Lead di-forge | 1. Forge lead 2. Cek tabel `tracking_tokens` | — | Record baru di `tracking_tokens` dengan `prospect_id = leadId` | P0 |
| FORGE-08 | AI Forge | Follow-up stage di-set saat publish | Lead di-forge | 1. Forge lead 2. Cek lead record | — | `followupStage = "sent"`, `followupCount = 1`, `nextFollowupAt = now + 7 days` | P0 |
| FORGE-09 | AI Forge | Edit HTML live — unsaved preview | Lead LIVE tersedia | 1. Buka Edit Page modal 2. Instruksikan perubahan 3. Preview (tanpa Save) | instruction: `"ubah warna background jadi biru"` | HTML dipreview di iframe, `htmlCode` di DB TIDAK berubah | P1 |
| FORGE-10 | AI Forge | Edit HTML live — save | Preview sudah ada | 1. Klik Save | — | `htmlCode` di DB ter-update, ActivityLog terbuat | P0 |
| FORGE-11 | AI Forge | Batch Forge — multiple leads | 3 lead ENRICHED diselect | 1. Klik Batch Forge | selectedIds: `[3 IDs]` | Semua 3 lead di-forge satu per satu, masing-masing punya slug & htmlCode | P1 |
| FORGE-12 | AI Forge | Live preview via `/preview/[slug]` | Lead LIVE, slug valid | 1. Buka `example.com/preview/bali-bakery` | — | HTML lead ditampilkan di browser | P0 |
| FORGE-13 | AI Forge | Live preview slug tidak ada | slug tidak valid | 1. Buka `example.com/preview/slug-salah` | — | 404 atau redirect ke halaman error | P1 |

---

## MODULE 5: Tracking & Redirect System

| TC-ID | Modul | Skenario | Pre-condition | Steps | Input Data | Expected Result | Priority |
|-------|-------|----------|---------------|-------|------------|-----------------|----------|
| TRACK-01 | Tracking | Redirect `/go/:token` — token valid | Lead LIVE, token tersimpan di `tracking_tokens` | 1. Buka `{APP_BASE_URL}/go/{token}` | token: valid 12-char | Redirect 302 ke `{LIVE_SITE_BASE_URL}/{slug}`, event `link_clicked` tersimpan di `prospect_events` | P0 |
| TRACK-02 | Tracking | Redirect — token tidak valid | — | 1. Buka `/go/invalidToken123` | token: `"invalidToken123"` | HTTP 404, tidak ada redirect | P0 |
| TRACK-03 | Tracking | Redirect — token kosong | — | 1. Buka `/go/` | token: `""` | HTTP 400 Bad Request | P1 |
| TRACK-04 | Tracking | Beacon `/api/track` — happy path | Token valid, lead ada | 1. POST ke `/api/track` | `{"token": "abc123", "duration": 5}` | HTTP 204, `totalTimeOnPage` bertambah 5 detik, event `time_beacon` tersimpan | P0 |
| TRACK-05 | Tracking | Beacon — durasi menyebabkan kualifikasi | `totalTimeOnPage` lead = 7, beacon = 5 | 1. POST beacon duration 5 | `{"duration": 5}` | `totalTimeOnPage = 12`, `qualifiedAt` ter-set, `followupStage = "qualified"`, event `qualified` tersimpan | P0 |
| TRACK-06 | Tracking | Beacon — already qualified | `qualifiedAt` sudah ada | 1. POST beacon | `{"duration": 5}` | `totalTimeOnPage` tetap bertambah, `qualifiedAt` TIDAK berubah (tidak di-reset) | P1 |
| TRACK-07 | Tracking | Beacon — token tidak valid | — | 1. POST `/api/track` | `{"token": "bogus"}` | HTTP 404, tidak ada perubahan di DB | P1 |
| TRACK-08 | Tracking | Beacon — durasi 0 | — | 1. POST `/api/track` | `{"token": valid, "duration": 0}` | HTTP 204, `totalTimeOnPage` tidak berubah (0 tambah 0) | P2 |
| TRACK-09 | Tracking | Beacon — durasi negatif | — | 1. POST `/api/track` | `{"token": valid, "duration": -5}` | Idealnya: validasi tolak. Current behavior: `totalTimeOnPage` bisa berkurang — **RISK** | P1 |
| TRACK-10 | Tracking | tracker.js injected — script ada di HTML | Lead di-forge | 1. GET `/preview/{slug}` atau cek DB htmlCode | — | String `data-token="..."` ada di HTML, token = 12 alfanumerik | P0 |
| TRACK-11 | Tracking | Double token — satu lead dua token | Lead di-forge ulang | 1. Forge lead → Forge lagi | — | `TrackingToken` memiliki `@unique` pada `prospectId` → Forge kedua akan error (atau update). Verifikasi behavior | P1 |

---

## MODULE 6: Follow-Up Scheduler & Queue

| TC-ID | Modul | Skenario | Pre-condition | Steps | Input Data | Expected Result | Priority |
|-------|-------|----------|---------------|-------|------------|-----------------|----------|
| FUP-01 | Scheduler | WA #2 masuk queue — qualified + H+7 | Lead `qualifiedAt != null`, `followupCount = 1`, `nextFollowupAt <= now` | 1. Jalankan scheduler cycle | — | Record baru di `followup_queue` dengan `followup_number = 2`, `status = "pending"`, wa_link terisi | P0 |
| FUP-02 | Scheduler | WA #2 TIDAK masuk queue — belum qualified | Lead `qualifiedAt = null`, `followupCount = 1`, `nextFollowupAt <= now` | 1. Jalankan scheduler | — | TIDAK ada record baru di queue untuk WA #2 | P0 |
| FUP-03 | Scheduler | WA #3 masuk queue — H+14 | Lead `followupCount = 2`, `nextFollowupAt <= now` | 1. Jalankan scheduler | — | Queue record `followup_number = 3` muncul, `nextFollowupAt` diupdate ke now+7 | P0 |
| FUP-04 | Scheduler | WA #4 (Last Call) — tanpa syarat | Lead `followupCount = 3`, `nextFollowupAt <= now` | 1. Jalankan scheduler | — | Queue record `followup_number = 4` muncul, `followupStage = "closed_lost"` di-set, `nextFollowupAt = null` | P0 |
| FUP-05 | Scheduler | Lead `closed_lost` tidak masuk queue lagi | Lead `followupStage = "closed_lost"`, `followupCount = 4` | 1. Jalankan scheduler | — | Tidak ada queue baru untuk lead ini | P0 |
| FUP-06 | Scheduler | `followupCount >= 4` tidak diproses | Lead sudah 4 kali follow-up | 1. Jalankan scheduler | — | Query `WHERE followup_count < 4` mengecualikan lead ini | P0 |
| FUP-07 | Scheduler | WA link di-generate dengan benar | Lead phone: `6281234567890` | 1. Scheduler buat queue | — | `waLink` = `"https://wa.me/6281234567890?text=..."` | P1 |
| FUP-08 | Scheduler | Transaksi atomik — rollback jika error | DB error saat update prospect | 1. Simulasi DB error | — | Jika INSERT queue sukses tapi UPDATE prospects gagal, kedua operasi di-rollback | P1 |
| FUP-09 | Queue UI | Panel notifikasi muncul — ada pending | Ada 3 item pending di `followup_queue` milik user | 1. Buka dashboard | — | Badge merah dengan angka `3` muncul di pojok kanan bawah | P0 |
| FUP-10 | Queue UI | Panel notifikasi hilang — queue kosong | Tidak ada pending queue | 1. Buka dashboard | — | Tombol bell tidak muncul (atau muncul tapi tanpa badge) | P1 |
| FUP-11 | Queue UI | Klik Kirim via WA | Item pending di panel | 1. Klik "Kirim via WA" | — | Tab baru terbuka dengan URL `wa.me/...`, status item berubah ke `"sent"`, `sentAt` ter-set | P0 |
| FUP-12 | Queue UI | Dismiss item | Item pending di panel | 1. Klik tombol dismiss (X) | — | Status berubah ke `"dismissed"`, item hilang dari panel | P1 |
| FUP-13 | Queue UI | Auto-refresh — item baru muncul otomatis | Panel terbuka, scheduler baru jalan | 1. Tunggu 60 detik | — | Panel refresh otomatis dan menampilkan item baru dari queue | P2 |
| FUP-14 | Queue UI | Isolasi per user — tidak tampil queue user lain | User A & B punya pending queue | 1. Login sebagai User A | — | Hanya queue milik lead User A yang tampil | P0 |

---

## MODULE 7: Instagram Lead Extraction

| TC-ID | Modul | Skenario | Pre-condition | Steps | Input Data | Expected Result | Priority |
|-------|-------|----------|---------------|-------|------------|-----------------|----------|
| IG-01 | IG Extract | Upload screenshot valid | User login, API key ada | 1. Upload screenshot profil IG bisnis 2. Klik Extract | base64: valid JPEG screenshot | `{ success: true, extracted: { name, ig, category, ... } }` dikembalikan | P0 |
| IG-02 | IG Extract | Tanpa login | Session tidak ada | 1. POST ke `/api/leads-ig/extract` tanpa auth | — | `{ error: "Unauthorized" }`, status 401 | P0 |
| IG-03 | IG Extract | Request tanpa `base64` field | User login | 1. POST dengan body kosong | `{}` | `{ error: "base64 image is required" }`, status 400 | P1 |
| IG-04 | IG Extract | Gambar terlalu besar (> 5MB) | User login | 1. Upload gambar > 5MB | base64 length > 7.000.000 chars | `{ error: "Gambar terlalu besar. Maksimal 5MB." }`, status 400 | P1 |
| IG-05 | IG Extract | Gambar tepat di batas (= 5MB) | User login | 1. Upload gambar ~5MB (7.000.000 chars) | base64 length = 7.000.000 | Jika length < 7.000.000 maka diproses, jika >= maka ditolak | P2 |
| IG-06 | IG Extract | AI tidak return JSON valid | AI menghasilkan teks biasa | 1. Upload gambar rusak/bukan IG | AI output: `"Ini bukan screenshot IG"` | Response 422: `{ error: "AI tidak return format JSON yang valid" }` | P1 |
| IG-07 | IG Extract | AI timeout > 120s | Koneksi kie.ai lambat | 1. Upload gambar | AI tidak respond dalam 120 detik | `{ error: "AI timeout. Coba lagi." }`, status 504 | P1 |
| IG-08 | IG Extract | Field WA tidak ada di profil IG | Profil tidak mencantumkan nomor | 1. Upload screenshot tanpa nomor WA | — | `contact: null` di extracted data, bukan error | P1 |
| IG-09 | IG Extract | Field location tidak ada | Profil tanpa lokasi | 1. Upload screenshot | — | `location: null` di extracted data | P2 |
| IG-10 | IG Extract | Create lead dari hasil IG | Hasil ekstraksi selesai | 1. Klik "Create Lead" dari hasil | extracted: `{ name, ig, category }` | Lead baru masuk DB dengan `ig` field terisi, status FRESH | P0 |
| IG-11 | IG Extract | Create lead tanpa nomor WA | `contact: null` dari IG extract | 1. Create lead | wa: null | Lead berhasil dibuat (karena WA nullable, constraint sudah di-relax sebelumnya) | P0 |

---

## MODULE 8: Settings & WA Templates

| TC-ID | Modul | Skenario | Pre-condition | Steps | Input Data | Expected Result | Priority |
|-------|-------|----------|---------------|-------|------------|-----------------|----------|
| SET-01 | WA Template | Buat template baru | Tidak ada template | 1. Isi form template 2. Save | title: `"Template Kuliner"`, content: `"Halo {{name}}..."` | Template tersimpan di DB, `isDefault = true` (karena pertama) | P0 |
| SET-02 | WA Template | Template pertama otomatis jadi default | DB kosong dari template | 1. Buat template pertama | — | `isDefault = true` di-set otomatis | P1 |
| SET-03 | WA Template | Set template sebagai default | 3 template ada | 1. Klik "Set as Default" pada template ke-2 | templateId: T2 | T1 `isDefault = false`, T2 `isDefault = true` (transaksional) | P1 |
| SET-04 | WA Template | Delete template default | Template default ada, ada template lain | 1. Delete template default | — | Template lain otomatis di-set sebagai default | P1 |
| SET-05 | WA Template | Delete template satu-satunya | Hanya 1 template | 1. Delete template | — | Template terhapus, tidak ada default (no remaining) | P2 |
| SET-06 | WA Template | Template kosong — save | — | 1. Isi title tapi content kosong 2. Save | content: `""` | Idealnya error validasi. Current: kemungkinan tersimpan — **CHECK** | P1 |
| SET-07 | WA Template | Generate WA Link — template kategori match | Lead category `"Kuliner"`, template category `"Kuliner"` ada | 1. Klik Generate WA Link untuk lead | — | Template `"Kuliner"` diprioritaskan, `{{name}}` & `{{category}}` di-replace | P0 |
| SET-08 | WA Template | Generate WA Link — fallback ke default | Tidak ada template kategori match | 1. Klik Generate WA | — | Template default digunakan sebagai fallback | P1 |
| SET-09 | WA Template | Generate WA Link — lead tanpa WA | Lead WA = null | 1. Generate WA Link | wa: null | `sanitizeWaNumber(null)` → wa.me link error atau empty number | P1 |
| SET-10 | Settings | Update API Key | User login | 1. Masukkan Kie.ai API key 2. Save | kieAiApiKey: `"sk-xxx..."` | Key tersimpan terenkripsi/plaintext di DB, bisa digunakan untuk AI calls | P0 |
| SET-11 | Settings | Cek status Kie.ai — connected | API key valid | 1. Klik Check Status | apiKey: valid | `{ success: true, credit: "X.XX", engine: "..." }` | P0 |
| SET-12 | Settings | Cek status Kie.ai — key invalid | Key salah | 1. Cek status | apiKey: `"invalid-key"` | `{ success: false, message: "API Key Invalid..." }` | P1 |
| SET-13 | Settings | Cek status Kie.ai — timeout | Kie.ai unreachable | 1. Cek status | — | `{ success: false, message: "Kie.ai Server Timeout..." }` dalam 10 detik | P1 |

---

## MODULE 9: State Transitions (Status Flow)

| TC-ID | Modul | Skenario | Pre-condition | Steps | Input Data | Expected Result | Priority |
|-------|-------|----------|---------------|-------|------------|-----------------|----------|
| STATE-01 | Status | FRESH → ENRICHED | Lead FRESH | 1. Jalankan AI Enrich | — | Status berubah ke `ENRICHED`, `brandData` terisi | P0 |
| STATE-02 | Status | ENRICHED → LIVE | Lead ENRICHED | 1. Forge website 2. Save | — | Status berubah ke `LIVE`, `htmlCode` & `slug` terisi | P0 |
| STATE-03 | Status | LIVE → followupStage: sent | Lead baru LIVE | 1. Lihat `followupStage` | — | `followupStage = "sent"` | P0 |
| STATE-04 | Status | sent → clicked | Lead klik redirect link | 1. Buka URL `/go/{token}` | — | Event `link_clicked` tersimpan | P1 |
| STATE-05 | Status | clicked → qualified | Lead time on page > 10s | 1. Beacon kirim total 11+ detik | totalTimeOnPage >= 10 | `qualifiedAt` ter-set, `followupStage = "qualified"` | P0 |
| STATE-06 | Status | qualified → scheduler queue WA #2 | Lead qualified, H+7 tiba | 1. Scheduler jalan | — | Queue WA #2 muncul | P0 |
| STATE-07 | Status | Setelah WA #4 → closed_lost | Scheduler kirim WA #4 | 1. Scheduler proses lead followupCount=3 | — | `followupStage = "closed_lost"` | P0 |
| STATE-08 | Status | LIVE → kembali ke ENRICHED | — | 1. User mengubah status secara manual? | — | Pastikan tidak ada backward transition yang merusak pipeline | P2 |
| STATE-09 | Status | FINISH → tidak bisa di-Forge ulang | Lead FINISH | 1. Coba Forge lead FINISH | — | UI tidak menampilkan tombol Forge, atau API menolak | P2 |

---

## 3 SKENARIO PALING BERISIKO

### 🔴 RISK-01: Race Condition pada Bot Scheduler vs. Manual Queue Update
**Kenapa berisiko:** Scheduler berjalan setiap jam sebagai goroutine terpisah. Jika user Dashboard secara bersamaan melakukan "Dismiss" atau "Sent" pada item queue, sementara scheduler sedang menjalankan `ProcessFollowups()` dan mencoba melakukan UPDATE pada record yang sama — ini bisa menyebabkan:
- Status tertimpa kembali ke "pending"
- Transaksi block satu sama lain
- Data inconsistency di `followup_count`

**Action:** Pastikan `ProcessFollowups()` menggunakan `SELECT ... FOR UPDATE` atau cek status item sebelum insert queue baru.

---

### 🔴 RISK-02: Token Collision / Re-Forge Overwrite issue
**Kenapa berisiko:** `TrackingToken` memiliki constraint `@unique` pada `prospectId` (bukan token). Jika lead di-Forge ulang (misalnya user edit design dan save ulang via `saveForgeCode`):
- `prisma.trackingToken.create()` akan **throw unique constraint error** karena lead ini sudah punya token
- Error ini akan mengorbankan SELURUH publish operation
- Lead tidak akan go LIVE, user tidak tahu kenapa

**Current code tidak handle ini** — tidak ada `upsert` atau `createIfNotExists`.

**Action:** Ganti `create` menjadi `upsert` di `saveForgeCode`.

---

### 🔴 RISK-03: Beacon dengan Durasi Negatif Merusak totalTimeOnPage
**Kenapa berisiko:** `POST /api/track` menerima `duration: -100` dan langsung menjalankan:
```sql
SET total_time_on_page = total_time_on_page + (-100)
```
Ini bisa membuat `totalTimeOnPage` menjadi negatif. Jika ada logic lain yang membaca nilai ini dengan asumsi `>= 0` (misalnya qualification threshold), bisa terjadi false negative qualification atau data corruption.

**Skenario exploit:** Bot mengirim beacons dengan durasi negatif untuk "de-qualify" prospek.

**Action:** Tambahkan validasi `if duration <= 0: return 400` di handler beacon.

---

## REKOMENDASI TEST DATA

### 1. Seed Data Wajib (Pre-Test Setup)
```sql
-- User A (admin utama)
INSERT INTO users (email, password, name) VALUES ('qa@forge.dev', '$bcrypt$Test1234!', 'QA Tester');

-- User B (isolasi test)
INSERT INTO users (email, password, name) VALUES ('other@forge.dev', '$bcrypt$Other1234!', 'Other User');

-- Lead FRESH dengan WA valid
INSERT INTO prospects (name, wa, category, province, city, status, userId)
VALUES ('Bali Bakery', '6281234567890', 'Kuliner', 'Bali', 'Denpasar', 'FRESH', '[User A ID]');

-- Lead ENRICHED siap di-Forge
INSERT INTO prospects (name, wa, category, status, brandData, resolvingIdea, userId)
VALUES ('Spa Seminyak', '6281234567899', 'Spa', 'ENRICHED', '{"colors": ["#fff"]}', 'Landing page premium', '[User A ID]');

-- Lead LIVE dengan token (untuk tracking test)
INSERT INTO prospects (..., status, followupCount, followupStage, nextFollowupAt)
VALUES ('Restaurant Ubud', ..., 'LIVE', 1, 'sent', NOW() - INTERVAL '8 days');

-- WA Template default
INSERT INTO wa_templates (title, content, isDefault)
VALUES ('Template Default', 'Halo {{name}}, kami punya solusi untuk {{category}} Anda.', true);
```

### 2. Edge Case Test Data
| Data | Tujuan |
|------|--------|
| Lead WA = `null` | Test nullable WA path |
| Lead name = `"O'Brien's Café & Bar"` | Special chars dalam slug generation |
| Lead name = `" "` (spasi saja) | Empty name edge case |
| rating = `3.49` | Boundary bawah filter rating |
| rating = `3.5` | Batas bawah yang lolos |
| base64 persis 6.999.999 chars | Boundary IG upload size |
| `totalTimeOnPage = 9` | 1 detik sebelum kualifikasi |
| Token: `"AAAAAAAAAAAAA"` (>12 char) | Panjang token tidak valid |
| Lead dengan 500+ ActivityLog | Performance test cascade delete |

### 3. Environment Variables Wajib Ada
```
DATABASE_URL=postgresql://...
KIE_AI_API_KEY=sk-valid-key           # Untuk test AI calls
LIVE_SITE_BASE_URL=http://localhost:3000
APP_BASE_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
