import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isOwner } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ============================================================
// MAP: model name → prisma accessor & allowed fields
// ============================================================
const MODEL_MAP: Record<string, {
    model: any;
    searchFields: string[];
    orderBy: any;
}> = {
    lead:         { model: prisma.lead,            searchFields: ['name', 'wa', 'city', 'category'], orderBy: { updatedAt: 'desc' } },
    user:         { model: prisma.user,            searchFields: ['name', 'email'],                  orderBy: { createdAt: 'desc' } },
    leadsandbox:  { model: prisma.leadSandbox,     searchFields: ['name', 'wa', 'reason'],           orderBy: { createdAt: 'desc' } },
    activitylog:  { model: prisma.activityLog,     searchFields: ['action', 'description'],          orderBy: { createdAt: 'desc' } },
    watemplate:   { model: prisma.waTemplate,      searchFields: ['title', 'category'],              orderBy: { createdAt: 'desc' } },
    systemprompt: { model: prisma.systemPrompt,    searchFields: ['name'],                           orderBy: { updatedAt: 'desc' } },
    b2bdeal:      { model: prisma.b2BDeal,         searchFields: ['categoryLink', 'notes'],          orderBy: { createdAt: 'desc' } },
};

const PAGE_SIZE = 50;

// ============================================================
// GET — Read data with pagination, search, and filter
// ============================================================
export async function GET(req: NextRequest) {
    if (!(await isOwner())) {
        return NextResponse.json({ error: 'Forbidden: Owner only' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const modelKey = searchParams.get('model') || 'lead';
    const page     = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const search   = searchParams.get('search') || '';

    const config = MODEL_MAP[modelKey];
    if (!config) {
        return NextResponse.json({ error: `Unknown model: ${modelKey}` }, { status: 400 });
    }

    // Build dynamic filter
    const where: any = {};

    // Search across text fields
    if (search.trim()) {
        where.OR = config.searchFields.map(f => ({
            [f]: { contains: search, mode: 'insensitive' }
        }));
    }

    // Extra filters: ?filter[status]=FRESH
    Array.from(searchParams.entries()).forEach(([key, val]) => {
        if (key.startsWith('filter[') && key.endsWith(']') && val) {
            const field = key.slice(7, -1);
            where[field] = val;
        }
    });

    const skip = (page - 1) * PAGE_SIZE;

    const [data, total] = await Promise.all([
        config.model.findMany({ where, orderBy: config.orderBy, skip, take: PAGE_SIZE }),
        config.model.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, pageSize: PAGE_SIZE });
}

// ============================================================
// POST — Update one field on one row
// ============================================================
export async function POST(req: Request) {
    if (!(await isOwner())) {
        return NextResponse.json({ error: 'Forbidden: Owner only' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { model: modelKey, id, field, value } = body;

        if (!modelKey || !id || !field) {
            return NextResponse.json({ error: 'Missing model, id, or field' }, { status: 400 });
        }

        const config = MODEL_MAP[modelKey];
        if (!config) {
            return NextResponse.json({ error: `Unknown model: ${modelKey}` }, { status: 400 });
        }

        // Type coercion
        let coercedValue: any = value;
        if (value === 'true')  coercedValue = true;
        if (value === 'false') coercedValue = false;
        if (value === '')      coercedValue = null;
        if (field === 'rating' || field === 'dealValue' || field === 'brokerFee') {
            coercedValue = value !== '' && value != null ? parseFloat(value) : null;
        }

        const updateData = { [field]: coercedValue };
        const updated = await config.model.update({ where: { id }, data: updateData });

        return NextResponse.json({ success: true, updated });
    } catch (error: any) {
        console.error('[Local Editor POST Error]:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: `Nilai duplikat pada field ini.` }, { status: 409 });
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

// ============================================================
// DELETE — Delete one row by id
// ============================================================
export async function DELETE(req: Request) {
    if (!(await isOwner())) {
        return NextResponse.json({ error: 'Forbidden: Owner only' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { model: modelKey, id } = body;

        if (!modelKey || !id) {
            return NextResponse.json({ error: 'Missing model or id' }, { status: 400 });
        }

        const config = MODEL_MAP[modelKey];
        if (!config) {
            return NextResponse.json({ error: `Unknown model: ${modelKey}` }, { status: 400 });
        }

        await config.model.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Local Editor DELETE Error]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
