import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generateOutreachDraft } from '@/lib/actions/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { leadId, persona } = await req.json();
        if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 });

        const result = await generateOutreachDraft(leadId, persona || 'professional');
        
        if (result.success) {
            return NextResponse.json({ success: true, draft: result.draft });
        }
        return NextResponse.json({ success: false, error: result.message }, { status: 500 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
