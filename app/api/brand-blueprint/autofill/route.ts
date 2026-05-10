import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callAI } from '@/lib/actions/ai';

export async function POST(req: NextRequest) {
    try {
        const { leadId, currentAnswers } = await req.json();
        if (!leadId) return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { brandDna: true }
        });

        if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

        const gmapsData = {
            name: lead.name,
            category: lead.category,
            rating: lead.rating,
            phone: lead.phone,
            address: lead.address,
            city: lead.city,
            district: lead.district
        };

        const prompt = `
        Kamu adalah Brand Strategist AI Elite. Tugasmu adalah melengkapi data "Brand DNA" untuk bisnis lokal Indonesia agar mereka bisa memiliki website yang sangat personal dan high-converting.

        DATA BISNIS (GMaps & Internal):
        Nama: ${lead.name}
        Kategori: ${lead.category}
        Lokasi: ${lead.address}, ${lead.city}, ${lead.district}
        Rating: ${lead.rating}
        
        DATA YANG SUDAH TERISI:
        ${JSON.stringify(currentAnswers || {}, null, 2)}

        TUGAS:
        Prediksikan jawaban untuk field yang masih kosong atau belum optimal. Gunakan asumsi cerdas berdasarkan kategori industri "${lead.category}" dan lokasi di "${lead.city}".

        FIELD YANG HARUS DIISI (Gunakan format JSON):
        {
          "tagline": "Kalimat pendek yang catchy dan menjual",
          "services_main": "Daftar layanan utama (pisahkan koma)",
          "founding_story": "Cerita singkat kenapa bisnis ini berdiri (asumsi cerdas)",
          "usp": "Keunggulan utama dibanding kompetitor",
          "price_positioning": "Pilih salah satu: 'Terjangkau / Ramah kantong', 'Mid-range / Standar pasar', 'Premium / Di atas rata-rata', 'Bervariasi sesuai pesanan'",
          "best_moment": "Momen emosional terbaik (misal: saat pelanggan puas)",
          "target_customer": "Siapa pelanggan idealnya?",
          "visual_mood": "Pilih beberapa (pisahkan koma): 'Hangat & natural', 'Bersih & minimalis', 'Elegan & premium', 'Ceria & berwarna', 'Tradisional / Lokal', 'Modern & profesional'",
          "color_vibe": "Warna brand yang cocok (misal: 'Hijau botol dan Emas')",
          "website_goal": "Pilih beberapa (pisahkan koma): 'Tampil profesional ke pelanggan', 'Mudah dihubungi via WA', 'Tampilkan produk / portofolio', 'Muncul di pencarian Google', 'Ganti brosur / kartu nama', 'Tampilkan ulasan / testimoni'",
          "brand_words_must": "3 kata yang mewakili brand",
          "one_sentence": "Deskripsi bisnis dalam 1 kalimat"
        }

        PANDUAN:
        1. Gunakan Bahasa Indonesia yang natural, hangat, dan profesional.
        2. Sesuaikan dengan budaya lokal ${lead.city || 'Indonesia'}.
        3. Pastikan "USP" menonjolkan sisi manusiawi bisnis lokal.
        4. Output HARUS murni JSON.
        `;

        const responseRaw = await callAI(prompt, 'fast');
        if (!responseRaw) throw new Error("AI failed to generate autofill");

        const autofillData = JSON.parse(responseRaw.replace(/```json/g, '').replace(/```/g, '').trim());

        // Merge with current answers but only fill if empty or missing
        const mergedAnswers = { ...(currentAnswers || {}) };
        
        for (const [key, val] of Object.entries(autofillData)) {
            if (!mergedAnswers[key] || !mergedAnswers[key].value) {
                mergedAnswers[key] = { value: val, source: 'ai' };
            }
        }

        return NextResponse.json({ success: true, answers: mergedAnswers });

    } catch (error: any) {
        console.error("[Autofill API Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
