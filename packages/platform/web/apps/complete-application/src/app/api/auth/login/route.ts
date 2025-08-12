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

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      data = {};
    }

    if (response.ok) {
      const accessToken = data.token || data.jwt;
      const refreshToken = data.refreshToken;
      const user = data.user;
      // Also return tokens and user data for NextAuth
      return NextResponse.json({ 
        success: true,
        user: {
          id: user.id,
          name: user.firstName + ' ' + user.lastName,
          email: user.email
        },
        accessToken,
        refreshToken
      });
    } else {
      let errorMessage = "Login failed";
      
      if (response.status === 404) {
        errorMessage = "Invalid email or password";
      } else if (response.status === 401) {
        errorMessage = "Invalid email or password";
      } else if (response.status === 400) {
        errorMessage = "Please check your email and password";
      } else if (data.error_description) {
        errorMessage = data.error_description;
      } else if (data.error) {
        errorMessage = data.error;
      }
      
      return NextResponse.json(
        {
          error: errorMessage,
          error_description: errorMessage,
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
