import { NextResponse } from 'next/server';
import { getAiPulseStatus } from '@/lib/actions/settings';

export const dynamic = 'force-dynamic';

// Lightweight health check endpoint for the kie.ai status indicator.
// Called by the client-side KieStatusBadge every 60 seconds.
export async function GET() {
    const result = await getAiPulseStatus();
    return NextResponse.json(result);
}
