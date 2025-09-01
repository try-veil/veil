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

export async function getWalletBalance(walletId: string, token: string): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/internal/wallet/balance/${walletId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch wallet balance");
    }

    const data = await response.json();
    return data.balance;
  } catch (error) {
    console.error("[getWalletBalance] Error:", error);
    throw error;
  }
}

export async function deductWalletBalance(walletId: string, amount: number, token: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/internal/wallet/${walletId}/credits/deduct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to deduct wallet balance");
    }
  } catch (error) {
    console.error("[deductWalletBalance] Error:", error);
    throw error;
  }
}

export async function getWalletInfo(userId: string, token: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/internal/wallet/user/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch wallet info");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[getWalletInfo] Error:", error);
    throw error;
  }
}

export async function subscribeToApi(pricing: number, userId: string, token: string): Promise<void> {
  try {
    // Get wallet info
    const walletInfo = await getWalletInfo(userId, token);
    const walletId = walletInfo.walletId;

    if (!walletId) {
      throw new Error("Wallet ID not found");
    }

    // Check wallet balance
    const walletBalance = await getWalletBalance(walletId, token);

    if (pricing <= walletBalance) {
      // Deduct wallet balance
      await deductWalletBalance(walletId, pricing, token);
    } else {
      throw new Error("Insufficient wallet balance");
    }
  } catch (error) {
    console.error("[subscribeToApi] Error:", error);
    throw error;
  }
}

