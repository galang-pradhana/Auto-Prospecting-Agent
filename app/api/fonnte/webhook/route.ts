import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMessage } from '@/lib/fonnte';
import { sanitizeWaNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        let body: any;
        const contentType = req.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            body = await req.json();
        } else {
            // Fonnte sometimes sends form-data or x-www-form-urlencoded
            const formData = await req.formData();
            body = Object.fromEntries(formData.entries());
        }

        // Log the incoming payload for debugging
        console.log("\n[WEBHOOK RECEIVED] Payload:", JSON.stringify(body, null, 2));

        // Handle device status updates gracefully so Fonnte doesn't block our webhook
        if (body.status === 'connect' || body.status === 'disconnect' || !body.sender && !body.from && body.device) {
            console.log(`[WEBHOOK] Ignored device status update: ${body.status}`);
            return NextResponse.json({ success: true, message: 'Device status ignored' });
        }

        // Fonnte: 'sender' is usually the person who sent the message. 'device' is your own number.
        const sender = body.sender || body.from;
        
        console.log("[WEBHOOK] Extracted sender number:", sender);

        if (!sender) {
            console.error("[Fonnte Webhook] No sender/from found in body. Is this a new Fonnte payload format?", body);
            // Return 200 anyway so Fonnte doesn't retry and block us
            return NextResponse.json({ success: true, message: 'Ignored unknown payload' });
        }

        const cleanSender = sanitizeWaNumber(sender.toString());

        // Cari lead dengan nomor WA ini
        const leads = await prisma.lead.findMany({
            where: {
                blastStatus: 'BAIT_SENT'
            }
        });

        // Find matching lead
        const lead = leads.find(l => {
            if (!l.wa) return false;
            const lClean = sanitizeWaNumber(l.wa);
            // Check if one ends with the other to handle 08 vs 628
            // We use substring(2) to drop the '62' or '08' prefix for matching the core number
            const core1 = lClean.length > 5 ? lClean.substring(lClean.length - 8) : lClean;
            const core2 = cleanSender.length > 5 ? cleanSender.substring(cleanSender.length - 8) : cleanSender;
            
            return lClean === cleanSender || lClean.endsWith(core2) || cleanSender.endsWith(core1);
        });

        if (!lead) {
            console.log(`[WEBHOOK] No matching lead found with blastStatus='BAIT_SENT' for number: ${cleanSender}`);
            console.log(`[WEBHOOK] Leads checked:`, leads.map(l => ({ id: l.id, name: l.name, wa: l.wa })));
            // Not a bait response we're tracking
            return NextResponse.json({ success: true, message: 'Ignored (No matching BAIT_SENT lead)' });
        }

        console.log(`[WEBHOOK] Found matching lead: ${lead.name} (ID: ${lead.id})`);

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
            // Send the outreach draft automatically
            const response = await sendMessage(lead.wa, lead.outreachDraft, undefined, tokens);
            
            if (response.status) {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        blastStatus: 'REPLIED', // Marking as REPLIED to show the funnel worked
                        lastLog: 'Outreach auto-sent via Webhook'
                    }
                });
            } else {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        blastError: 'Failed auto-reply: ' + (response.reason || response.message)
                    }
                });
            }
        }

        return NextResponse.json({ success: true, message: 'Webhook processed' });

    } catch (error: any) {
        console.error("[Fonnte Webhook Error]:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
