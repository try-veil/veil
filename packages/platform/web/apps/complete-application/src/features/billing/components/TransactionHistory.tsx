"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getTransactionHistory, Transaction } from "@/lib/billing-api";

interface TransactionHistoryProps {
  walletId: string | null;
}

export default function TransactionHistory({ walletId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    const loadTransactions = async () => {
      if (!accessToken || !walletId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const history = await getTransactionHistory(accessToken, walletId);
        setTransactions(history);
      } catch (err) {
        console.error("Error loading transaction history:", err);
        setError("Failed to load transaction history");
        setTransactions([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, [accessToken, walletId]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatAmount = (amount: number, type: string) => {
    const prefix = type.toLowerCase().includes('debit') || type.toLowerCase().includes('deduct') ? '-' : '+';
    return `${prefix}${Math.abs(amount)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Recent credit transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="flex justify-between items-center p-3 border rounded">
                  <div className="space-y-2">
                    <div className="bg-gray-300 w-32 h-4 rounded"></div>
                    <div className="bg-gray-300 w-24 h-3 rounded"></div>
                  </div>
                  <div className="bg-gray-300 w-16 h-6 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            {error}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <div className="font-medium">
                    {transaction.description || transaction.type}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(transaction.createdAt).toLocaleDateString()} at{' '}
                    {new Date(transaction.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatAmount(transaction.amount, transaction.type)} credits
                  </span>
                  <Badge variant={getStatusColor(transaction.status)}>
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}