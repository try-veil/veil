import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password, role }: { email?: string; password?: string; role?: string } =
    await req.json();

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof role !== "string" ||
    !email ||
    !password ||
    ![process.env.NEXT_PUBLIC_ROLE_CONSUMER_ID, process.env.NEXT_PUBLIC_ROLE_PROVIDER_ID].includes(role)
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_FUSIONAUTH_CLIENT_ID;
  const clientSecret = process.env.FUSIONAUTH_CLIENT_SECRET;
  const fusionAuthUrl = process.env.NEXT_PUBLIC_FUSIONAUTH_URL;
  const apiKey = process.env.FUSIONAUTH_API_KEY; // Add this to .env.local
  try {
    // Step 1: Register the user
    console.log("Register Request:", {
      url: `${fusionAuthUrl}/api/user/register`,
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        user: { email, password, roles: [role] },
        registration: { applicationId: clientId },
      },
    });
    const registerResponse = await fetch(`${fusionAuthUrl}/api/user/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Buffer.from(`${apiKey}`).toString("base64")}`,
      },
      body: JSON.stringify({
        user: {
          email,
          password,
          roles: [role], // Assign the selected role
        },
        registration: {
          applicationId: clientId,
        },
      }),
    });
    const registerData: {
      user?: { id?: string };
      token?: string;
      refreshToken?: string;
      error?: string;
      fieldErrors?: { [key: string]: { code: number; message: string }[] };
    } = await registerResponse.json();
    console.log("Register Response:", registerData);

    if (!registerResponse.ok) {
      const errorMessage = registerData.error || registerData.fieldErrors?.email?.[0]?.message || "Registration failed";
      return NextResponse.json({ error: errorMessage }, { status: registerResponse.status });
    }

    // Step 2: Exchange for tokens using password grant
    const tokenResponse = await fetch(`${fusionAuthUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: "password",
        username: email,
        password,
        scope: "openid email profile offline_access",
      }),
    });

    const tokenData: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    } = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: tokenData.error_description || "Token exchange failed" },
        { status: tokenResponse.status }
      );
    }

    // Step 3: Set cookies
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `access_token=${tokenData.access_token}; HttpOnly; Path=/; Max-Age=${tokenData.expires_in}; SameSite=Strict`
    );
    if (tokenData.refresh_token) {
      headers.append(
        "Set-Cookie",
        `refresh_token=${tokenData.refresh_token}; HttpOnly; Path=/; Max-Age=${tokenData.expires_in}; SameSite=Strict`
      );
    }

    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}