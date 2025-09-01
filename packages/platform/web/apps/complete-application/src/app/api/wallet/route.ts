export interface Tenant {
  id: string;
  name: string;
  domain: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export async function createWallet(
  data: { userId: string; tenantId: string; initialCredits: number },
  token: string
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/internal/wallet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create wallet");
    }
  } catch (error) {
    console.error("[createWallet] Error:", error);
    throw error;
  }
}
