import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Lead QA Setup ---');

    // 1. Setup Users
    const qaPassword = await bcrypt.hash('Test1234!', 12);
    
    const userA = await prisma.user.upsert({
        where: { email: 'qa@forge.dev' },
        update: {},
        create: {
            email: 'qa@forge.dev',
            password: qaPassword,
            name: 'QA Tester',
        },
    });
    console.log('User A (QA Tester) verified.');

    const userB = await prisma.user.upsert({
        where: { email: 'other@forge.dev' },
        update: {},
        create: {
            email: 'other@forge.dev',
            password: qaPassword,
            name: 'User B',
        },
    });
    console.log('User B verified.');

    // 2. Clean up existing leads to avoid unique WA constraints and have a clean slate
    await prisma.lead.deleteMany({
        where: { userId: { in: [userA.id, userB.id] } }
    });
    console.log('Cleaned up existing leads for Test Users.');

    // 3. Seed User A Leads
    
    // LEAD-01: 5 FRESH, 3 ENRICHED
    await prisma.lead.createMany({
        data: [
            ...Array(5).fill(0).map((_, i) => ({
                name: `Fresh Lead ${i+1}`,
                wa: `628123456780${i}`,
                category: 'Cafe',
                city: 'Denpasar',
                status: 'FRESH' as any,
                userId: userA.id,
            })),
            ...Array(3).fill(0).map((_, i) => ({
                name: `Enriched Lead ${i+1}`,
                wa: `628123456781${i}`,
                category: 'Restaurant',
                city: 'Ubud',
                status: 'ENRICHED' as any,
                userId: userA.id,
            }))
        ]
    });

    // LEAD-03: Search "Bali Bakery"
    await prisma.lead.create({
        data: {
            name: 'Bali Bakery',
            wa: '628111222333',
            category: 'Bakery',
            city: 'Kuta',
            status: 'FRESH',
            userId: userA.id,
        }
    });

    // LEAD-04: Filter combinations
    await prisma.lead.createMany({
        data: [
            { name: 'Ubud Coffee', wa: '628999888777', category: 'Cafe', city: 'Ubud', status: 'FRESH', userId: userA.id },
            { name: 'Denpasar Grill', wa: '628111999222', category: 'Restaurant', city: 'Denpasar', status: 'FRESH', userId: userA.id },
        ]
    });

    // LEAD-08: Batch Delete leads (3 specialized leads)
    await prisma.lead.createMany({
        data: [
            { name: 'Batch Lead 1', wa: '6280001', category: 'Test', city: 'Test', status: 'FRESH', userId: userA.id },
            { name: 'Batch Lead 2', wa: '6280002', category: 'Test', city: 'Test', status: 'FRESH', userId: userA.id },
            { name: 'Batch Lead 3', wa: '6280003', category: 'Test', city: 'Test', status: 'FRESH', userId: userA.id },
        ]
    });

    // LEAD-10: Cleanup (Old leads > 14 days)
    const sixteenDaysAgo = new Date();
    sixteenDaysAgo.setDate(sixteenDaysAgo.getDate() - 16);
    
    await prisma.lead.createMany({
        data: [
            { name: 'Stale Lead 1', wa: '628999001', category: 'Old', city: 'Old', status: 'FRESH', userId: userA.id, createdAt: sixteenDaysAgo },
            { name: 'Stale Lead 2', wa: '628999002', category: 'Old', city: 'Old', status: 'FRESH', userId: userA.id, createdAt: sixteenDaysAgo },
        ]
    });

    // LEAD-06: Individual delete lead
    await prisma.lead.create({
        data: {
            name: 'Old Company',
            wa: '628555444333',
            category: 'Tech',
            city: 'Denpasar',
            status: 'FRESH',
            userId: userA.id,
        }
    });

    // 4. Seed User B Leads (LEAD-02, LEAD-09)
    await prisma.lead.createMany({
        data: Array(5).fill(0).map((_, i) => ({
            name: `User B Lead ${i+1}`,
            wa: `62822233344${i}`,
            category: 'Wholesale',
            city: 'Gianyar',
            status: 'FRESH',
            userId: userB.id,
        }))
    });

    console.log('--- Seeding Completed Successfully ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
