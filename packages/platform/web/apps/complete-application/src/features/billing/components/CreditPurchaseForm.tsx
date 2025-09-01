"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { purchaseCredits, confirmPayment } from "@/lib/billing-api";

interface CreditPurchaseFormProps {
  onPurchaseSuccess: () => void;
}

const CREDIT_PACKAGES = [
  { credits: 10, price: 10, label: "10 Credits - ₹10" },
  { credits: 50, price: 50, label: "50 Credits - ₹50" },
  { credits: 100, price: 100, label: "100 Credits - ₹100" },
  { credits: 500, price: 500, label: "500 Credits - ₹500" },
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CreditPurchaseForm({
  onPurchaseSuccess,
}: CreditPurchaseFormProps) {
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { accessToken } = useAuth();
  const { user, isLoading: userLoading } = useUser();

  // Debug user data
  console.log("CreditPurchaseForm - User data:", {
    user,
    userLoading,
    hasUser: !!user,
    userId: user?.id,
    userName: user?.name,
    userEmail: user?.email,
  });

  const handlePurchase = async () => {
    if (!selectedPackage || !accessToken || !user?.id) return;

    const pkg = CREDIT_PACKAGES.find(
      (p) => p.credits.toString() === selectedPackage
    );
    if (!pkg) return;

    // Debug user data
    console.log("User data for purchase:", {
      id: user.id,
      name: user.name,
      email: user.email,
      hasName: !!user.name,
      hasEmail: !!user.email,
    });

    try {
      setIsLoading(true);

      // Create Razorpay order
      const order = await purchaseCredits(
        accessToken,
        user.id,
        pkg.credits,
        pkg.price
      );

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      // Configure Razorpay options
      const options = {
        key: order.keyId,
        amount: order.amount * 100, // Convert to paise
        currency: order.currency,
        name: "Veil Credits",
        description: `Purchase ${pkg.credits} credits`,
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            // Confirm payment with backend
            await confirmPayment(accessToken, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            // Success - refresh balance
            onPurchaseSuccess();
            setSelectedPackage("");
            alert("Credits purchased successfully!");
          } catch (error) {
            console.error("Payment confirmation failed:", error);
            alert("Payment confirmation failed. Please contact support.");
          }
        },
        prefill: {
          email: user.email || "",
          name: user.name || "",
        },
        theme: {
          color: "#000000",
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
      };

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Purchase failed:", error);
      alert("Failed to initiate purchase. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Credits</CardTitle>
        <CardDescription>Buy credits to use API services</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Select Credit Package
          </label>
          <Select value={selectedPackage} onValueChange={setSelectedPackage}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a package" />
            </SelectTrigger>
            <SelectContent>
              {CREDIT_PACKAGES.map((pkg) => (
                <SelectItem key={pkg.credits} value={pkg.credits.toString()}>
                  {pkg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">
          These credits can be used for subscription to APIs and API calls. They
          never expire and are equivalent to INR.
        </p>

        <Button
          onClick={handlePurchase}
          disabled={!selectedPackage || isLoading || userLoading || !user?.id}
          className="w-full"
        >
          {isLoading
            ? "Processing..."
            : userLoading
              ? "Loading user data..."
              : !user?.id
                ? "User not loaded"
                : "Purchase Credits"}
        </Button>

        <p className="text-xs text-muted-foreground">
          Secure payment powered by Razorpay. Credits are added instantly after
          successful payment.
        </p>
      </CardContent>
    </Card>
  );
}
