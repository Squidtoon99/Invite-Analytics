import { getSession } from '@/lib/session';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
    const session = await getSession(request, new NextResponse());
    if (!session.user) {
        return NextResponse.redirect(new URL('/api/auth/login', request.url));
    }
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: '/dashboard',
};