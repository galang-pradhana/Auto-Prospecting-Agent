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
        const { name, ig, category, bio, followers, location, contact, website } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Handle WA Number
        let finalWa: string | null = null;
        if (contact && typeof contact === 'string' && contact.trim() !== '') {
            const sanitized = sanitizeWaNumber(contact);
            if (sanitized) {
                // Cek apakah nomor WA sudah ada di DB
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

        // Create the Lead
        const newLead = await prisma.lead.create({
            data: {
                userId: session.userId,
                name: name.trim(),
                isPro: true, // Asumsi leads dari IG diproses dengan model premium
                wa: finalWa,
                ig: ig ? ig.trim() : null,
                category: category ? category.trim() : 'Uncategorized',
                province: location ? location.trim() : '',
                city: location ? location.trim() : '', // Simpan di dua tempat sementara
                address: location ? location.trim() : 'From Instagram',
                website: website ? website.trim() : 'N/A',
                status: 'FRESH',
                brandData: {
                    sourceType: 'INSTAGRAM',
                    igBio: bio,
                    igFollowers: followers
                }
            }
        });

        // Log the activity
        await logActivity(newLead.id, 'CREATED', 'Lead manually created from Instagram extraction');

        return NextResponse.json({ success: true, lead: newLead });

    } catch (error: any) {
        console.error('[IG Save Route Error]:', error.message);
        
        // Handle Prisma unique constraint error just in case
        if (error.code === 'P2002') {
             return NextResponse.json({ error: 'Data duplikat terdeteksi (kemungkinan nomor WA atau ID).' }, { status: 409 });
        }

        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
