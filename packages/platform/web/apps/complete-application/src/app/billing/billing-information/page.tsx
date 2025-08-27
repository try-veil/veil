"use client";
import BillingInformationContent from "@/features/billing/billing-information";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BillingInformationPage() {
  const router = useRouter();

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div className="pt-24 px-4">
        <div className="max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/billing')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Billing Overview
          </Button>
        </div>
      </div>
      <BillingInformationContent />
    </div>
  );
}