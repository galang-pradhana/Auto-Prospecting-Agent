import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'forge_session';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const session = request.cookies.get(SESSION_COOKIE)?.value;

    // 1. If hitting root "/", redirect based on session presence
    if (pathname === '/') {
        return NextResponse.redirect(new URL(session ? '/dashboard' : '/login', request.url));
    }

    // 2. Protect /dashboard and /leads
    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/leads');
    if (isProtectedRoute && !session) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // REMOVE the redirect from /login to /dashboard based ONLY on cookie existence.
    // This is what causes the infinite loop when the cookie is invalid.

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/dashboard/:path*', '/leads/:path*', '/login'],
};