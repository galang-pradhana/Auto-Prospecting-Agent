import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sanitizeWaNumber } from '@/lib/utils';
import { logActivity } from '@/lib/actions/lead';

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, category, wa, city, province, address, website, rating } = body;

        if (!name) {
            return NextResponse.json({ error: 'Nama bisnis wajib diisi' }, { status: 400 });
        }
        if (!category) {
            return NextResponse.json({ error: 'Kategori wajib diisi' }, { status: 400 });
        }

        // Handle WA Number
        let finalWa: string | null = null;
        if (wa && typeof wa === 'string' && wa.trim() !== '') {
            const sanitized = sanitizeWaNumber(wa);
            if (sanitized) {
                // Cek duplikat
                const existing = await prisma.lead.findUnique({
                    where: { wa: sanitized }
                });
                if (existing) {
                    return NextResponse.json(
                        { error: 'Nomor WA ini sudah terdaftar di database.' },
                        { status: 409 }
                    );
                }
                finalWa = sanitized;
            }
        }

        const newLead = await prisma.lead.create({
            data: {
                userId: session.userId,
                name: name.trim(),
                isPro: false,
                wa: finalWa,
                category: category.trim(),
                province: province ? province.trim() : '',
                city: city ? city.trim() : '',
                address: address ? address.trim() : 'Manual Entry',
                website: website ? website.trim() : 'N/A',
                rating: rating ? parseFloat(rating) : 0,
                status: 'FRESH',
                brandData: {
                    sourceType: 'MANUAL',
                }
            }
        });

        await logActivity(newLead.id, 'CREATED', 'Lead manually added');

        return NextResponse.json({ success: true, lead: newLead });

    } catch (error: any) {
        console.error('[Manual Save Route Error]:', error.message);
        if (error.code === 'P2002') {
             return NextResponse.json({ error: 'Data duplikat terdeteksi (kemungkinan nomor WA).' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
