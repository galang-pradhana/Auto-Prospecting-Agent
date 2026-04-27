import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { JobRegistry } from '@/lib/jobRegistry';
import { randomUUID } from 'crypto';
import { scheduleMessage } from '@/lib/fonnte';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { leadIds, baseScheduledAt } = body;

        if (!Array.isArray(leadIds) || leadIds.length === 0 || !baseScheduledAt) {
            return NextResponse.json({ error: 'leadIds array and baseScheduledAt are required' }, { status: 400 });
        }

        // Ambil semua draft pending untuk leadIds yang terpilih
        const leads = await prisma.lead.findMany({
            where: {
                id: { in: leadIds },
                userId: session.userId,
            },
            include: {
                followupQueue: {
                    where: { status: 'pending' },
                    take: 1,
                    orderBy: { followupNumber: 'desc' }
                }
            }
        });

        const processableLeads = leads.filter(l => l.followupQueue.length > 0 && (l.wa || l.phone));

        if (processableLeads.length === 0) {
            return NextResponse.json({ error: 'Tidak ada draft pending untuk leads yang dipilih' }, { status: 404 });
        }

        const jobId = randomUUID();
        const initialMessage = `Menyiapkan penjadwalan ${processableLeads.length} pesan ke server Fonnte...`;
        JobRegistry.createJob(jobId, 'SCHEDULE', session.userId, initialMessage);

        // Fire and forget background process
        processBatchScheduling(processableLeads, session.userId, jobId, new Date(baseScheduledAt)).catch((err) => {
            console.error(err);
            JobRegistry.updateJob(jobId, { status: 'FAILED', message: err.message });
        });

        return NextResponse.json({
            success: true,
            jobId,
            message: "Batch scheduling started in background"
        });

    } catch (error: any) {
        console.error("[API /monitoring/batch-schedule-followup] Error:", error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

async function processBatchScheduling(leads: any[], userId: string, jobId: string, baseTime: Date) {
    let successCount = 0;
    let failCount = 0;
    const total = leads.length;

    // Fetch Fonnte tokens for rotation
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { fonnteTokens: true }
    });
    
    let tokens: string[] = [];
    if (user?.fonnteTokens && Array.isArray(user.fonnteTokens)) {
        tokens = user.fonnteTokens as string[];
    }

    // Sort leads to process in order
    for (let i = 0; i < total; i++) {
        const lead = leads[i];
        const draft = lead.followupQueue[0];
        const targetPhone = lead.wa || lead.phone;

        // Hitung waktu jadwal (BaseTime + (i * delayAcak))
        // Sesuai request: extreme delay 60 - 120 detik (ditambahkan per lead agar Fonnte mengirim berurutan)
        const delaySeconds = i === 0 ? 0 : Math.floor(Math.random() * (120 - 60 + 1) + 60);
        
        // Kita tambahkan jeda ke baseTime yang terus terakumulasi per pesan
        const scheduleTimeForThisLead = new Date(baseTime);
        // Misal: Lead 1 (base), Lead 2 (base + 90s), Lead 3 (base + 90s + 75s), dst.
        // Atau kita bisa gunakan baseTime statis + (delay * i)
        // Kita gunakan pendekatan: baseTime + (1 menit * i) + (acak 0-60 detik) agar makin lama makin menyebar
        const totalDelayMs = (i * 60 * 1000) + (Math.floor(Math.random() * 60) * 1000); 
        scheduleTimeForThisLead.setTime(baseTime.getTime() + totalDelayMs);

        JobRegistry.updateJob(jobId, {
            progress: Math.round((i / total) * 100),
            message: `Menjadwalkan ${lead.name || 'nomor WA'} (${i + 1}/${total}) ke waktu: ${scheduleTimeForThisLead.toLocaleTimeString('id-ID')}...`
        });

        try {
            const fonnteRes = await scheduleMessage(targetPhone, draft.messageText, scheduleTimeForThisLead, tokens);

            if (fonnteRes.status) {
                // Update FollowupQueue record
                await prisma.followupQueue.update({
                    where: { id: draft.id },
                    data: {
                        status: 'scheduled',
                        scheduledAt: scheduleTimeForThisLead
                    }
                });
                successCount++;
            } else {
                failCount++;
            }
        } catch (e: any) {
            failCount++;
        }

        // Jeda sebentar antar API call ke Fonnte (bukan jadwal Fonnte, tapi jeda hit API)
        await new Promise(r => setTimeout(r, 1000));
    }

    JobRegistry.updateJob(jobId, {
        progress: 100,
        status: 'COMPLETED',
        message: `Selesai! Berhasil menjadwalkan ${successCount} pesan. Gagal: ${failCount}`
    });
}
