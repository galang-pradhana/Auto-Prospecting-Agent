/**
 * SYNCHRONOUS UTILITIES
 * These functions are purely logic-based and do not use 'use server'.
 */

export function isMobileNumber(phone: string): boolean {
    if (!phone || phone === 'N/A') return false;
    // Buang spasi, strip, tanda kurung, dan plus
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    
    // Harus diawali dengan 628 atau 08, panjang total antara 10 sampai 14 karakter (termasuk kode negara 62)
    const mobileRegex = /^(628|08)[1-9][0-9]{6,11}$/;
    return mobileRegex.test(cleanPhone);
}

export function isValidWhatsApp(phone: string): boolean {
    return isMobileNumber(phone);
}

export function sanitizeWaNumber(phone: string): string | null {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, ''); // Buang semua selain angka
    
    // Konversi awalan 0 menjadi 62
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }
    
    // Pastikan awalan sekarang adalah 628 (karena WA selalu butuh kode negara)
    if (cleaned.startsWith('628') && cleaned.length >= 10 && cleaned.length <= 15) {
        return cleaned;
    }
    
    return null; // Return null jika bukan nomor mobile/seluler
}

export function isRecentLead(reviews: any[]): boolean {
    if (!reviews || reviews.length === 0) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const twentyFourMonthsAgo = new Date(today);
    twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);

    const reviewDates = reviews
        .map(r => r.When ? new Date(r.When) : null)
        .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

    if (reviewDates.length === 0) return false;

    const latestReviewDate = new Date(Math.max(...reviewDates.map(d => d.getTime())));
    latestReviewDate.setHours(0, 0, 0, 0);
    
    return latestReviewDate >= twentyFourMonthsAgo;
}

export function cleanAIResponse(text: string): string {
    let raw = text.replace(/```json|```/g, "").trim();
    return raw.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, " ");
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius Bumi (KM)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

/**
 * SERALIZATION UTILITIES
 * Converts Prisma Date objects to ISO strings for safe transfer to Client Components.
 */

export function serializeLead(lead: any) {
    if (!lead) return null;
    return {
        ...lead,
        createdAt: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt,
        updatedAt: lead.updatedAt instanceof Date ? lead.updatedAt.toISOString() : lead.updatedAt,
        lastContactAt: lead.lastContactAt instanceof Date ? lead.lastContactAt.toISOString() : lead.lastContactAt,
        nextFollowupAt: lead.nextFollowupAt instanceof Date ? lead.nextFollowupAt.toISOString() : (lead.nextFollowupAt || null),
        linkClickedAt: lead.linkClickedAt instanceof Date ? lead.linkClickedAt.toISOString() : (lead.linkClickedAt || null),
        qualifiedAt: lead.qualifiedAt instanceof Date ? lead.qualifiedAt.toISOString() : (lead.qualifiedAt || null),
        brandDna: lead.brandDna ? {
            ...lead.brandDna,
            submittedAt: lead.brandDna.submittedAt instanceof Date ? lead.brandDna.submittedAt.toISOString() : (lead.brandDna.submittedAt || null),
            viewedAt: lead.brandDna.viewedAt instanceof Date ? lead.brandDna.viewedAt.toISOString() : (lead.brandDna.viewedAt || null),
            createdAt: lead.brandDna.createdAt instanceof Date ? lead.brandDna.createdAt.toISOString() : lead.brandDna.createdAt,
            updatedAt: lead.brandDna.updatedAt instanceof Date ? lead.brandDna.updatedAt.toISOString() : lead.brandDna.updatedAt,
        } : null,
    };
}

export function serializeLeadSandbox(lead: any) {
    if (!lead) return null;
    return {
        ...lead,
        createdAt: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt,
        updatedAt: lead.updatedAt instanceof Date ? lead.updatedAt.toISOString() : (lead.updatedAt || null),
    };
}

/**
 * ANTI-BAN STRATEGY UTILITIES
 */

export function processSpintax(text: string): string {
    if (!text) return text;
    // Replace patterns like {option1|option2|option3}
    return text.replace(/\{([^{}]+)\}/g, (match, p1) => {
        const options = p1.split('|');
        const randomIndex = Math.floor(Math.random() * options.length);
        return options[randomIndex];
    });
}

export function generateRandomBait(leadName: string, leadCity: string, leadCategory: string = "", leadRating: number = 0): string {
    const templates = [
        "[1] — Social Proof + Pertanyaan\nHalo Pak/Bu [name] 👋\n\nKami lagi ngumpulin data bisnis [category] terbaik di [city] — dan \n[name] masuk list kami dengan [reviewRating]⭐ dari Google.\n\nBoleh kami tunjukin sesuatu yang mungkin menarik buat kalian? \nCuma butuh 1 menit kok 🙏",
        "[2] — Curiosity Gap\nHalo [name] 👋\n\nIseng-iseng kami cek bisnis [category] di [city] — \ndan [name] lumayan stand out dibanding yang lain.\n\nAda satu hal kecil yang kalau dibenerin, bisa bikin makin banyak \norang nemuin [name] pas lagi nyari [category]. \n\nBoleh kami share? 😊",
        "[3] — Pujian Spesifik + Hook\nHalo [name] 🙌\n\nRating [reviewRating]⭐ di Google itu bukan hal yang gampang — serius, \nkebanyakan bisnis [category] di [city] ada di bawah itu.\n\nKami punya ide buat bantu kalian konversi reputasi bagus itu jadi \nlebih banyak pelanggan. Boleh kami cerita sebentar? 🙏",
        "[4] — Preview Gratis\nHalo Pak/Bu [name] 👋\n\nKami udah buatin sesuatu buat [name] — semacam konsep digital \nyang cocok sama reputasi kalian di Google.\n\nBoleh kami kirimkan? Gratis, dan kalian bebas mau dipakai atau tidak 😊",
        "[5] — Data-driven\nHalo [name] 👋\n\nRating [reviewRating]⭐ kalian di Google itu bagus banget untuk \nukuran [category] di [city] — tapi sayang, rating sebagus itu \nbelum \"bekerja\" secara maksimal buat narik pelanggan baru.\n\nBoleh kami tunjukin kenapa? 🙏",
        "[6] — Relevan & Personal\nHalo [name] 🙏\n\nKami spesialis bantu UMKM [category] di [city] tampil lebih profesional \nsecara online. Baru aja selesai projek dengan bisnis mirip kalian —\nhasilnya cukup memuaskan.\n\nBoleh kami cerita sedikit? Mungkin relevan buat [name] juga 😊",
        "[7] — Empati Pemilik Bisnis\nHalo [name] 👋\n\nPunya bisnis [category] itu ga gampang — apalagi sambil mikirin \ngimana caranya terus dapet pelanggan baru.\n\nKami ada satu ide simpel yang mungkin bisa bantu [name]. \nBoleh kami cerita sebentar? 🙏"
    ];
    
    const randomIndex = Math.floor(Math.random() * templates.length);
    let template = templates[randomIndex];
    
    // Remove the [N] — Title prefix if you want only the message, 
    // but looking at the user prompt, they might want the title or just the message.
    // Usually bait message shouldn't have the title. I will strip it.
    template = template.replace(/^\[\d\] — .+\n/, "");

    const cityText = leadCity && leadCity.trim() !== '' ? leadCity : "sini";
    const nameText = leadName || "kakak";
    const categoryText = leadCategory || "bisnis";
    const ratingText = leadRating > 0 ? leadRating.toString() : "bagus";
    
    return processSpintax(template
        .replace(/\[name\]/g, nameText)
        .replace(/\[city\]/g, cityText)
        .replace(/\[category\]/g, categoryText)
        .replace(/\[reviewRating\]/g, ratingText));
}

