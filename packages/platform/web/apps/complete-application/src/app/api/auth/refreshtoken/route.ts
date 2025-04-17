import { NextRequest, NextResponse } from "next/server";

type RefreshTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.message || "Refresh token failed" }, { status: 401 });
    }

    const data: RefreshTokenResponse = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
