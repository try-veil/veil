import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const { email, password, role }: { email?: string; password?: string; role?: string } =
    await req.json();
  const userId = uuidv4();


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


  const clientId = process.env.NEXT_PUBLIC_FUSIONAUTH_CLIENT_ID!;
  const clientSecret = process.env.FUSIONAUTH_CLIENT_SECRET!;
  const fusionAuthUrl = process.env.NEXT_PUBLIC_FUSIONAUTH_URL!;
  const apiKey = process.env.FUSIONAUTH_API_KEY!;
  const tenantId = process.env.FUSIONAUTH_TENANT_ID || ""; 

  try {

    const registerResponse = await fetch(`${fusionAuthUrl}/api/user/registration`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${apiKey}`, 
        "X-FusionAuth-TenantId": tenantId, 
      },
      body: JSON.stringify({
        user: {
          email: email.toLowerCase(), 
          password,
          username: email, 
          firstName: email.split("@")[0] || "User", 
          lastName: "User", 
        },
        registration: {
          applicationId: clientId,
          roles: [role === process.env.NEXT_PUBLIC_ROLE_CONSUMER_ID ? "consumer" : "provider"], 
          username: email,
        },
        skipVerification: true, 
      }),
    });

    const registerData = await registerResponse.json().catch(() => ({})); 

    if (!registerResponse.ok) {
      const fieldError = registerData?.fieldErrors;
      const firstErrorMessage =
        fieldError?.["user.email"]?.[0]?.message ||
        fieldError?.["userId"]?.[0]?.message ||
        registerData?.error ||
        "Registration failed";
      console.error("Registration error:", firstErrorMessage);
      return NextResponse.json({ error: firstErrorMessage, error_description: firstErrorMessage }, { status: registerResponse.status });
    }


    const tokenResponse = await fetch(`${fusionAuthUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "password",
        username: email,
        password,
        scope: "openid email profile offline_access",
      }),
    });

    const tokenData = await tokenResponse.json().catch(() => ({}));

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: tokenData?.error_description || "Token exchange failed", error_description: tokenData?.error_description },
        { status: tokenResponse.status }
      );
    }

    // Return tokens and user data for NextAuth
    return NextResponse.json({ 
      success: true,
      user: {
        id: registerData.user.id,
        name: registerData.user.firstName + ' ' + registerData.user.lastName,
        email: registerData.user.email
      },
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}