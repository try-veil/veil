import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  console.log('Middleware running for:', path);

  // Define protected routes
  const isProtectedRoute = path.startsWith('/dashboard') || 
                          path.startsWith('/profile') || 
                          path.startsWith('/api/user') ||
                          path.startsWith('/projects');

  if (isProtectedRoute) {
    // For client-side auth with localStorage, we need to set a cookie in the browser
    // when we set the localStorage value. Here we check for that cookie.
    const authCookie = request.cookies.get('auth-token')?.value;

    console.log('Protected route detected, auth cookie present:', !!authCookie);

    if (!authCookie) {
      console.log('Redirecting to login');
      const loginUrl = new URL('/login', request.url);
      // Add the original URL as a redirect parameter
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Define paths that should trigger middleware
export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/profile',
    '/profile/:path*',
    '/projects',
    '/projects/:path*',
    '/api/user',
    '/api/user/:path*',
  ],
}; 