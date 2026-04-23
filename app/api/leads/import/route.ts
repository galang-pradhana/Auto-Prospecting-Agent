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

    // Use transaction to insert all leads
    const result = await prisma.lead.createMany({
      data: dataToInsert,
      skipDuplicates: true, // Prevents crashing if there are unique constraint violations (e.g., duplicate WA if unique)
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully imported ${result.count} leads`,
      count: result.count
    });

  } catch (error: any) {
    console.error("[API /leads/import] Error:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
