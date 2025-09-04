"use client"
import {useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import {
  getWalletInfo,
  getCurrentBalance,
  WalletBalance,
} from "@/lib/billing-api";
import TransactionHistory from '@/features/billing/components/TransactionHistory'
const History = () => {
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
    
          const walletInfo = await getWalletInfo(accessToken, user.id);
          setWalletId(walletInfo.walletId);
    
          try {
            const detailedBalance = await getCurrentBalance(accessToken, user.id);
          } catch (balanceErr) {
            console.warn(
              "Credit service balance failed, using wallet balance:",
              balanceErr
            );
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
        <TransactionHistory walletId={walletId} />
  )
}

export default History