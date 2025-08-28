const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export interface WalletBalance {
  balance: number;
  status: string;
  expiresAt?: string;
  walletId?: string; // Add walletId to the response
}

export interface Transaction {
  id: string;
  transaction_id?: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
  timestamp?: string;
  status: string;
  reference_id?: string;
}

export interface PurchaseOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  status: string;
}

export interface PaymentConfirmation {
  success: boolean;
  creditsAdded: number;
  newBalance: number;
}

/**
 * Get wallet balance using walletId
 */
export async function getWalletBalance(token: string, walletId: string): Promise<WalletBalance> {
  try {
    const response = await fetch(`${API_BASE_URL}/internal/wallet/balance/${walletId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch wallet balance');
    }

    return {
      balance: data.balance,
      status: 'ACTIVE', // Default status
      walletId: data.walletId
    };
  } catch (error) {
    console.error('[getWalletBalance] Error:', error);
    throw error;
  }
}

/**
 * Get current balance for user (uses credit service)
 */
export async function getCurrentBalance(token: string, userId: string): Promise<WalletBalance> {
  try {
    const response = await fetch(`${API_BASE_URL}/internal/credits/${userId}/balance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch current balance');
    }

    return data;
  } catch (error) {
    console.error('[getCurrentBalance] Error:', error);
    throw error;
  }
}

/**
 * Purchase credits - creates Razorpay order
 */
export async function purchaseCredits(
  token: string, 
  userId: string, 
  creditAmount: number, 
  amountInRupees: number
): Promise<PurchaseOrderResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/internal/credits/${userId}/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        creditAmount,
        amountInRupees
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create purchase order');
    }

    return data;
  } catch (error) {
    console.error('[purchaseCredits] Error:', error);
    throw error;
  }
}

/**
 * Confirm payment after Razorpay success
 */
export async function confirmPayment(
  token: string,
  paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }
): Promise<PaymentConfirmation> {
  try {
    const response = await fetch(`${API_BASE_URL}/internal/credits/confirm-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to confirm payment');
    }

    return data;
  } catch (error) {
    console.error('[confirmPayment] Error:', error);
    throw error;
  }
}

/**
 * Get wallet info for a user (includes walletId)
 */
export async function getWalletInfo(token: string, userId: string): Promise<{ walletId: string; balance: number; currency: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/internal/wallet/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch wallet info');
    }

    return data;
  } catch (error) {
    console.error('[getWalletInfo] Error:', error);
    throw error;
  }
}

/**
 * Get transaction history using walletId
 */
export async function getTransactionHistory(token: string, walletId: string): Promise<Transaction[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/internal/wallet/${walletId}/transactions?type=credit&limit=10&offset=0`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch transaction history');
    }

    // Map the response to our Transaction interface
    return data.transactions?.map((t: any) => ({
      id: t.transaction_id || t.id,
      amount: t.amount,
      type: t.type,
      description: t.description || 'Transaction',
      createdAt: t.timestamp || t.createdAt,
      status: 'completed', // Wallet transactions are always completed
      reference_id: t.reference_id
    })) || [];
  } catch (error) {
    console.error('[getTransactionHistory] Error:', error);
    throw error;
  }
}