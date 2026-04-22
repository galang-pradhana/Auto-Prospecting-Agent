// lib/b2b-ecosystem.ts
// Static B2B Ecosystem Map — Phase 1
// Maps each business category to its DEMAND (what it needs) and SUPPLY (who needs it)

export interface B2BConnection {
    category: string;       // The connected category name (for DB search)
    label: string;          // Display label
    tier: 1 | 2 | 3;       // 1=Direct, 2=Soft, 3=Chain
    strength: 1 | 2 | 3 | 4 | 5; // Connection strength
    description: string;    // Why they're connected
    scrapeKeyword: string;  // Keyword for Google Maps scraping if no DB leads
}

export interface B2BEcosystemEntry {
    demand: B2BConnection[];  // What this category NEEDS from others
    supply: B2BConnection[];  // Who NEEDS this category's products/services
}

export const B2B_ECOSYSTEM: Record<string, B2BEcosystemEntry> = {
    "Laundry": {
        demand: [
            { category: "Supplier Deterjen", label: "Supplier Deterjen & Chemical", tier: 1, strength: 5, description: "Bahan kimia utama operasional laundry", scrapeKeyword: "distributor deterjen laundry" },
            { category: "Supplier Plastik", label: "Supplier Plastik & Hanger", tier: 1, strength: 4, description: "Kemasan dan alat gantungan pakaian", scrapeKeyword: "supplier plastik kemasan laundry" },
            { category: "Supplier Parfum", label: "Supplier Parfum Laundry", tier: 1, strength: 4, description: "Pewangi pakaian setelah cuci", scrapeKeyword: "supplier parfum laundry" },
            { category: "Service Mesin Cuci", label: "Jasa Service Mesin Cuci", tier: 1, strength: 3, description: "Maintenance mesin cuci komersial", scrapeKeyword: "servis mesin cuci komersial" },
            { category: "Jasa Kurir", label: "Jasa Antar Jemput", tier: 2, strength: 2, description: "Pickup & delivery pakaian ke pelanggan", scrapeKeyword: "jasa kurir pengiriman lokal" },
        ],
        supply: [
            { category: "Hotel", label: "Hotel & Penginapan", tier: 1, strength: 5, description: "Kebutuhan laundry linen (handuk, sprei, seragam) dalam jumlah besar", scrapeKeyword: "hotel penginapan" },
            { category: "Kos", label: "Kos-kosan & Apartemen", tier: 1, strength: 4, description: "Penghuni kos yang tidak punya mesin cuci", scrapeKeyword: "kost apartemen" },
            { category: "Klinik", label: "Klinik & Rumah Sakit", tier: 1, strength: 4, description: "Laundry linen medis (baju pasien, laken, baju dokter)", scrapeKeyword: "klinik rumah sakit" },
            { category: "Salon", label: "Salon & Barbershop", tier: 2, strength: 3, description: "Handuk salon yang butuh dicuci rutin", scrapeKeyword: "salon barbershop" },
            { category: "Restoran", label: "Restoran & Catering", tier: 2, strength: 3, description: "Seragam karyawan dan taplak meja", scrapeKeyword: "restoran catering" },
        ],
    },

    "Restoran": {
        demand: [
            { category: "Supplier Bahan Makanan", label: "Supplier Bahan Makanan", tier: 1, strength: 5, description: "Sayur, daging, bumbu, bahan pokok masak", scrapeKeyword: "distributor bahan makanan sayur daging" },
            { category: "Supplier Kemasan", label: "Supplier Kemasan Makanan", tier: 1, strength: 4, description: "Box, kantong, wadah untuk take away", scrapeKeyword: "supplier kemasan makanan box plastik" },
            { category: "Jasa Kurir", label: "Jasa Pengiriman Makanan", tier: 1, strength: 3, description: "Delivery ke pelanggan", scrapeKeyword: "jasa kurir pengiriman" },
            { category: "Laundry", label: "Laundry Linen", tier: 2, strength: 2, description: "Seragam karyawan dan taplak meja", scrapeKeyword: "laundry kiloan" },
        ],
        supply: [
            { category: "Kantor", label: "Perkantoran (Katering Kantor)", tier: 1, strength: 5, description: "MoU supply makan siang karyawan kantor", scrapeKeyword: "gedung perkantoran" },
            { category: "Event Organizer", label: "Event Organizer", tier: 1, strength: 4, description: "Catering untuk event dan pesta", scrapeKeyword: "event organizer" },
            { category: "Sekolah", label: "Sekolah & Kampus", tier: 2, strength: 3, description: "Kantin atau katering sekolah", scrapeKeyword: "sekolah sma smp" },
        ],
    },

    "Cafe": {
        demand: [
            { category: "Supplier Kopi", label: "Roastery & Supplier Kopi", tier: 1, strength: 5, description: "Biji kopi, powder, sirup kopi", scrapeKeyword: "roastery supplier kopi biji" },
            { category: "Supplier Susu", label: "Distributor Susu & Dairy", tier: 1, strength: 4, description: "Susu segar, krim, oat milk", scrapeKeyword: "distributor susu segar" },
            { category: "Supplier Kemasan", label: "Supplier Cup & Kemasan", tier: 1, strength: 4, description: "Gelas plastik, tutup, sedotan, paper bag", scrapeKeyword: "supplier cup gelas plastik minuman" },
            { category: "Fotografer", label: "Fotografer Produk", tier: 2, strength: 2, description: "Foto menu dan produk untuk promosi", scrapeKeyword: "fotografer produk food" },
        ],
        supply: [
            { category: "Kantor", label: "Perkantoran (Coffee Break)", tier: 1, strength: 4, description: "Supply kopi untuk meeting dan coffee break kantor", scrapeKeyword: "gedung kantor perkantoran" },
            { category: "Co-working Space", label: "Co-working Space", tier: 2, strength: 3, description: "Kolaborasi sebagai coffee partner", scrapeKeyword: "coworking space" },
        ],
    },

    "Bengkel": {
        demand: [
            { category: "Supplier Spare Part", label: "Supplier Spare Part Kendaraan", tier: 1, strength: 5, description: "Onderdil motor dan mobil", scrapeKeyword: "distributor spare part otomotif" },
            { category: "Supplier Oli", label: "Distributor Oli & Pelumas", tier: 1, strength: 5, description: "Oli mesin berbagai merek", scrapeKeyword: "distributor oli pelumas" },
            { category: "Supplier Ban", label: "Distributor Ban", tier: 1, strength: 3, description: "Ban motor dan mobil berbagai ukuran", scrapeKeyword: "distributor ban motor mobil" },
        ],
        supply: [
            { category: "Fleet", label: "Perusahaan dengan Armada", tier: 1, strength: 5, description: "Perusahaan ekspedisi, rental, bus, taksi yang butuh bengkel rutin", scrapeKeyword: "perusahaan ekspedisi rental mobil" },
            { category: "Dealer Mobil", label: "Dealer & Showroom Kendaraan", tier: 1, strength: 4, description: "Servis kendaraan ex-stok dealer", scrapeKeyword: "dealer mobil motor showroom" },
            { category: "Rental Mobil", label: "Rental Mobil & Motor", tier: 1, strength: 4, description: "Perawatan armada rental secara rutin", scrapeKeyword: "rental mobil motor" },
        ],
    },

    "Percetakan": {
        demand: [
            { category: "Supplier Kertas", label: "Supplier Kertas & Media Cetak", tier: 1, strength: 5, description: "Kertas berbagai gramasi, banner, stiker", scrapeKeyword: "supplier kertas media cetak" },
            { category: "Supplier Tinta", label: "Distributor Tinta Printing", tier: 1, strength: 5, description: "Tinta inkjet, offset, solvent", scrapeKeyword: "distributor tinta printer cetak" },
            { category: "Desainer Grafis", label: "Freelance Desainer Grafis", tier: 1, strength: 3, description: "Desain artwork untuk pelanggan percetakan", scrapeKeyword: "desainer grafis freelance" },
        ],
        supply: [
            { category: "Event Organizer", label: "Event Organizer", tier: 1, strength: 5, description: "Banner, backdrop, spanduk, undangan event", scrapeKeyword: "event organizer" },
            { category: "Restoran", label: "Restoran & Cafe", tier: 1, strength: 4, description: "Print menu, kemasan, flyer promosi", scrapeKeyword: "restoran cafe" },
            { category: "Hotel", label: "Hotel & Penginapan", tier: 2, strength: 3, description: "Kop surat, kartu nama, signage, brosur", scrapeKeyword: "hotel penginapan" },
            { category: "Toko", label: "UMKM & Toko Ritel", tier: 1, strength: 4, description: "Packaging, label produk, stiker", scrapeKeyword: "toko umkm retail" },
        ],
    },

    "Salon": {
        demand: [
            { category: "Supplier Produk Rambut", label: "Distributor Produk Rambut", tier: 1, strength: 5, description: "Shampo, kondisioner, cat rambut, pomade", scrapeKeyword: "distributor produk perawatan rambut salon" },
            { category: "Supplier Alat Salon", label: "Supplier Alat Salon", tier: 1, strength: 4, description: "Gunting, hair dryer, clipper, catokan", scrapeKeyword: "supplier alat salon kecantikan" },
            { category: "Laundry", label: "Laundry Handuk", tier: 2, strength: 3, description: "Laundry handuk salon secara rutin", scrapeKeyword: "laundry kiloan" },
        ],
        supply: [
            { category: "Wedding", label: "Wedding Organizer", tier: 1, strength: 5, description: "Make up dan hair do pengantin", scrapeKeyword: "wedding organizer" },
            { category: "Hotel", label: "Hotel & Resor", tier: 2, strength: 3, description: "In-house salon service untuk tamu hotel", scrapeKeyword: "hotel resort bintang" },
            { category: "Fotografer", label: "Studio Foto & Fotografer", tier: 2, strength: 2, description: "Make up talent untuk pemotretan", scrapeKeyword: "studio foto fotografer" },
        ],
    },

    "Konstruksi": {
        demand: [
            { category: "Supplier Material", label: "Supplier Material Bangunan", tier: 1, strength: 5, description: "Semen, besi, bata, pasir, kayu", scrapeKeyword: "toko material bangunan" },
            { category: "Supplier Alat Berat", label: "Rental Alat Berat", tier: 1, strength: 4, description: "Excavator, crane, molen sewa", scrapeKeyword: "rental alat berat konstruksi" },
            { category: "Desainer Interior", label: "Arsitek & Desainer Interior", tier: 2, strength: 3, description: "Desain dan gambar teknis proyek", scrapeKeyword: "arsitek desainer interior" },
        ],
        supply: [
            { category: "Properti", label: "Developer Properti", tier: 1, strength: 5, description: "Kontraktor untuk proyek perumahan dan komersial", scrapeKeyword: "developer properti perumahan" },
            { category: "Hotel", label: "Hotel & Penginapan", tier: 2, strength: 3, description: "Renovasi dan pembangunan properti hotel", scrapeKeyword: "hotel penginapan" },
        ],
    },

    "Pet Shop": {
        demand: [
            { category: "Supplier Pakan Hewan", label: "Distributor Pakan Hewan", tier: 1, strength: 5, description: "Makanan kucing, anjing, burung, ikan", scrapeKeyword: "distributor pakan hewan peliharaan" },
            { category: "Supplier Obat Hewan", label: "Distributor Obat & Vitamin Hewan", tier: 1, strength: 4, description: "Vaksin, vitamin, obat cacing hewan", scrapeKeyword: "distributor obat hewan veteriner" },
            { category: "Supplier Aksesoris Hewan", label: "Supplier Aksesoris Hewan", tier: 2, strength: 3, description: "Kandang, mainan, pakaian hewan", scrapeKeyword: "supplier aksesoris pet shop" },
        ],
        supply: [
            { category: "Klinik Hewan", label: "Klinik Veteriner", tier: 1, strength: 4, description: "Referral produk dan jasa grooming dari klinik hewan", scrapeKeyword: "klinik hewan dokter hewan" },
            { category: "Komunitas Pecinta Hewan", label: "Komunitas & Breeder", tier: 2, strength: 2, description: "Pasokan hewan peliharaan dari breeder", scrapeKeyword: "breeder kucing anjing" },
        ],
    },
    "Pertanian": {
        demand: [
            { category: "Supplier Pupuk", label: "Distributor Pupuk & Pestisida", tier: 1, strength: 5, description: "Pupuk organik, kimia, dan pestisida untuk produksi", scrapeKeyword: "distributor pupuk pestisida pertanian" },
            { category: "Supplier Bibit", label: "Supplier Bibit & Benih", tier: 1, strength: 5, description: "Bibit tanaman, benih unggul", scrapeKeyword: "supplier bibit benih tanaman" },
            { category: "Rental Alat Pertanian", label: "Rental Alat & Mesin Pertanian", tier: 1, strength: 4, description: "Traktor, pompa air, sprayer sewa", scrapeKeyword: "rental traktor mesin pertanian" },
            { category: "Jasa Kurir", label: "Jasa Logistik & Pengiriman", tier: 2, strength: 3, description: "Distribusi hasil panen ke pasar atau pembeli", scrapeKeyword: "jasa kurir logistik pengiriman" },
        ],
        supply: [
            { category: "Pasar Tradisional", label: "Pasar Tradisional & Grosir", tier: 1, strength: 5, description: "Hasil panen dijual ke pasar grosir sayur dan buah", scrapeKeyword: "pasar tradisional grosir sayur" },
            { category: "Restoran", label: "Restoran & Catering", tier: 1, strength: 5, description: "Supplai bahan baku sayur, buah, dan rempah ke dapur restoran", scrapeKeyword: "restoran catering" },
            { category: "Supermarket", label: "Supermarket & Minimarket", tier: 1, strength: 4, description: "Distribusi produk segar ke ritel modern", scrapeKeyword: "supermarket minimarket" },
            { category: "Hotel", label: "Hotel & Resor", tier: 2, strength: 3, description: "Supplai bahan makanan segar ke dapur hotel", scrapeKeyword: "hotel resort bintang" },
        ],
    },

    "Perikanan": {
        demand: [
            { category: "Supplier Pakan Ikan", label: "Distributor Pakan & Pelet Ikan", tier: 1, strength: 5, description: "Pakan ikan budidaya berbagai ukuran dan jenis", scrapeKeyword: "distributor pakan pelet ikan budidaya" },
            { category: "Supplier Bibit Ikan", label: "Supplier Benih & Bibit Ikan", tier: 1, strength: 5, description: "Benih ikan lele, nila, bandeng, udang", scrapeKeyword: "supplier benih bibit ikan lele nila" },
            { category: "Supplier Obat Ikan", label: "Distributor Obat & Vitamin Ikan", tier: 1, strength: 4, description: "Vitamin, probiotik, dan obat ikan budidaya", scrapeKeyword: "distributor obat vitamin ikan tambak" },
            { category: "Supplier Kolam", label: "Supplier Terpal & Peralatan Kolam", tier: 2, strength: 3, description: "Terpal, aerator, pompa air kolam", scrapeKeyword: "supplier terpal aerator kolam ikan" },
        ],
        supply: [
            { category: "Restoran", label: "Restoran & Rumah Makan Seafood", tier: 1, strength: 5, description: "Supplai ikan dan seafood segar ke restoran", scrapeKeyword: "restoran seafood ikan bakar" },
            { category: "Pasar Ikan", label: "Pasar Ikan & Pengepul", tier: 1, strength: 5, description: "Penjualan hasil tangkap ke pengepul dan pasar ikan", scrapeKeyword: "pasar ikan pengepul" },
            { category: "Cold Storage", label: "Cold Storage & Pengolahan Ikan", tier: 1, strength: 4, description: "Penyimpanan dan pengolahan ikan menjadi produk beku atau olahan", scrapeKeyword: "cold storage pengolahan ikan" },
            { category: "Supermarket", label: "Supermarket & Ritel Modern", tier: 2, strength: 3, description: "Distribusi produk seafood olahan ke supermarket", scrapeKeyword: "supermarket hypermarket" },
        ],
    },

    "Peternakan": {
        demand: [
            { category: "Supplier Pakan Ternak", label: "Distributor Pakan Ternak", tier: 1, strength: 5, description: "Konsentrat, dedak, jagung, ransum pakan sapi/ayam/kambing", scrapeKeyword: "distributor pakan ternak konsentrat" },
            { category: "Supplier Bibit Ternak", label: "Supplier Bibit & DOC", tier: 1, strength: 5, description: "DOC (Day-Old Chick) ayam, sapi bakalan, bibit kambing", scrapeKeyword: "supplier doc ayam bibit sapi kambing" },
            { category: "Supplier Obat Hewan", label: "Distributor Obat & Vaksin Ternak", tier: 1, strength: 4, description: "Vaksin, antibiotik, vitamin untuk ternak", scrapeKeyword: "distributor obat vaksin ternak" },
            { category: "Rental Alat Berat", label: "Jasa Transportasi Ternak", tier: 2, strength: 3, description: "Pengangkutan ternak hidup antar daerah", scrapeKeyword: "jasa transportasi ternak angkutan" },
        ],
        supply: [
            { category: "RPH", label: "RPH (Rumah Potong Hewan)", tier: 1, strength: 5, description: "Penjualan ternak siap potong ke RPH", scrapeKeyword: "rumah potong hewan RPH" },
            { category: "Restoran", label: "Restoran & Warung Makan", tier: 1, strength: 5, description: "Supplai ayam, daging sapi, kambing ke dapur restoran", scrapeKeyword: "restoran warung makan" },
            { category: "Pasar Tradisional", label: "Pasar & Pengepul Daging", tier: 1, strength: 5, description: "Penjualan ternak dan hasil ternak ke pasar tradisional", scrapeKeyword: "pasar daging pengepul" },
            { category: "Industri Olahan", label: "Industri Pengolahan Daging", tier: 2, strength: 3, description: "Supplai bahan baku ke pabrik sosis, bakso, atau nugget", scrapeKeyword: "pabrik pengolahan daging sosis bakso" },
        ],
    },

};

export const B2B_CATEGORIES = Object.keys(B2B_ECOSYSTEM);

// Helper: Get location tier between two cities/provinces
export function getLocationTier(city1: string, city2: string, province1: string, province2: string): 1 | 2 | 3 {
    const JAVA_PROVINCES = ['Jawa Timur', 'Jawa Tengah', 'Jawa Barat', 'DKI Jakarta', 'Banten', 'DI Yogyakarta', 'East Java', 'Central Java', 'West Java', 'Jakarta'];
    
    if (city1.toLowerCase() === city2.toLowerCase()) return 1;
    
    const p1IsJava = JAVA_PROVINCES.some(p => province1.toLowerCase().includes(p.toLowerCase()));
    const p2IsJava = JAVA_PROVINCES.some(p => province2.toLowerCase().includes(p.toLowerCase()));
    
    if (p1IsJava !== p2IsJava) return 3; // Cross-island
    return 2; // Same island, different city
}
