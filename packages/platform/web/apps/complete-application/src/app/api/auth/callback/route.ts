import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { code }: { code?: string } = await req.json();

  if (typeof code !== "string") {
    return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_FUSIONAUTH_CLIENT_ID;
  const clientSecret = process.env.FUSIONAUTH_CLIENT_SECRET;
  const redirectUri = "http://localhost:3000/callback"; // Update for production
  const tokenUrl = `${process.env.NEXT_PUBLIC_FUSIONAUTH_URL}/oauth2/token`;

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        scope: "openid email profile offline_access"
      }),
    });

    const data: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    } = await response.json();

    if (response.ok) {
      const headers = new Headers();
      headers.append(
        "Set-Cookie",
        `access_token=${data.access_token}; HttpOnly; Path=/; Max-Age=${data.expires_in}; SameSite=Strict`
      );
      if (data.refresh_token) {
        headers.append(
          "Set-Cookie",
          `refresh_token=${data.refresh_token}; HttpOnly; Path=/; Max-Age=${data.expires_in}; SameSite=Strict`
        );
      }
      return NextResponse.json({ success: true }, { status: 200, headers });
    } else {
      return NextResponse.json(
        { error: data.error, error_description: data.error_description || "Failed to get access token" },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error("Token exchange error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}