import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  console.log('Middleware running for:', path);

  // Define protected routes
  const isProtectedRoute = path.startsWith('/dashboard') || 
                          path.startsWith('/profile') || 
                          path.startsWith('/api/user');

  if (isProtectedRoute) {
    // Check for authentication by looking for the session token
    const token = request.cookies.get('next-auth.session-token')?.value;
    console.log('Protected route detected, token present:', !!token);

    if (!token) {
      // No session token found, redirect to login
      console.log('Redirecting to login');
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Continue with the request
  return NextResponse.next();
}

// Define paths that should trigger middleware
export const config = {
  matcher: [
    // Include dashboard and all its sub-paths
    '/dashboard',
    '/dashboard/:path*',
    // Include profile
    '/profile',
    // Include api/user
    '/api/user',
  ],
}; 