import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── Public Tracking Endpoint (NO AUTH — called from lead's browser) ───────────
// Events:
//   view     → first open, marks linkClickedAt + stage 'clicked'
//   beacon   → periodic ping while page is open, accumulates totalTimeOnPage
//   qualified → fired after 10s, upgrades stage to 'qualified'

export async function GET(
    request: NextRequest,
    context: { params: { token: string } }
) {
    const { token } = context.params;
    const event = request.nextUrl.searchParams.get('event') || 'view';
    const seconds = parseInt(request.nextUrl.searchParams.get('seconds') || '5', 10);

    try {
        // Resolve token → lead
        const trackingToken = await prisma.trackingToken.findUnique({
            where: { token },
            select: { prospectId: true }
        });

        if (!trackingToken) {
            // Silent fail — don't leak info to lead
            return new Response('', { status: 204 });
        }

        const leadId = trackingToken.prospectId;

        if (event === 'view') {
            // Only update if not already clicked
            const lead = await prisma.lead.findUnique({
                where: { id: leadId },
                select: { linkClickedAt: true, followupStage: true }
            });

            if (!lead?.linkClickedAt) {
                await prisma.lead.update({
                    where: { id: leadId },
                    data: {
                        linkClickedAt: new Date(),
                        followupStage: 'clicked',
                    }
                });

                await prisma.prospectEvent.create({
                    data: {
                        prospectId: leadId,
                        eventType: 'link_clicked',
                        metadata: {
                            userAgent: request.headers.get('user-agent') || 'unknown',
                            ip: request.headers.get('x-forwarded-for') || 'unknown',
                        }
                    }
                });
            }
        }

        else if (event === 'beacon') {
            // Accumulate time on page (add seconds from beacon)
            const safeSeconds = Math.min(Math.max(seconds, 1), 30); // clamp 1-30s
            await prisma.lead.update({
                where: { id: leadId },
                data: {
                    totalTimeOnPage: { increment: safeSeconds }
                }
            });
        }

        else if (event === 'qualified') {
            // Upgrade to hot lead if not already
            const lead = await prisma.lead.findUnique({
                where: { id: leadId },
                select: { qualifiedAt: true, followupStage: true }
            });

            if (!lead?.qualifiedAt && lead?.followupStage !== 'qualified') {
                await prisma.lead.update({
                    where: { id: leadId },
                    data: {
                        qualifiedAt: new Date(),
                        followupStage: 'qualified',
                    }
                });

                await prisma.prospectEvent.create({
                    data: {
                        prospectId: leadId,
                        eventType: 'time_beacon',
                        metadata: { qualifiedAt: new Date().toISOString(), threshold: '10s' }
                    }
                });
            }
        }

        // Return 1x1 transparent GIF (pixel tracking style)
        const pixel = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64'
        );

        return new Response(pixel, {
            status: 200,
            headers: {
                'Content-Type': 'image/gif',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
            }
        });

    } catch (error) {
        console.error('[Track API Error]:', error);
        return new Response('', { status: 204 });
    }
}

export const dynamic = 'force-dynamic';
