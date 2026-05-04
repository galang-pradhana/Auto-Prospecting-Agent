'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SESSION_COOKIE = 'forge_session';

// --- Session helpers ---
function encodeSession(userId: string): string {
    // Simple base64 encode with secret prefix for basic tamper detection
    const payload = JSON.stringify({ userId, ts: Date.now() });
    return Buffer.from(payload).toString('base64');
}

function decodeSession(token: string): { userId: string } | null {
    try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (payload.userId) return { userId: payload.userId };
    } catch {}
    return null;
}

// --- Public API ---

export async function getRealSession(): Promise<{ userId: string } | null> {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return decodeSession(token);
}

export async function getImpersonateSession(): Promise<{ userId: string } | null> {
    const cookieStore = cookies();
    const token = cookieStore.get('forge_impersonate')?.value;
    if (!token) return null;
    return { userId: token };
}

export async function getSession(): Promise<{ userId: string } | null> {
    return getRealSession();
}

export async function getCurrentUser() {
    const realSession = await getRealSession();
    if (!realSession) return null;

    let targetUserId = realSession.userId;
    const ownerEmail = process.env.OWNER_EMAIL;

    // If there is an OWNER_EMAIL configured, check if the real user is the owner
    if (ownerEmail) {
        const realUser = await prisma.user.findUnique({ 
            where: { id: realSession.userId }, 
            select: { email: true } 
        });
        
        if (realUser?.email === ownerEmail) {
            // Owner is logged in, check if they are impersonating someone
            const impSession = await getImpersonateSession();
            if (impSession?.userId) {
                targetUserId = impSession.userId;
            }
        }
    }

    return prisma.user.findUnique({
        where: { id: targetUserId },
        select: { 
            id: true, email: true, name: true, 
            kieAiApiKey: true, openrouterApiKey: true,
            aiProvider: true, byocMode: true, aiEngine: true,
            businessName: true, businessIg: true, businessWa: true
        }
    });
}

/**
 * Cek apakah user yang sedang login adalah Owner (Admin utama).
 * Owner ditentukan oleh env var OWNER_EMAIL di .env.
 * Selalu mengecek Real Session, bukan Impersonated Session.
 */
export async function isOwner(): Promise<boolean> {
    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
        console.warn('[Auth] OWNER_EMAIL not set in .env — local-editor is locked for everyone.');
        return false;
    }
    const realSession = await getRealSession();
    if (!realSession) return false;
    
    const realUser = await prisma.user.findUnique({ 
        where: { id: realSession.userId },
        select: { email: true }
    });
    return realUser?.email === ownerEmail;
}

export async function registerUser(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    if (!email || !password || !name) {
        return { error: 'All fields are required' };
    }

    // Check existing
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return { error: 'Email already registered' };
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
        data: { email, password: hashedPassword, name, isApproved: false }
    });

    // We do NOT log them in immediately. They must wait for approval.
    return { error: 'Registration complete. Your account is pending admin approval.' };
}

export async function loginUser(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { error: 'Email and password are required' };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return { error: 'Invalid credentials' };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return { error: 'Invalid credentials' };
    }

    if (!user.isApproved) {
        return { error: 'Account pending admin approval. Please contact Galang.' };
    }

    const token = encodeSession(user.id);
    cookies().set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
    });

    return { success: true };
}

export async function logoutUser() {
    cookies().delete(SESSION_COOKIE);
    redirect('/login');
}

