"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import {
  getWalletInfo,
  getCurrentBalance,
  WalletBalance,
} from "@/lib/billing-api";
import WalletBalanceCard from "./components/WalletBalanceCard";
import CreditPurchaseForm from "./components/CreditPurchaseForm";
import LinkBankAccount from "./components/LinkBankAccount";

export default function BillingContent() {
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(
    null
  );
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();
  const { user } = useUser();

  const loadWalletData = async () => {
    if (!accessToken || !user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get wallet info which includes walletId and balance
      const walletInfo = await getWalletInfo(accessToken, user.id);
      setWalletId(walletInfo.walletId);

      // Use the current balance from credit service for more detailed info
      try {
        const detailedBalance = await getCurrentBalance(accessToken, user.id);
        setWalletBalance({
          ...detailedBalance,
          walletId: walletInfo.walletId,
        });
      } catch (balanceErr) {
        // Fallback to wallet info if credit service fails
        console.warn(
          "Credit service balance failed, using wallet balance:",
          balanceErr
        );
        setWalletBalance({
          balance: walletInfo.balance,
          status: "ACTIVE",
          walletId: walletInfo.walletId,
        });
      }
    } catch (err) {
      console.error("Error loading wallet data:", err);
      setError("Failed to load wallet data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, [accessToken, user?.id]);

  const handlePurchaseSuccess = () => {
    // Refresh wallet data after successful purchase
    loadWalletData();
  };

  if (error) {
    return (
      <div className="flex justify-center items-center h-full text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center pb-4">
      {/* Content Section */}
      <div className="flex-1 overflow-auto py-2">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Wallet & Purchase */}
          <div className="space-y-6">
            <WalletBalanceCard balance={walletBalance} isLoading={isLoading} />
            <LinkBankAccount />
          </div>

          {/* Right Column - Transaction History */}
          <div>
            <CreditPurchaseForm onPurchaseSuccess={handlePurchaseSuccess} />
          </div>
        </div>
      </div>
    </div>
  );
}
