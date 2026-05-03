'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getBrandDnaLeads(filters: {
    query?: string,
    category?: string,
    city?: string,
    district?: string
}) {
    const session = await getSession();
    if (!session) return [];

    return prisma.lead.findMany({
        where: {
            userId: session.userId,
            status: 'LIVE', // Hanya tampilkan data yang sudah LIVE (minimal uji coba)
            htmlCode: { not: null }, // Pastikan sudah ada dummy website-nya
            name: filters.query ? { contains: filters.query, mode: 'insensitive' } : undefined,
            category: filters.category || undefined,
            city: filters.city || undefined,
            district: filters.district || undefined,
        },
        include: {
            brandDna: true
        },
        orderBy: {
            updatedAt: 'desc'
        },
        take: 50
    });
}

export async function generateBrandDnaLink(leadId: string) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Not authenticated' };

    try {
        const existing = await prisma.brandDnaSubmission.findUnique({
            where: { leadId }
        });

        if (existing) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            return { 
                success: true, 
                link: `${baseUrl}/b/${existing.token}`,
                token: existing.token
            };
        }

        const created = await prisma.brandDnaSubmission.create({
            data: {
                leadId,
                status: 'PENDING'
            }
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        revalidatePath('/dashboard/brand-dna');
        
        return { 
            success: true, 
            link: `${baseUrl}/b/${created.token}`,
            token: created.token
        };
    } catch (error) {
        console.error('Generate BrandDNA error:', error);
        return { success: false, message: 'Failed to generate link' };
    }
}

export async function getUniqueCategories() {
    const session = await getSession();
    if (!session) return [];

    const categories = await prisma.lead.findMany({
        where: { 
            userId: session.userId,
            status: 'LIVE',
            htmlCode: { not: null }
        },
        select: { category: true },
        distinct: ['category']
    });

    return categories.map(c => c.category);
}
