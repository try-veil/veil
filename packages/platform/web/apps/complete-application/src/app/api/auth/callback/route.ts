import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  const { code, role }: { code?: string; role?: string } = await req.json();

  // Validate code
  if (typeof code !== "string") {
    console.error("Invalid code:", code);
    return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
  }

  // Validate role (allow undefined for existing users)
  if (role && ![process.env.NEXT_PUBLIC_ROLE_CONSUMER_ID, process.env.NEXT_PUBLIC_ROLE_PROVIDER_ID].includes(role)) {
    console.error("Invalid role:", role);
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_FUSIONAUTH_CLIENT_ID;
  const clientSecret = process.env.FUSIONAUTH_CLIENT_SECRET;
  const apiKey = process.env.FUSIONAUTH_API_KEY;
  const fusionAuthUrl = process.env.NEXT_PUBLIC_FUSIONAUTH_URL;
  const tenantId = process.env.FUSIONAUTH_TENANT_ID || "";
  const redirectUri = "http://localhost:3000/callback"; // Update for production
  const tokenUrl = `${fusionAuthUrl}/oauth2/token`;

  try {
    // Step 1: Exchange code for tokens
    console.log("Exchanging code for tokens...");
    const tokenResponse = await fetch(tokenUrl, {
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
      console.error("Token exchange failed:", tokenData);
      return NextResponse.json(
        {
          error: tokenData.error,
          error_description: tokenData.error_description || "Failed to get access token",
        },
        { status: tokenResponse.status }
      );
    }

    // Step 2: Set cookies
    const headers = new Headers();
    if (tokenData.access_token) {
      headers.append(
        "Set-Cookie",
        `access_token=${tokenData.access_token}; HttpOnly; Path=/; Max-Age=${tokenData.expires_in || 3600}; SameSite=Strict`
      );
    } else {
      console.warn("No access_token in token response");
    }
    if (tokenData.refresh_token) {
      headers.append(
        "Set-Cookie",
        `refresh_token=${tokenData.refresh_token}; HttpOnly; Path=/; Max-Age=${tokenData.expires_in || 3600}; SameSite=Strict`
      );
    }

    // Step 3: Assign role if provided
    if (role) {
      // Get userId from access_token (JWT)
      let userId: string | undefined;
      if (tokenData.access_token) {
        try {
          const decoded = jwt.decode(tokenData.access_token) as { sub?: string };
          userId = decoded?.sub;
          console.log("Decoded userId from JWT:", userId);
        } catch (jwtError) {
          console.error("JWT decode error:", jwtError);
          // Continue login even if JWT decoding fails
        }
      }

      if (userId) {
        const fusionAuthRole = role === process.env.NEXT_PUBLIC_ROLE_CONSUMER_ID ? "consumer" : "provider";
        const registrationUrl = `${fusionAuthUrl}/api/user/registration/${userId}/${clientId}`;
        const registrationBody = {
          registration: {
            applicationId: clientId,
            roles: [fusionAuthRole],
          },
        };

        console.log("Attempting PUT to:", registrationUrl, "with body:", registrationBody);

        const putResponse = await fetch(registrationUrl, {
          method: "PUT",
          headers: {
            Authorization: apiKey!,
            "Content-Type": "application/json",
            "X-FusionAuth-TenantId": tenantId,
          },
          body: JSON.stringify(registrationBody),
        });

        const putData = await putResponse.json().catch(() => ({}));

        if (putResponse.ok) {
          console.log("Role assignment successful:", putData);
        } else {
          console.error("Role assignment failed:", putData);
          // Log error but continue login to avoid breaking the flow
        }
      } else {
        console.warn("No userId found, skipping role assignment");
      }
    } else {
      console.log("No role provided, skipping role assignment");
    }

    // Step 4: Return success
    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}