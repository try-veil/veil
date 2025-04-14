import { NextResponse } from "next/server";

export async function POST() {
  const clientId = process.env.NEXT_PUBLIC_FUSIONAUTH_CLIENT_ID;
  const fusionAuthUrl = `${process.env.NEXT_PUBLIC_FUSIONAUTH_URL}/oauth2/logout?client_id=${clientId}`;

  try {
    await fetch(fusionAuthUrl, { method: "GET" });
    const headers = new Headers();
    headers.append("Set-Cookie", "access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict");
    headers.append("Set-Cookie", "refresh_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict");
    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}