import { generateOutreachDraft } from './lib/actions/ai';
import { prisma } from './lib/prisma';

async function test() {
    const lead = await prisma.lead.findFirst({ where: { status: 'LIVE' } });
    if (!lead) {
        console.log("No LIVE lead found");
        return;
    }
    console.log(`Testing with lead: ${lead.name} (${lead.id})`);
    try {
        const res = await generateOutreachDraft(lead.id, 'professional');
        console.log("Result:", res);
    } catch (e) {
        console.error("Test failed with error:", e);
    }
}

test();
