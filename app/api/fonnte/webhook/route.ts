import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMessage, parseFonnteWebhook } from '@/lib/fonnte';
import { sanitizeWaNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        console.log("\n[WEBHOOK RECEIVED] Processing payload...");

        let body: any = {};
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            const params = new URLSearchParams(rawBody);
            body = Object.fromEntries(params.entries());
        }

        const { sender, message, isMe, isStatusUpdate, inboxid } = parseFonnteWebhook(body);

        if (!sender) {
            console.warn("[WEBHOOK] Ignored: No sender in payload.", body);
            return NextResponse.json({ success: true, message: 'Ignored unknown payload' });
        }

        if (isMe) {
            console.log(`[WEBHOOK] Ignored outgoing message from ${sender}`);
            return NextResponse.json({ success: true, message: 'Outgoing message ignored' });
        }

        if (isStatusUpdate) {
            console.log(`[WEBHOOK] Ignored status update/empty message`);
            return NextResponse.json({ success: true, message: 'Status update ignored' });
        }

        console.log(`[WEBHOOK] Incoming message from ${sender}: "${message}"`);
        console.log(`[WEBHOOK] Full Body:`, JSON.stringify(body));

        // Cari lead dengan nomor WA ini yang statusnya BAIT_SENT
        const leads = await prisma.lead.findMany({
            where: {
                blastStatus: 'BAIT_SENT'
            }
        });

        console.log(`[WEBHOOK] Found ${leads.length} leads with BAIT_SENT status in DB.`);

        // Find matching lead
        const lead = leads.find(l => {
            if (!l.wa) return false;
            const lClean = sanitizeWaNumber(l.wa);
            if (!lClean) return false;
            
            const core1 = lClean.length > 5 ? lClean.substring(lClean.length - 8) : lClean;
            const core2 = sender.length > 5 ? sender.substring(sender.length - 8) : sender;
            
            const match = lClean === sender || lClean.endsWith(core2) || sender.endsWith(core1);
            if (match) console.log(`[WEBHOOK] Match found! Lead: ${l.name} (${l.wa}) matches Sender: ${sender}`);
            return match;
        });

        if (!lead) {
            console.log(`[WEBHOOK] No matching lead found with blastStatus='BAIT_SENT' for number: ${sender}`);
            return NextResponse.json({ success: true, message: 'Ignored (No matching BAIT_SENT lead)' });
        }

        console.log(`[WEBHOOK] MATCH! Lead: ${lead.name} (ID: ${lead.id}). Preparing outreach...`);

        // Fetch tokens for this user
        const user = await prisma.user.findUnique({
            where: { id: lead.userId },
            select: { fonnteTokens: true }
        });
        
        let tokens: string[] = [];
        if (user?.fonnteTokens && Array.isArray(user.fonnteTokens)) {
            tokens = user.fonnteTokens as string[];
        }

        if (lead.outreachDraft) {
            // PREPARE DIRECT REPLY (Fonnte supports returning JSON to reply instantly)
            console.log(`[WEBHOOK] Direct Reply triggered for ${lead.name} (${lead.wa})`);
            
            // Still update DB to mark as REPLIED
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    blastStatus: 'REPLIED',
                    lastLog: `Outreach auto-sent via Direct Webhook Reply (InboxID: ${inboxid || 'N/A'})`
                }
            });

            // Return direct reply payload
            return NextResponse.json({ 
                reply: lead.outreachDraft,
                delay: 1, // 1 second delay for natural feel
                inboxid: inboxid 
            });
        } else {
            console.warn(`[WEBHOOK] No outreachDraft found for lead ${lead.id}. Cannot auto-reply.`);
        }

        return NextResponse.json({ success: true, message: 'Webhook processed' });

    } catch (error: any) {
        console.error("[Fonnte Webhook Error]:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
