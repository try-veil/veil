"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WalletBalance } from "@/lib/billing-api";

interface WalletBalanceCardProps {
  balance: WalletBalance | null;
  isLoading: boolean;
}

export default function WalletBalanceCard({ balance, isLoading }: WalletBalanceCardProps) {
  // Debug what we're receiving
  console.log('WalletBalanceCard received:', { balance, isLoading });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wallet Balance</CardTitle>
          <CardDescription>Your current credit balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="bg-gray-300 w-24 h-8 rounded mb-2"></div>
            <div className="bg-gray-300 w-16 h-4 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Balance</CardTitle>
        <CardDescription>Your current credit balance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">
              {balance?.balance || 0} Credits
            </div>
            {balance?.expiresAt && (
              <p className="text-sm text-muted-foreground">
                Expires: {new Date(balance.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <Badge variant={balance?.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {balance?.status || 'Unknown'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}