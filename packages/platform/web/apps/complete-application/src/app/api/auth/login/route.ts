import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;
    const clientId = process.env.NEXT_PUBLIC_FUSIONAUTH_CLIENT_ID;
    const apiKey = process.env.FUSIONAUTH_API_KEY!;
    const tenantId = process.env.FUSIONAUTH_TENANT_ID || ""; 

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing authentication configuration' },
        { status: 500 }
      );
    }
    console.log(username, password,clientId,apiKey,tenantId)
    const response = await fetch(`${process.env.NEXT_PUBLIC_FUSIONAUTH_URL}/api/login`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        Authorization: `${apiKey}`, 
        "X-FusionAuth-TenantId": tenantId, 
      },
      body: JSON.stringify({
        loginId: username,
        password,
        applicationId: clientId,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const token = data.jwt;
      const refreshToken = data.refreshToken;
      console.log("data",data)

      const cookieStore = cookies();
      cookieStore.set('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: data.expiresIn || 3600,
      });

      if (refreshToken) {
        cookieStore.set('refresh_token', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        {
          error: data.error,
          error_description: data.error_description,
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
