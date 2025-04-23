import { NextResponse } from 'next/server';

export async function GET() {
  // Generate a mock user and tokens for testing
  const mockUser = {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockAccessToken = 'mock-access-token-' + Math.random().toString(36).substring(2);
  const mockRefreshToken = 'mock-refresh-token-' + Math.random().toString(36).substring(2);

  return NextResponse.json({
    success: true,
    user: mockUser,
    accessToken: mockAccessToken,
    refreshToken: mockRefreshToken
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Test login endpoint called with body:', body);
    
    // Generate a mock user and tokens for testing
    const mockUser = {
      id: 'test-user-id',
      name: body.username || 'Test User',
      email: body.username || 'test@example.com',
    };

    const mockAccessToken = 'mock-access-token-' + Math.random().toString(36).substring(2);
    const mockRefreshToken = 'mock-refresh-token-' + Math.random().toString(36).substring(2);

    return NextResponse.json({
      success: true,
      user: mockUser,
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken
    });
  } catch (error) {
    console.error('Error in test login endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error_description: 'Failed to process request' 
    }, { status: 400 });
  }
} 