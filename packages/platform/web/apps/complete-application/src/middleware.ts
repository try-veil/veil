import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  console.log('Middleware running for:', path);

  // Define protected routes
  const isProtectedRoute = path.startsWith('/dashboard') || 
                          path.startsWith('/profile') || 
                          path.startsWith('/api/user');

  if (isProtectedRoute) {
    const token = request.cookies.get('next-auth.session-token')?.value;
    console.log('Protected route detected, token present:', !!token);

    if (!token) {
      console.log('Redirecting to login');
      const loginUrl = new URL('/login', request.url);
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

    '/api/user',
  ],
}; 