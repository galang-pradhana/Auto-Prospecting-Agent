import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'forge_session';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const session = request.cookies.get(SESSION_COOKIE)?.value;

    // 1. If hitting root "/", redirect to dashboard or login
    if (pathname === '/') {
        if (session) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        } else {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // 2. Protect /dashboard and /leads
    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/leads');
    
    if (isProtectedRoute && !session) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 3. If hitting /login with a session, redirect to dashboard
    if (pathname === '/login' && session) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/dashboard/:path*', '/leads/:path*', '/login'],
};
