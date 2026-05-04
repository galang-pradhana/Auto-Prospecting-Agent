"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  MapPin,
  Star,
  Globe,
  Loader2,
  Zap,
  CheckCircle2,
  Navigation,
  Building2,
  Map,
  Landmark,
  Sparkles,
  ChevronDown,
  X,
  RefreshCcw,
  ChevronsUpDown,
  Check,
  Circle,
  AlertTriangle,
} from "lucide-react";
import {
  runScraper,
  checkScraperHealth,
  repairScraperPermissions,
  stopScraper,
} from "@/lib/actions/scraper";
import { getRegionalAdvice } from "@/lib/actions/ai";
import { getProvinces, getCities, getDistricts } from "@/lib/actions/lead";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { getLatestSandbox } from "@/lib/actions/sandbox";

// Kategori Google Maps Terstruktur & Dioptimalkan untuk Prospecting UMKM Indonesia
const CATEGORY_MAP: Record<string, string[]> = {
  "Kuliner & Makanan": [
    "Restoran",
    "Restoran Padang",
    "Restoran Seafood",
    "Cafe",
    "Kedai Kopi",
    "Toko Roti & Kue (Bakery)",
    "Catering",
    "Toko Minuman",
  ],
  "Toko & Ritel": [
    "Toko Kelontong",
    "Supermarket",
    "Minimarket",
    "Toko Pakaian",
    "Toko Sepatu",
    "Toko Kain",
    "Toko Perhiasan",
    "Toko Elektronik",
    "Toko Komputer",
    "Toko Ponsel",
    "Toko Buku",
    "Toko Alat Tulis",
    "Toko Bunga (Florist)",
    "Pet Shop",
    "Toko Bahan Bangunan",
    "Distributor Sembako",
  ],
  "Jasa & Kesehatan": [
    "Klinik Medis",
    "Apotek",
    "Klinik Gigi",
    "Salon Kecantikan",
    "Klinik Kecantikan",
    "Klinik Hewan",
    "Barber Shop",
    "Laundry Service",
    "Photography Studio",
    "Wedding Organizer",
    "Law Firm (Konsultan Hukum)",
  ],
  Otomotif: [
    "Bengkel Mobil",
    "Bengkel Motor",
    "Dealer Mobil Bekas",
    "Toko Suku Cadang",
    "Tempat Cuci Mobil (Car Wash)",
    "Auto Detailing",
  ],
  "Perumahan & Industri": [
    "Agen Properti (Real Estat)",
    "Kontraktor Umum",
    "Jasa Renovasi",
    "Tukang Listrik",
    "Tukang Ledeng",
    "Desain Interior",
    "Jasa Konstruksi",
    "Pabrik",
    "Gudang",
  ],
  "Agrikultur & Peternakan": [
    "Pertanian",
    "Perkebunan",
    "Pertanian Organik",
    "Peternakan Sapi",
    "Peternakan Ayam",
    "Peternakan Kambing",
    "Peternakan Babi",
    "Perikanan Tambak",
    "Perikanan Laut",
    "Budidaya Ikan Lele",
    "Budidaya Udang",
    "Distributor Pupuk",
    "Toko Pupuk & Pestisida",
    "Supplier Bibit Tanaman",
    "Distributor Pakan Ternak",
    "Distributor Pakan Ikan",
    "Supplier DOC Ayam",
    "Distributor Obat Hewan & Vaksin",
    "Kios Pertanian",
    "Toko Alat Pertanian",
    "Rental Traktor & Alat Pertanian",
    "Pengepul Hasil Pertanian",
    "Cold Storage & Pengolahan Ikan",
    "Pengolahan Hasil Ternak",
  ],
  "Pendidikan & Hiburan": [
    "Sekolah Swasta",
    "Taman Kanak-kanak",
    "Tempat Bimbel / Kursus",
    "Gym & Pusat Kebugaran",
    "Studio Yoga",
    "Lapangan Futsal / Olahraga",
    "Hotel & Penginapan",
    "Villa",
    "Taman Wisata",
  ],
};

const MAIN_CATEGORIES = Object.keys(CATEGORY_MAP);

// Searchable Combobox Component
function SearchCombobox({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
    }
  };

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase()),
  );

  if (!options || options.length === 0) {
    const isDistricts = placeholder.toLowerCase().includes("district");
    const isFetching = placeholder.toLowerCase().includes("fetching");
    return (
      <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-500 text-sm italic flex items-center gap-2">
        {isFetching && (
          <Loader2 size={14} className="animate-spin text-accent-gold" />
        )}
        {isDistricts
          ? isFetching
            ? placeholder
            : "No districts found"
          : "Loading regions..."}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative w-full" onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setSearch("");
        }}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-left outline-none focus:border-accent-gold/50 focus:ring-4 focus:ring-accent-gold/5 transition-all text-zinc-100 font-semibold text-sm flex items-center justify-between cursor-pointer hover:border-zinc-600"
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronsUpDown
          size={16}
          className={`shrink-0 ml-2 transition-colors ${open ? "text-accent-gold" : "text-zinc-500"}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 z-[9999] mt-2 w-full bg-zinc-950 border border-zinc-700 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] ring-1 ring-white/5"
            style={{ top: "100%" }}
          >
            <div className="p-3 border-b-2 border-zinc-700/80 bg-zinc-950 rounded-t-2xl">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Cari ${placeholder.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/10 transition-all"
                />
              </div>
            </div>
            <div className="max-h-[220px] overflow-y-auto py-1">
              {filtered.length > 0 ? (
                filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-5 py-3 text-sm flex items-center justify-between transition-all ${
                      opt === value
                        ? "bg-accent-gold/15 text-accent-gold font-bold"
                        : "text-zinc-200 hover:bg-zinc-800/80 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {opt === value && (
                      <Check size={14} className="text-accent-gold shrink-0" />
                    )}
                  </button>
                ))
              ) : search.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange(search);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full text-left px-5 py-4 text-sm flex items-center gap-3 transition-all bg-accent-gold/10 text-accent-gold border-y border-accent-gold/20 hover:bg-accent-gold/20 font-bold"
                >
                  <Sparkles size={16} /> Gunakan "{search}"
                </button>
              ) : (
                <div className="px-5 py-6 text-sm text-zinc-500 italic text-center flex flex-col items-center gap-2">
                  <Search size={16} className="text-zinc-600" />
                  Tidak ditemukan "{search}"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ScraperPage() {
  const [isScraping, setIsScraping] = useState(false);
  const [step, setStep] = useState(0);
  const scraperStages = [
    "Initializing Gravity Engine...",
    "Bypassing Google Maps Rate Limits...",
    "Extracting High-Potential Leads...",
    "Applying Mandatory Rule-Based Filters...",
    "Running AI Quality Filter (v4)...",
    "Finalizing batch synchronization...",
  ];

  // New Filter States
  const [minRating, setMinRating] = useState(3.5);
  const [maxRating, setMaxRating] = useState(5.0);
  const [minReviews, setMinReviews] = useState(5);
  const [requireNoWebsite, setRequireNoWebsite] = useState(true);
  const [requirePhone, setRequirePhone] = useState(false);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] = useState(
    MAIN_CATEGORIES[0],
  );
  const [selectedSubCategory, setSelectedSubCategory] = useState(
    CATEGORY_MAP[MAIN_CATEGORIES[0]][0],
  );
  const [includeDistricts, setIncludeDistricts] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [sandboxResults, setSandboxResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'results' | 'sandbox'>('results');
  const [fetchingDistricts, setFetchingDistricts] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [stats, setStats] = useState({
    new: 0,
    rejected: 0,
    processed: 0,
    total: 0,
  });
  const [isDone, setIsDone] = useState(false);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [coords, setCoords] = useState<{ lat: string; lng: string } | null>(
    null,
  );
  const [isStopping, setIsStopping] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [currentRadius, setCurrentRadius] = useState<number | null>(null);
  const SCRAPE_LIMIT = 15; // Defining a constant for progress calculation

  // Tambahkan useEffect ini buat simulasi pergerakan bar
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScraping) {
      setStep(0);
      interval = setInterval(() => {
        setStep((prev) => (prev < scraperStages.length - 1 ? prev + 1 : prev));
      }, 5000); // Gerak tiap 5 detik
    }
    return () => clearInterval(interval);
  }, [isScraping]);

  // Health State
  const [health, setHealth] = useState<any>(null);
  const [repairing, setRepairing] = useState(false);

  useEffect(() => {
    if (selectedMainCategory && CATEGORY_MAP[selectedMainCategory]) {
      setSelectedSubCategory(CATEGORY_MAP[selectedMainCategory][0]);
    }
  }, [selectedMainCategory]);

  useEffect(() => {
    const loadProvinces = async () => {
      const list = await getProvinces();
      setProvinces(list);
      if (list.length > 0) setSelectedProvince(list[0]);
    };
    loadProvinces();
  }, []);

  useEffect(() => {
    const loadCities = async () => {
      if (!selectedProvince) return;
      const list = await getCities(selectedProvince);
      setCities(list);
      if (list.length > 0) setSelectedCity(list[0]);
      setSelectedDistrict("");
      setDistricts([]);
    };
    loadCities();
  }, [selectedProvince]);

  useEffect(() => {
    const loadDistricts = async () => {
      if (!selectedProvince || !selectedCity) return;
      console.log(
        `[ScraperPage] Fetching districts for: ${selectedProvince} -> ${selectedCity}`,
      );
      setFetchingDistricts(true);
      try {
        const list = await getDistricts(selectedProvince, selectedCity);
        console.log(`[ScraperPage] Received ${list?.length || 0} districts`);
        setDistricts(list || []);
      } catch (error) {
        console.error("[ScraperPage] Failed to fetch districts:", error);
        setDistricts([]);
      } finally {
        setFetchingDistricts(false);
      }
    };
    loadDistricts();
  }, [selectedProvince, selectedCity]);

  // Geo-Lock: Update coordinates on location change (Dynamic Import for optimized loading)
  useEffect(() => {
    const fetchCoords = async () => {
      if (selectedCity) {
        const { getCoordinates } = await import("@/lib/actions/lead");
        const res = await getCoordinates(selectedCity, selectedDistrict || "");
        if (res) {
          console.log(
            `[Geo-Lock] Region Lock Activated: ${res.lat}, ${res.lng}`,
          );
          setCoords(res);
        } else {
          setCoords(null);
        }
      }
    };
    fetchCoords();
  }, [selectedCity, selectedDistrict]);

  // Health Polling
  useEffect(() => {
    const updateHealth = async () => {
      const h = await checkScraperHealth();
      setHealth(h);
    };
    updateHealth();
    const interval = setInterval(updateHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // AUTO-TOGGLE: Disable expansion if district is selected
  useEffect(() => {
    if (selectedDistrict) setIncludeDistricts(false);
  }, [selectedDistrict]);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch("/api/scraper/results");
        if (res.ok) {
          const latest: any[] = await res.json();
          // Filter by session start time if active (with 10s buffer for server/client sync)
          const filtered = sessionStartTime
            ? latest.filter(
                (l) =>
                  new Date(l.createdAt).getTime() > sessionStartTime - 10000,
              )
            : latest;
          setResults(filtered);
        }
        const statsRes = await fetch("/api/stats");
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    };

    fetchLatest();
    const interval = setInterval(async () => {
      fetchLatest();
      // Also fetch sandbox
      const sandbox = await getLatestSandbox(sessionStartTime || undefined);
      setSandboxResults(sandbox);
    }, 6000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);

  // Job Polling Effect
  useEffect(() => {
    if (!activeJobId) return;

    const pollJob = async () => {
      try {
        const res = await fetch(`/api/jobs/status?id=${activeJobId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.job) {
            setJobProgress(data.job.progress);
            if (data.job.data) {
              setStats(data.job.data);
              setSessionStats(data.job.data);
            }

            if (data.job.status === "COMPLETED") {
              setIsDone(true);
              setIsScraping(false);
              setActiveJobId(null);
              toast.success("Scraper Finished!");
            } else if (data.job.status === "FAILED") {
              setIsScraping(false);
              setActiveJobId(null);
              toast.error("Scraper Failed: " + data.job.message);
              setStep(scraperStages.length - 1);
            }
          }
        }
      } catch (e) {
        // Ignore sync errors
      }
    };

    const interval = setInterval(pollJob, 4000);
    return () => clearInterval(interval);
  }, [activeJobId]);

  const handleScrape = async () => {
    setIsScraping(true);
    setStep(0);
    setJobProgress(0);
    setResults([]);
    setSessionStartTime(Date.now());
    setIsDone(false);
    setSessionStats(null);
    setCurrentRadius(null);
    setStats({ new: 0, rejected: 0, processed: 0, total: 0 });

    if (health && !health.browserReady) {
      toast.error(health.message);
      setIsScraping(false);
      return;
    }

    try {
      const response = await fetch("/api/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedSubCategory,
          province: selectedProvince,
          city: selectedCity,
          district: selectedDistrict || "",
          lat: coords?.lat,
          lng: coords?.lng,
          filters: {
            minRating,
            maxRating,
            minReviews,
            requireNoWebsite,
            requirePhone,
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.jobId) {
        setActiveJobId(result.jobId);
        toast.success("Background Scrape Job Started!");
      } else {
        toast.error(result.message || "Scraper failed to start");
        setIsScraping(false);
      }
    } catch (error: any) {
      toast.error("Failed to start scraper job.");
      setIsScraping(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      const res = await stopScraper();
      if (res.success) {
        toast.success(res.message);
        setIsScraping(false);
        setShowStopConfirm(false);
      }
    } catch (e) {
      toast.error("Failed to stop scraper");
    } finally {
      setIsStopping(false);
    }
  };

  const handleRepair = async () => {
    setRepairing(true);
    try {
      const res = await repairScraperPermissions();
      alert(res.message);
      // Re-trigger health check
      const h = await checkScraperHealth();
      setHealth(h);
    } catch (e) {
      alert("Repair failed");
    } finally {
      setRepairing(false);
    }
  };

  // Health Indicator Helper
  const renderHealthIndicator = () => {
    if (!health) return null;

    const isOk =
      health.binaryExists && health.isExecutable && health.browserReady;
    const needsPerms = health.binaryExists && !health.isExecutable;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center justify-between px-6 py-4 rounded-3xl border mb-8 ${
          isOk
            ? "bg-green-500/5 border-green-500/10 text-green-400"
            : needsPerms
              ? "bg-amber-500/5 border-amber-500/10 text-amber-400"
              : "bg-red-500/5 border-red-500/10 text-red-400"
        }`}
      >
        <div className="flex items-center gap-3">
          {isOk ? (
            <CheckCircle2 size={18} />
          ) : needsPerms ? (
            <AlertTriangle size={18} />
          ) : (
            <X size={18} />
          )}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
              System Readiness
            </p>
            <p className="text-sm font-bold">{health.message}</p>
          </div>
        </div>

        {needsPerms && (
          <button
            onClick={handleRepair}
            disabled={repairing}
            className="px-4 py-2 bg-amber-500 text-black text-[10px] font-black uppercase rounded-xl hover:bg-white transition-all disabled:opacity-50"
          >
            {repairing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              "Fix Permissions"
            )}
          </button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col justify-start min-h-screen space-y-6 md:space-y-8 pb-32 pt-6 md:pt-12 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tighter flex flex-wrap items-center gap-3 text-white">
            Scraper Hub
            <span className="text-[10px] md:text-xs bg-accent-gold/20 text-accent-gold px-3 py-1 rounded-full uppercase tracking-[0.2em]">
              DB-SYNC v5.0
            </span>
          </h1>
          <p className="text-sm md:text-base text-white/40 italic font-medium">
            Data flows directly to Supabase. Real-time lead ingestion.
          </p>
        </div>

        <div className="w-full lg:w-auto">
          <div className="glass px-4 md:px-6 py-3 rounded-2xl grid grid-cols-3 gap-2 md:flex md:items-center md:justify-start md:gap-6 border-white/5 bg-zinc-900/40">
            <div className="flex flex-col md:flex-row items-center md:items-center gap-1 md:gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40">Scraped</span>
              </div>
              <span className="font-mono text-zinc-100 font-bold text-xs md:text-sm">{stats.processed || 0}</span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center md:items-center gap-1 md:gap-2 border-x border-white/5 md:border-none">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40">Passed</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold text-xs md:text-sm">{stats.new || 0}</span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center md:items-center gap-1 md:gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/40">Rejected</span>
              </div>
              <span className="font-mono text-red-500 font-bold text-xs md:text-sm">{stats.rejected || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {renderHealthIndicator()}

      <div className="glass p-5 md:p-8 rounded-[32px] md:rounded-[40px] border-white/5 relative z-30 shadow-2xl bg-zinc-950/40">
        <form
          className="relative z-10 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 items-end gap-5 md:gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleScrape();
          }}
        >
          <div className="md:col-span-1 lg:col-span-1 space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-accent-gold flex items-center gap-2">
              <Building2 size={14} /> Bidang Utama
            </label>
            <SearchCombobox
              value={selectedMainCategory}
              onChange={setSelectedMainCategory}
              options={MAIN_CATEGORIES}
              placeholder="Bidang Usaha"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1 space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-accent-gold flex items-center gap-2">
              <Building2 size={14} /> Spesifik
            </label>
            <SearchCombobox
              value={selectedSubCategory}
              onChange={(val) => {
                // Anti-Redundancy Logic
                let foundInMain = "";
                for (const [main, subs] of Object.entries(CATEGORY_MAP)) {
                  if (subs.some((s) => s.toLowerCase() === val.toLowerCase())) {
                    foundInMain = main;
                    break;
                  }
                }

                if (foundInMain && foundInMain !== selectedMainCategory) {
                  toast.error(
                    `"${val}" sudah terdaftar di bidang "${foundInMain}". Memindahkan kategori...`,
                    {
                      icon: "ℹ️",
                      duration: 4000,
                    },
                  );
                  setSelectedMainCategory(foundInMain);
                }
                setSelectedSubCategory(val);
              }}
              options={CATEGORY_MAP[selectedMainCategory] || []}
              placeholder="Kategori Spesifik"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1 space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-accent-gold flex items-center gap-2">
              <Landmark size={14} /> Province
            </label>
            <SearchCombobox
              value={selectedProvince}
              onChange={setSelectedProvince}
              options={provinces}
              placeholder="Province"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1 space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-accent-gold flex items-center gap-2">
              <MapPin size={14} /> City
            </label>
            <SearchCombobox
              value={selectedCity}
              onChange={setSelectedCity}
              options={cities}
              placeholder="City"
            />
          </div>
          <div
            className={`md:col-span-1 lg:col-span-1 space-y-3 transition-all ${!selectedCity ? "opacity-30" : "opacity-100"}`}
          >
            <label className="text-xs font-bold uppercase tracking-widest text-accent-gold flex items-center gap-2">
              <Navigation size={14} /> District
            </label>
            <SearchCombobox
              value={selectedDistrict}
              onChange={setSelectedDistrict}
              options={fetchingDistricts ? [] : districts}
              placeholder={
                fetchingDistricts
                  ? "Fetching..."
                  : selectedCity
                    ? "All Districts"
                    : "Select City"
              }
            />
          </div>

          <div className="md:col-span-3 lg:col-span-4 mt-8 space-y-6">
            {/* Range Filters Group */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-zinc-900/40 rounded-[28px] border border-white/5 shadow-inner">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Star size={12} className="text-accent-gold" /> Min Rating
                </label>
                <div className="flex items-center gap-4 bg-zinc-950/50 p-3 rounded-2xl border border-white/5">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={minRating}
                    onChange={(e) => setMinRating(parseFloat(e.target.value))}
                    className="flex-1 accent-accent-gold cursor-pointer"
                  />
                  <span className="font-mono font-black text-accent-gold w-8 text-center bg-accent-gold/10 py-1 rounded-lg">
                    {minRating}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Star size={12} className="text-accent-gold" /> Max Rating
                </label>
                <div className="flex items-center gap-4 bg-zinc-950/50 p-3 rounded-2xl border border-white/5">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={maxRating}
                    onChange={(e) => setMaxRating(parseFloat(e.target.value))}
                    className="flex-1 accent-accent-gold cursor-pointer"
                  />
                  <span className="font-mono font-black text-accent-gold w-8 text-center bg-accent-gold/10 py-1 rounded-lg">
                    {maxRating}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <RefreshCcw size={12} className="text-accent-gold" /> Min Reviews
                </label>
                <div className="flex items-center gap-4 bg-zinc-950/50 p-3 rounded-2xl border border-white/5">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={minReviews}
                    onChange={(e) => setMinReviews(parseInt(e.target.value))}
                    className="flex-1 accent-accent-gold cursor-pointer"
                  />
                  <span className="font-mono font-black text-accent-gold w-8 text-center bg-accent-gold/10 py-1 rounded-lg">
                    {minReviews}
                  </span>
                </div>
              </div>
            </div>

            {/* Checkbox Filters Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => setRequireNoWebsite(!requireNoWebsite)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${requireNoWebsite ? "bg-accent-gold/10 border-accent-gold/30" : "bg-zinc-900/40 border-white/5 hover:border-white/20"}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${requireNoWebsite ? "bg-accent-gold text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]" : "bg-white/5 text-white/20 group-hover:text-white/40"}`}>
                    <Globe size={18} />
                  </div>
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${requireNoWebsite ? "text-accent-gold" : "text-white/40"}`}>
                      Exclusive Strategy
                    </p>
                    <p className="text-xs text-white font-bold tracking-tight">Focus on businesses with no website</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${requireNoWebsite ? "bg-accent-gold border-accent-gold" : "border-white/10 group-hover:border-white/30"}`}>
                  {requireNoWebsite && <Check size={12} className="text-black font-black" />}
                </div>
              </div>

              <div 
                onClick={() => setRequirePhone(!requirePhone)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${requirePhone ? "bg-accent-gold/10 border-accent-gold/30" : "bg-zinc-900/40 border-white/5 hover:border-white/20"}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${requirePhone ? "bg-accent-gold text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]" : "bg-white/5 text-white/20 group-hover:text-white/40"}`}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${requirePhone ? "text-accent-gold" : "text-white/40"}`}>
                      Direct Outreach
                    </p>
                    <p className="text-xs text-white font-bold tracking-tight">Ensure WhatsApp number exists</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${requirePhone ? "bg-accent-gold border-accent-gold" : "border-white/10 group-hover:border-white/30"}`}>
                  {requirePhone && <Check size={12} className="text-black font-black" />}
                </div>
              </div>
            </div>

            <div className="flex justify-center md:justify-end pt-4">
              <button
                type="submit"
                disabled={isScraping || (health && !health.browserReady)}
                className="h-[64px] w-full md:w-[280px] bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-accent-gold transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
              >
                {isScraping ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Sparkles size={20} />
                )}
                Launch Gravity Engine
              </button>
            </div>
          </div>
        </form>

        {/* Results will appear here */}
      </div>

      <div className="w-full">
        <div className="flex flex-col bg-white border border-zinc-200 rounded-[32px] overflow-hidden shadow-2xl relative min-h-[600px]">
          <div className="p-0 border-b border-zinc-100 flex flex-col bg-white/90 backdrop-blur-xl sticky top-0 z-20">
            <div className="p-6 md:p-8 flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-black flex items-center gap-2 text-zinc-900 tracking-tighter">
                {activeTab === 'results' ? 'Scrape Results' : 'AI Sandbox (Rejected)'}
                {(isScraping || (activeTab === 'sandbox' && sandboxResults.length > 0)) && (
                  <div className="relative flex items-center justify-center">
                    <Loader2 size={16} className="animate-spin text-accent-gold" />
                  </div>
                )}
              </h3>
              <div className="hidden sm:flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  {activeTab === 'results' ? 'Live Analytics Feed' : 'Rejected Analysis Log'}
                </span>
              </div>
            </div>

            {/* TAB SWITCHER */}
            <div className="flex px-6 md:px-8 pb-4 gap-8">
              <button 
                onClick={() => setActiveTab('results')}
                className={`relative pb-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'results' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                Passed Results
                {results.length > 0 && (
                  <span className="ml-2 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[8px]">{results.length}</span>
                )}
                {activeTab === 'results' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent-gold rounded-full" />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('sandbox')}
                className={`relative pb-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'sandbox' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                Sandbox
                {sandboxResults.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[8px]">{sandboxResults.length}</span>
                )}
                {activeTab === 'sandbox' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            <AnimatePresence mode="popLayout">
              {activeTab === 'results' ? (
                results.length > 0 ? (
                  results.map((lead) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={lead.id}
                      className="bg-zinc-50 border border-zinc-200 p-4 rounded-2xl space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm leading-tight">
                            {lead.name}
                          </h4>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            {lead.wa}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border bg-emerald-50 text-emerald-700 border-emerald-100">
                          LEAD
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[9px] font-bold uppercase text-zinc-500 bg-zinc-100/50 px-2 py-0.5 rounded-md border border-zinc-200/50">
                          {lead.category}
                        </span>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100/50 rounded-md">
                          <div className="w-1 h-1 rounded-full bg-emerald-500" />
                          <span className="text-[8px] font-black text-emerald-600 uppercase">
                            High Potential
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate">
                        {lead.address}
                      </p>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20 text-center text-zinc-300">
                    <p className="text-xs font-bold text-zinc-400">Waiting for live data...</p>
                  </div>
                )
              ) : (
                sandboxResults.length > 0 ? (
                  sandboxResults.map((lead) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={lead.id}
                      className="bg-red-50/30 border border-red-100 p-4 rounded-2xl space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-zinc-900 text-sm leading-tight">{lead.name}</h4>
                        <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border bg-red-50 text-red-700 border-red-100">
                          REJECTED
                        </span>
                      </div>
                      <p className="text-[10px] text-red-600 font-bold bg-red-100/50 p-2 rounded-lg italic">
                        "{lead.aiAnalysis?.reason || 'Criteria mismatch'}"
                      </p>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20 text-center text-zinc-300">
                    <p className="text-xs font-bold text-zinc-400">Sandbox is empty.</p>
                  </div>
                )
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto overflow-y-visible">
            <table className="w-full text-left border-collapse table-auto">
              <thead className="sticky top-0 z-20 bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-8">
                    Target
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                    Business Name
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                    WhatsApp
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                    Category
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                    Address
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest pr-8 text-right">
                    AI Insight
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <AnimatePresence mode="popLayout">
                  {activeTab === 'results' ? (
                    results.length > 0 ? (
                      results.map((lead) => (
                        <motion.tr
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          key={lead.id}
                          className="group hover:bg-zinc-50/80 transition-colors text-zinc-900 pointer-events-none"
                        >
                          <td className="px-6 py-4 pl-8">
                            <div className="flex items-center gap-3">
                              <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border bg-emerald-50 text-emerald-700 border-emerald-100">
                                LEAD
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div
                              className="font-bold text-sm text-zinc-900 truncate max-w-[180px]"
                              title={lead.name}
                            >
                              {lead.name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-[13px] text-zinc-600 font-semibold">
                              {lead.wa}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold uppercase text-zinc-500 bg-zinc-100/50 px-2 py-1 rounded-md border border-zinc-200/50">
                              {lead.category}
                            </span>
                          </td>
                          <td
                            className="px-6 py-4 text-xs text-zinc-500 max-w-[200px] truncate"
                            title={lead.address}
                          >
                            {lead.address}
                          </td>
                          <td className="px-6 py-4 pr-8 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {lead.status === "RAW" ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 rounded-lg">
                                  <Loader2
                                    size={10}
                                    className="animate-spin text-blue-500"
                                  />
                                  <span className="text-[9px] font-black text-blue-600 uppercase">
                                    AI Screening...
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-lg">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="text-[9px] font-black text-emerald-600 uppercase">
                                    {lead.priorityTier || "PASSED"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-32 text-center text-zinc-300"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center">
                              <Search
                                size={32}
                                className="text-zinc-200 animate-pulse"
                              />
                            </div>
                            <p className="text-sm font-bold text-zinc-400">
                              Waiting for live data transmission...
                            </p>
                          </div>
                        </td>
                      </tr>
                    )
                  ) : (
                    sandboxResults.length > 0 ? (
                      sandboxResults.map((lead) => (
                        <motion.tr
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          key={lead.id}
                          className="group hover:bg-red-50/30 transition-colors text-zinc-900"
                        >
                          <td className="px-6 py-4 pl-8">
                            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border bg-red-50 text-red-700 border-red-100">
                              REJECTED
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-sm text-zinc-900 truncate max-w-[180px]">{lead.name}</div>
                          </td>
                          <td className="px-6 py-4">
                             <span className="text-[10px] font-bold uppercase text-zinc-400">{lead.rating} ★</span>
                          </td>
                          <td className="px-6 py-4">
                             <span className="text-[10px] font-bold uppercase text-zinc-500 bg-zinc-100/50 px-2 py-1 rounded-md border border-zinc-200/50">
                                {lead.category}
                              </span>
                          </td>
                          <td colSpan={2} className="px-6 py-4 pr-8 text-right">
                            <p className="text-[10px] text-red-600 font-bold bg-red-100/30 p-2 rounded-lg italic inline-block max-w-[400px]">
                              "{lead.aiAnalysis?.reason || lead.reason || 'Criteria mismatch'}"
                            </p>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-32 text-center text-zinc-300">
                          <p className="text-sm font-bold text-zinc-400">Sandbox is empty. No leads rejected yet.</p>
                        </td>
                      </tr>
                    )
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
