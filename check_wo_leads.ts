import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const leads = await prisma.lead.findMany({
        where: {
            OR: [
                { category: { contains: 'Wedding', mode: 'insensitive' } },
                { name: { contains: 'Wedding', mode: 'insensitive' } }
            ]
        },
        select: { name: true, city: true, district: true }
    });
    console.log("Total WO Leads:", leads.length);
    console.log(leads);
}

run();
