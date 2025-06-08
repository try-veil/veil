import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    // This should never happen because middleware should have already redirected
    // But it's good practice to check anyway
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  // Return user data from the session
  return NextResponse.json({
    user: session.user,
    message: 'This is a protected API route'
  });
} 