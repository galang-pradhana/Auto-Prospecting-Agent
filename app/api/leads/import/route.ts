import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';


export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leads } = body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'Leads data is required and must be an array' }, { status: 400 });
    }

    // Prepare data for insertion
    const dataToInsert = leads.map((row: any) => {
      // Mapping raw CSV/JSON to Prisma Lead fields
      return {
        name: row.name || 'Unnamed Lead',
        wa: row.wa ? String(row.wa).replace(/[^0-9]/g, '') : null,
        category: row.category || 'Uncategorized',
        province: row.province || '',
        city: row.city || '',
        address: row.address || '',
        status: row.status ? row.status.toUpperCase() : 'FRESH',
        outreachDraft: row.outreachDraft || null,
        htmlCode: row.htmlCode || null,
        website: row.website || 'N/A',
        ig: row.ig || null,
        b2bType: row.b2bType || null,
        b2bNotes: row.b2bNotes || null,
        prospectNotes: row.prospectNotes || null,
        userId: session.userId,
        slug: row.slug || (slugify(row.name || 'unnamed') + '-' + Math.random().toString(36).substring(2, 7)),
      };
    });

    // Use transaction to insert or update all leads
    let count = 0;
    await prisma.$transaction(async (tx) => {
      for (const data of dataToInsert) {
        if (data.wa) {
          // If wa is present, try to upsert to update existing data
          await tx.lead.upsert({
            where: { wa: data.wa },
            update: {
              ...data,
              // don't overwrite slug if it already exists, unless you want to
              slug: undefined // keep existing slug on update
            },
            create: data,
          });
        } else {
          // If no wa, just create
          await tx.lead.create({
            data: data
          });
        }
        count++;
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully imported/updated ${count} leads`,
      count: count
    });

  } catch (error: any) {
    console.error("[API /leads/import] Error:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
