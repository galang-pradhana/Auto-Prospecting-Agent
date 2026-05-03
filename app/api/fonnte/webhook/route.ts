import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMessage, parseFonnteWebhook } from '@/lib/fonnte';
import { sanitizeWaNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        console.log("\n[WEBHOOK RECEIVED] Raw body:", rawBody.substring(0, 500));

        let body: any = {};
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            // Fonnte sometimes sends form-encoded data
            const params = new URLSearchParams(rawBody);
            body = Object.fromEntries(params.entries());
        }

        console.log("[WEBHOOK] Parsed body keys:", Object.keys(body));

        const { sender, message, isMe, isStatusUpdate, inboxid } = parseFonnteWebhook(body);

        // Log all important parsed values to trace issues
        console.log(`[WEBHOOK] Sender: "${sender}" | isMe: ${isMe} | isStatusUpdate: ${isStatusUpdate} | message: "${message?.substring(0, 100)}" | inboxid: "${inboxid}"`);

        if (!sender) {
            console.warn("[WEBHOOK] Ignored: No sender found in payload.", body);
            return NextResponse.json({ success: true, message: 'Ignored unknown payload' });
        }

        if (isMe) {
            console.log(`[WEBHOOK] Ignored: outgoing message from our own device (${sender})`);
            return NextResponse.json({ success: true, message: 'Outgoing message ignored' });
        }

        if (isStatusUpdate) {
            console.log(`[WEBHOOK] Ignored: status update event (no message content)`);
            return NextResponse.json({ success: true, message: 'Status update ignored' });
        }

        if (!message || message.trim() === '') {
            console.log(`[WEBHOOK] Ignored: empty message from ${sender}`);
            return NextResponse.json({ success: true, message: 'Empty message ignored' });
        }

        console.log(`[WEBHOOK] ✅ Valid incoming message from ${sender}: "${message}"`);

        // Cari semua lead dengan status BAIT_SENT
        const leads = await prisma.lead.findMany({
            where: { blastStatus: 'BAIT_SENT' }
        });

        console.log(`[WEBHOOK] Found ${leads.length} leads with BAIT_SENT status.`);

        // Cari lead yang nomornya cocok dengan sender
        const lead = leads.find(l => {
            if (!l.wa) return false;
            const lClean = sanitizeWaNumber(l.wa);
            if (!lClean) return false;

            // Gunakan 8 digit terakhir untuk pencocokan yang lebih toleran terhadap format nomor
            const core1 = lClean.length > 5 ? lClean.substring(lClean.length - 8) : lClean;
            const core2 = sender.length > 5 ? sender.substring(sender.length - 8) : sender;

            const match = lClean === sender || lClean.endsWith(core2) || sender.endsWith(core1);
            if (match) {
                console.log(`[WEBHOOK] ✅ Match! DB number "${l.wa}" -> cleaned "${lClean}" matches sender "${sender}"`);
            }
            return match;
        });

        if (!lead) {
            console.log(`[WEBHOOK] ❌ No matching BAIT_SENT lead found for sender: ${sender}`);
            if (leads.length > 0) {
                console.log(`[WEBHOOK] Available BAIT_SENT numbers:`, leads.map(l => `${l.wa} -> ${sanitizeWaNumber(l.wa || '')}`));
            }
            return NextResponse.json({ success: true, message: 'No matching BAIT_SENT lead' });
        }

        console.log(`[WEBHOOK] 🎯 Matched Lead: ${lead.name} (ID: ${lead.id})`);

        if (!lead.outreachDraft) {
            console.warn(`[WEBHOOK] ❌ Lead ${lead.id} has no outreachDraft. Cannot auto-reply.`);
            return NextResponse.json({ success: true, message: 'No outreach draft available' });
        }

        // Ambil token Fonnte dari user pemilik lead
        const user = await prisma.user.findUnique({
            where: { id: lead.userId },
            select: { fonnteTokens: true }
        });

        let tokens: string[] = [];
        if (user?.fonnteTokens && Array.isArray(user.fonnteTokens)) {
            tokens = (user.fonnteTokens as string[]).filter(t => t && typeof t === 'string' && t.trim().length > 10);
        }

        console.log(`[WEBHOOK] Using ${tokens.length} valid tokens from user DB.`);

        if (tokens.length === 0 && !process.env.FONNTE_TOKEN) {
            console.error(`[WEBHOOK] ❌ No tokens available! Cannot send outreach reply.`);
            // Still mark as REPLIED so we don't keep retrying
            await prisma.lead.update({
                where: { id: lead.id },
                data: { blastError: 'No Fonnte token configured for this user.' }
            });
            return NextResponse.json({ success: false, message: 'No tokens configured' });
        }

        // Kirim pesan outreach via Fonnte API (BUKAN direct reply response)
        console.log(`[WEBHOOK] 📤 Sending outreach to ${lead.wa}...`);
        const sendResult = await sendMessage(
            lead.wa!,
            lead.outreachDraft,
            2, // 2 second delay for natural feel
            tokens,
            inboxid || undefined
        );

        console.log(`[WEBHOOK] Fonnte sendMessage result:`, JSON.stringify(sendResult));

        if (sendResult.status) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    blastStatus: 'REPLIED',
                    lastLog: `Outreach sent via Fonnte API after webhook trigger (${new Date().toISOString()})`
                }
            });
            console.log(`[WEBHOOK] ✅ Outreach sent successfully to ${lead.name}! Status -> REPLIED`);
        } else {
            const errMsg = sendResult.reason || sendResult.message || 'Unknown error';
            console.error(`[WEBHOOK] ❌ Outreach FAILED for ${lead.name}: ${errMsg}`);
            await prisma.lead.update({
                where: { id: lead.id },
                data: { blastError: `Auto-reply failed: ${errMsg}` }
            });
        }

        // Fonnte hanya butuh response 200 OK, tidak perlu reply body
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("[WEBHOOK ERROR]:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
