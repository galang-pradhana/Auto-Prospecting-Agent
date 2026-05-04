'use server';

import { cookies } from 'next/headers';
import { isOwner } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export async function startImpersonation(targetUserId: string) {
    const owner = await isOwner();
    if (!owner) {
        return { error: 'Unauthorized: Only the owner can impersonate users.' };
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
        return { error: 'User not found.' };
    }

    cookies().set('forge_impersonate', targetUserId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 1 day
        path: '/',
    });

    return { success: true };
}

export async function stopImpersonation() {
    cookies().delete('forge_impersonate');
    return { success: true };
}

export async function getImpersonationStatus() {
    const owner = await isOwner();
    if (!owner) return null;

    const cookieStore = cookies();
    const targetUserId = cookieStore.get('forge_impersonate')?.value;
    
    if (!targetUserId) return null;

    const targetUser = await prisma.user.findUnique({ 
        where: { id: targetUserId },
        select: { id: true, name: true, email: true }
    });

    return targetUser;
}
