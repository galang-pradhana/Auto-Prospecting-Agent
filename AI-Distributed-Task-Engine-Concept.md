# 🧠 Distributed AI Task Engine — Concept Document

> **Status:** Ide & Arsitektur Awal  
> **Oleh:** Galang Pradhana  
> **Tanggal:** 10 April 2026  
> **Tujuan:** Membangun sistem distribusi task AI ke banyak device murah secara adaptif dan fault-tolerant

---

## 1. Latar Belakang Ide

Permasalahan yang ingin dipecahkan:
- AI inference biasanya butuh hardware mahal (GPU besar)
- Mayoritas orang punya banyak device "menganggur" (HP lama, laptop lama, mini PC murah)
- Bagaimana jika kita bisa **memanfaatkan device-device murah itu secara kolektif** untuk menjalankan task AI yang besar?

Inspirasi dari blockchain:
- Blockchain mendistribusikan pekerjaan (validasi block) ke banyak node
- Tidak ada node tunggal yang "tahu segalanya" — semua berkolaborasi
- Idemu: **lakukan hal yang sama untuk task AI**

---

## 2. Konsep Inti (dari Galang)

```
1. Ada 1 device sebagai GATEWAY (orchestrator)
   └─ Gateway list semua device yang tersedia (ready)
   └─ Gateway mengetahui kemampuan maksimal tiap device
   └─ Gateway memecah task sesuai porsi kemampuan masing-masing device

2. Task dipecah → Dikirim ke device-device → Dieksekusi paralel

3. Saat device GAGAL di tengah jalan:
   └─ Device teriak "minta tolong" (failure signal)
   └─ Gateway menerima sinyal gagal
   └─ Task yang belum selesai dipecah menjadi bagian LEBIH KECIL lagi
   └─ Bagian kecil itu dilempar ke device lain yang available

4. Proses ini berulang (REKURSIF) sampai task selesai
```

**Kata kunci desain:** Adaptive, Fault-tolerant, Recursive, Proportional

---

## 3. Nama Teknis Konsep Ini

Dalam ilmu komputer, yang kamu desain adalah:

> **Adaptive Hierarchical Task Decomposition dengan Fault-Driven Re-partitioning**

Ini kombinasi dari:

| Konsep dalam Idemu | Istilah Teknis |
|---|---|
| Gateway yang list device | Resource Discovery + Capability Profiling |
| Split task sesuai kemampuan | Heterogeneous Work Partitioning |
| Task dieksekusi paralel | Fork-Join Parallelism |
| Device kirim sinyal gagal | Heartbeat Loss + Failure Signal |
| Task dipecah lagi saat gagal | **Dynamic Granularity Adjustment** ← yang novel |
| Loop sampai selesai | Work Stealing + Recursive Decomposition |

---

## 4. Perbandingan dengan Sistem yang Sudah Ada

| Sistem | Mirip dengan idemu? | Bedanya |
|---|---|---|
| **Apache Spark** | ✅ Partial | Jika gagal, task di-retry dengan ukuran SAMA — tidak diperkecil |
| **Ray (Anyscale)** | ✅ Paling mirip | Dynamic task graph, tapi subdivision on failure tidak adaptive |
| **Bittensor (TAO)** | ✅ Konsep token untuk AI | Fokus ke AI training, bukan inference distribusi |
| **Petals (HuggingFace)** | ✅ Partial | Model sharding per layer, bukan task sharding per item |
| **Celery + Redis** | ✅ Partial | Task queue tapi tidak ada adaptive subdivision |
| **Kubernetes** | ⚡ Infrastruktur | Resource scheduling tapi bukan untuk AI task |

### Yang Genuinely Novel dari Idemu:

> **Recursive Failure-Driven Subdivision** — saat gagal, bukan sekadar retry, tapi sistem **mengakui bahwa granularity terlalu besar** dan menyesuaikan ukuran task secara otomatis sebelum mendistribusikan ulang.

Analogi biologis: Fagositosis di sistem imun — makrofag yang tidak mampu menangani ancaman akan memanggil lebih banyak sel imun dan masalah dibagi-bagi. Nature sudah desain ini jauh sebelum CS.

---

## 5. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    GATEWAY NODE                         │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Device      │  │ Task         │  │ Result        │  │
│  │ Registry    │  │ Decomposer   │  │ Assembler     │  │
│  │             │  │              │  │               │  │
│  │ - Device ID │  │ - Split logic│  │ - Collects    │  │
│  │ - Capacity  │  │ - Min chunk  │  │ - Validates   │  │
│  │ - Status    │  │ - Max depth  │  │ - Returns     │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         └────────────────┼──────────────────┘           │
│                    ┌─────▼──────┐                        │
│                    │  Scheduler │                        │
│                    │  + Monitor │                        │
│                    └─────┬──────┘                        │
└──────────────────────────┼──────────────────────────────┘
                           │ WebSocket / HTTP
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Worker A │    │ Worker B │    │ Worker C │
    │ HP lama  │    │ RPi 4    │    │ Mini PC  │
    │ 2GB RAM  │    │ 4GB RAM  │    │ 8GB RAM  │
    │          │    │          │    │          │
    │ Agent:   │    │ Agent:   │    │ Agent:   │
    │ -Heartbt │    │ -Heartbt │    │ -Heartbt │
    │ -Execute │    │ -Execute │    │ -Execute │
    │ -Report  │    │ -Report  │    │ -Report  │
    └──────────┘    └──────────┘    └──────────┘
         │
         │ "Aku gagal di tengah jalan!"
         ▼
┌────────────────────┐
│ Gateway Re-decompose│
│ Task X → X1 + X2   │ ← dipecah lebih kecil
│ Assign ke D + E    │ ← lempar ke device lain
└────────────────────┘
```

---

## 6. Algoritma Inti (Pseudocode)

### Task Decomposition (Proportional by Capacity)

```python
def decompose_and_assign(task, available_devices):
    # Sort devices berdasarkan kapasitas (terbesar duluan)
    devices = sort_by_capacity(available_devices)
    
    # Hitung total kapasitas
    total_capacity = sum(d.capacity for d in devices)
    
    # Bagi task proporsional
    chunks = []
    for device in devices:
        chunk_size = task.size * (device.capacity / total_capacity)
        chunks.append((device, task.get_chunk(chunk_size)))
    
    return chunks
```

### Failure Recovery (Recursive)

```python
def handle_failure(failed_task, remaining_devices, depth=0):
    MAX_DEPTH = 5        # Batas rekursi agar tidak infinite loop
    MIN_CHUNK_SIZE = 1   # Task terkecil yang mungkin dikerjakan
    
    if depth >= MAX_DEPTH or failed_task.size <= MIN_CHUNK_SIZE:
        # Tidak bisa dipecah lagi → tandai gagal permanen
        return mark_permanently_failed(failed_task)
    
    # Pecah menjadi 2 bagian lebih kecil
    sub_tasks = failed_task.split(factor=2)
    
    for sub_task in sub_tasks:
        device = pick_best_available_device(remaining_devices, sub_task.size)
        if device:
            assign(
                task=sub_task, 
                device=device,
                on_fail=lambda t: handle_failure(t, remaining_devices, depth + 1)
            )
        else:
            # Tidak ada device available → queue untuk nanti
            queue_for_later(sub_task)
```

### Device Heartbeat & Capability

```python
# Setiap device kirim heartbeat tiap 5 detik
class DeviceAgent:
    def heartbeat(self):
        return {
            "device_id": self.id,
            "status": "ready" | "busy" | "overloaded",
            "free_ram_mb": get_free_ram(),
            "cpu_percent": get_cpu_usage(),
            "network_mbps": self.last_throughput,
            "estimated_capacity": self.calculate_capacity(),
            "supported_model": "llama3-8b" | "llama3-3b" | "gemma-2b"
        }
```

---

## 7. Validasi: Jenis Task yang Cocok vs Tidak Cocok

### ✅ Sangat Cocok (Embarrassingly Parallel)

Semua task di mana **setiap item adalah independent**:

```
"Enrich 100 leads"
   → 25 lead ke Device A (kuat)
   → 40 lead ke Device B (sedang)
   → 20 lead ke Device C (lemah)
   → 15 lead ke Device D (lemah)

"Generate 50 website HTML"
   → 20 ke Device A
   → 15 ke Device B
   → 15 ke Device C

"Scrape 10 area kota"
   → 1 area per device (10 device paralel)

"Analisa 1000 gambar"
   → 100 gambar per device
```

### ❌ Tidak Cocok (Sequential Dependency)

Task di mana output setiap langkah jadi input langkah berikutnya:

```
"Generate 1 respons dari prompt X"
   → Token ke-1 butuh semua context sebelumnya
   → Token ke-2 butuh token ke-1
   → Tidak bisa split antar device tanpa latency killer

"Train AI model dari dataset"
   → Gradient harus disync antara semua node
   → Butuh protokol khusus (AllReduce)
```

**Kesimpulan untuk proyek Forge:** Use case utama (enrichment, HTML generation, scraping) adalah **100% embarrassingly parallel** → sistem ini sempurna untuk Forge.

---

## 8. Stack Teknologi yang Direkomendasikan

### MVP (Bisa dibangun 2-3 minggu)

```
Gateway (1 VPS kecil / device kuat):
  └── FastAPI (Python) — REST API + WebSocket server
  └── Redis — Task queue & device registry
  └── PostgreSQL / SQLite — Menyimpan task state & hasil

Worker (setiap device murah):
  └── Ollama — Local AI inference (llama3, gemma, mistral, dll.)
  └── FastAPI Agent — Terima task, eksekusi, laporan hasil/gagal
  └── Heartbeat loop — Kirim status ke gateway tiap 5 detik

Komunikasi:
  └── WebSocket — Heartbeat & failure signal (real-time)
  └── REST HTTP — Task assignment & result submission
```

### Versi Lebih Advanced (Future)

```
+ Apache Kafka — Untuk high-throughput task streaming
+ Kubernetes — Orchestrate worker containers
+ Token System (ERC-20 atau custom) — Incentive untuk contribute compute
+ Zero-Knowledge Proof — Verifikasi hasil tanpa lihat datanya (privacy)
+ IPFS — Desentralisasi result storage
```

---

## 9. Tantangan Teknis yang Perlu Dipecahkan

| Tantangan | Solusi yang Direkomendasikan |
|---|---|
| Bagaimana gateway tahu kapasitas real device? | Device Agent kirim heartbeat dengan free RAM, CPU %, network speed |
| Task terlalu kecil → overhead koordinasi > task itu sendiri | Define MIN_CHUNK_SIZE dan tidak subdivisi di bawah threshold |
| Device offline saat tengah mengerjakan task | Timeout + failure signal → redistribute |
| Hasil dari banyak device harus digabung | Gateway sebagai assembler, simpan semua partial result, merge di akhir |
| Device tidak sama — model AI berbeda | Capability declaration per device, gateway assign task sesuai model |
| Idempotency — task dikerjakan dua kali karena race condition | Task ID unik + database lock (SELECT FOR UPDATE) |

---

## 10. Analogi Sederhana

Bayangkan kamu punya **10 buruh bangunan** dengan kemampuan berbeda-beda:

- Buruh A (kuat): bisa angkat 50 bata sekaligus  
- Buruh B (biasa): bisa angkat 30 bata  
- Buruh C (lemah): bisa angkat 10 bata  

**Mandor (Gateway):** "Kita perlu angkat 100 bata."
- Kasih A: 50 bata
- Kasih B: 30 bata  
- Kasih C + D: 10 bata masing-masing

**B tiba-tiba sakit di tengah jalan** (sudah angkat 15, sisa 15):
- Mandor terima laporan: "B tidak bisa lanjut!"
- Mandor lihat siapa yang available: D sedang senggang
- Sisa 15 bata dipecah: E ambil 8, D ambil 7
- Semua selesai!

Itulah sistem kamu dalam 1 paragraf. 🏗️

---

## 11. Next Steps (Roadmap)

- [ ] **Fase 0 - Proof of Concept** (2-3 minggu)
  - Setup 2 device: 1 gateway + 1 worker
  - Gateway kirim task "enrich 10 leads" ke worker via HTTP
  - Worker running Ollama, proses, return hasil
  - Basic failure detection (timeout)

- [ ] **Fase 1 - Multi-Worker** (1-2 minggu)
  - Tambah worker ke-3, ke-4
  - Proportional task distribution based on RAM
  - WebSocket heartbeat

- [ ] **Fase 2 - Fault Recovery** (2 minggu)
  - Implementasi recursive subdivision on failure
  - Task state persistence (bisa resume setelah crash)
  - Result assembly & validation

- [ ] **Fase 3 - Incentive Layer** (opsional, future)
  - Credit system untuk device yang contribute
  - Task marketplace (siapapun bisa submit task, siapapun bisa jadi worker)
  - Verifikasi hasil via majority voting

---

## 12. Potensi Bisnis

Jika ini dibangun dengan benar dan dibuka ke publik:

```
Model 1: SaaS
  User submit task AI → Sistem distribusikan ke worker pool global
  User bayar per task, worker dapat % dari bayaran

Model 2: Internal Tool
  Perusahaan pakai device-device kantor yang idle malam hari
  Sebagai compute pool untuk batch AI tasks

Model 3: "Airbnb for GPU/CPU"
  Orang monetize device mereka yang nganggur
  Mirip Akash Network tapi lebih accessible
```

---

*Dokumen ini adalah ringkasan percakapan dan fase brainstorming awal.*  
*Akan dilanjutkan sebagai proyek nyata setelah Automated Prospecting Engine selesai.*

---

**Last updated:** 10 April 2026  
**Author:** Galang Pradhana  
**Status:** 💡 Idea Stage → Akan lanjut ke MVP setelah proyek Forge selesai
