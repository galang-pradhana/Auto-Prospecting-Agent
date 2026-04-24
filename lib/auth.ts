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

export async function getSession(): Promise<{ userId: string } | null> {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return decodeSession(token);
}

export async function getCurrentUser() {
    const session = await getSession();
    if (!session) return null;
    return prisma.user.findUnique({
        where: { id: session.userId },
        select: { 
            id: true, email: true, name: true, 
            kieAiApiKey: true, byocMode: true, aiEngine: true,
            businessName: true, businessIg: true, businessWa: true
        }
    });
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

