import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Simplified: Check for token cookie (actual verification happens in API)
  const token = request.cookies.get('access_token');

  if (!token && !pathname.startsWith('/_next')) {
     // Optional: Redirect to login if no token - but we handle this in Layout too
     // For now just allow next to avoid early redirect before auth/me check
     // return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
