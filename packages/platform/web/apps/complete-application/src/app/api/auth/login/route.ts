import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const clientId = process.env.FUSIONAUTH_CLIENT_ID;
    const clientSecret = process.env.FUSIONAUTH_CLIENT_SECRET;
    const tokenUrl = `${process.env.NEXT_PUBLIC_FUSIONAUTH_URL}/oauth2/token`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing authentication configuration' },
        { status: 500 }
      );
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'password',
        username,
        password,
        scope: 'openid email profile offline_access',
      } as Record<string, string>),
    });

    const data = await response.json();

    if (response.ok) {
      // Set HTTP-only cookies for tokens
      const cookieStore = cookies();
      cookieStore.set('access_token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: data.expires_in
      });

      if (data.refresh_token) {
        cookieStore.set('refresh_token', data.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 // 30 days
        });
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({
        error: data.error,
        error_description: data.error_description,
      }, { status: response.status });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 