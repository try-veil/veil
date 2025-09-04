"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/context/project-context";
import {
  getProjectWithHubListing,
  ProjectWithHubListing,
} from "@/app/api/consumer/route";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Globe,
  FileText,
  Activity,
  Book,
  ExternalLink,
  Building,
  Tag,
  Info,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { subscribeToApi } from "@/app/api/wallet/route";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { getWalletBalance } from "@/app/api/wallet/route";

// Dynamically import MarkdownPreview for rendering only
const MarkdownPreview = dynamic(
  () => import("@uiw/react-markdown-preview").then((mod) => mod.default),
  { ssr: false }
);

const Overview = () => {
  const [projectData, setProjectData] = useState<ProjectWithHubListing | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    oldBalance: number;
    newBalance: number;
    pricing: number;
  } | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const { accessToken } = useAuth();
  const { selectedProject, isLoading: projectLoading } = useProject();
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!accessToken || !selectedProject?.id || projectLoading) {
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const data = await getProjectWithHubListing(
          accessToken,
          selectedProject.id.toString()
        );

        setProjectData(data);
        console.log("Project data loaded:", data);
      } catch (err) {
        console.error("Error fetching project data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load project details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [accessToken, selectedProject?.id, projectLoading]);

  const handleSubscribe = async () => {
    if (!selectedPlan || !accessToken || !projectData?.hubListing) return;

    let pricing: number | undefined;
    if (selectedPlan === "basicPlan") {
      pricing = projectData?.hubListing.basicPlan?.pricePerMonth;
    } else if (selectedPlan === "proPlan") {
      pricing = projectData?.hubListing.proPlan?.pricePerMonth;
    } else if (selectedPlan === "ultraPlan") {
      pricing = projectData?.hubListing.ultraPlan?.pricePerMonth;
    }
    const userId = user?.id;

    if (typeof pricing !== "number") {
      alert("Pricing information is missing for the selected plan.");
      return;
    }

    try {
      setIsProcessing(true);
      const { oldBalance, newBalance } = await subscribeToApi(pricing, userId, accessToken);

      setSubscriptionDetails({
        oldBalance: parseFloat(oldBalance.toFixed(2)),
        newBalance: parseFloat(newBalance.toFixed(2)),
        pricing,
      });
      setIsSubscriptionModalOpen(true);
    } catch (err: any) {
      alert(err.message || "Failed to subscribe to the plan.");
    } finally {
      setIsProcessing(false);
      setIsDialogOpen(false);
    }
  };

  // Show loading state
  if (projectLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show no data state
  if (!projectData) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>No project data available.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const hubListing = projectData.hubListing;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-start space-x-4">
        {hubListing?.logo && (
          <div className="flex-shrink-0">
            <Image
              src={hubListing.logo}
              alt="Logo preview"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
        )}
        <div className="flex-grow">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl font-bold">{projectData.name}</h1>
            {hubListing?.visibleToPublic && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Public
              </Badge>
            )}
          </div>
          {hubListing?.shortDescription && (
            <p className="text-sm text-muted-foreground mb-2">
              {hubListing.shortDescription}
            </p>
          )}
          {hubListing?.category && (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline">{hubListing.category}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {/* Basic Plan */}
        <Card className="border rounded-lg shadow-md p-4">
          <CardHeader>
            <h2 className="text-lg font-bold">Basic</h2>
            <p className="text-2xl font-bold">
              {hubListing?.basicPlan?.pricePerMonth}{" "}
              <span className="text-sm">{`credits / mo`}</span>
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-2">
              <p className="text-sm text-muted-foreground">Requests</p>
              <p className="text-sm font-medium">
                {hubListing?.basicPlan?.requestQuotaPerMonth} requests per month
              </p>
            </div>
            <hr />
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">Hard Limit</p>
              <p className="text-sm font-medium">
                {hubListing?.basicPlan?.hardLimitQuota} requests per month
              </p>
            </div>
          </CardContent>
          <div className="text-center mt-8 mb-4">
            <Button
              className="w-full"
              onClick={() => {
                setSelectedPlan("basicPlan");
                setIsDialogOpen(true);
              }}
            >
              Choose Basic Plan
            </Button>
          </div>
        </Card>

        {/* Pro Plan */}
        <Card className="border rounded-lg shadow-md p-4">
          <CardHeader>
            <h2 className="text-lg font-bold">Pro</h2>
            <p className="text-2xl font-bold">
              {hubListing?.proPlan?.pricePerMonth}{" "}
              <span className="text-sm">{`credits / mo`}</span>
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-2">
              <p className="text-sm text-muted-foreground">Requests</p>
              <p className="text-sm font-medium">
                {hubListing?.proPlan?.requestQuotaPerMonth} requests per month
              </p>
            </div>
            <hr />
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">Hard Limit</p>
              <p className="text-sm font-medium">
                {hubListing?.proPlan?.hardLimitQuota} requests per month
              </p>
            </div>
          </CardContent>
          <div className="text-center mt-8 mb-4">
            <Button
              className="w-full"
              onClick={() => {
                setSelectedPlan("proPlan");
                setIsDialogOpen(true);
              }}
            >
              Upgrade to Pro Plan
            </Button>
          </div>
        </Card>

        {/* Ultra Plan */}
        <Card className="border rounded-lg shadow-md p-4">
          <CardHeader>
            <h2 className="text-lg font-bold">Ultra</h2>
            <p className="text-2xl font-bold">
              {hubListing?.ultraPlan?.pricePerMonth}{" "}
              <span className="text-sm">{`credits / mo`}</span>
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-2">
              <p className="text-sm text-muted-foreground">Requests</p>
              <p className="text-sm font-medium">
                {hubListing?.ultraPlan?.requestQuotaPerMonth} requests per month
              </p>
            </div>
            <hr />
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">Hard Limit</p>
              <p className="text-sm font-medium">
                {hubListing?.ultraPlan?.hardLimitQuota} requests per month
              </p>
            </div>
          </CardContent>
          <div className="text-center mt-8 mb-4">
            <Button
              className="w-full"
              onClick={() => {
                setSelectedPlan("ultraPlan");
                setIsDialogOpen(true);
              }}
            >
              Choose Ultra Plan
            </Button>
          </div>
        </Card>
      </div>

      {/* Subscription Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to subscribe to the {selectedPlan}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className={isProcessing ? "animate-pulse" : ""}
            >
              {isProcessing ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Successful Subscription Modal */}
      <Dialog open={isSubscriptionModalOpen} onOpenChange={setIsSubscriptionModalOpen}>
        {/* <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscription Successful</DialogTitle>
            <DialogDescription>
              <div className="space-y-4">
                <p>Old Wallet Balance: {subscriptionDetails?.oldBalance} credits</p>
                <p>Pricing: {subscriptionDetails?.pricing} credits</p>
                <p>New Wallet Balance: {subscriptionDetails?.newBalance} credits</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsSubscriptionModalOpen(false);
                router.push(`/consumer/${selectedProject?.id}/playground`);
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent> */}
        <DialogContent className="animate-fadeIn bg-white text-black p-6 rounded-lg shadow-md border border-gray-300 w-[400px]">
  <DialogHeader className="border-b border-dashed border-gray-400 pb-4 mb-4">
    <DialogTitle className="text-2xl font-bold text-center">Receipt</DialogTitle>
    <DialogDescription className="text-center text-gray-600">
      Subscription Successful
    </DialogDescription>
  </DialogHeader>

  {/* Bill body */}
  <div className="space-y-3 font-mono text-sm">
    <div className="flex justify-between">
      <span>Previous Wallet Balance</span>
      <span>{subscriptionDetails?.oldBalance} credits</span>
    </div>
    <div className="flex justify-between">
      <span>Pricing</span>
      <span>{subscriptionDetails?.pricing} credits</span>
    </div>
    <div className="flex justify-between font-bold border-t border-dashed border-gray-400 pt-2">
      <span>Current Wallet Balance</span>
      <span>{subscriptionDetails?.newBalance} credits</span>
    </div>
  </div>

  {/* Stamp effect */}
  <div className="absolute top-16 right-6 text-3xl font-extrabold text-green-600 border-4 border-green-600 px-4 py-2 rounded-md uppercase rotate-[-10deg] animate-stamp opacity-90">
    Successful
  </div>

  {/* Footer */}
  <div className="border-t border-dashed border-gray-400 mt-6 pt-4 flex justify-center text-xs text-gray-500">
    Thank you for your subscription!
  </div>

  {/* Close button */}
  <div className="flex justify-end gap-4 mt-6">
    <Button
      variant="outline"
      onClick={() => {
        setIsSubscriptionModalOpen(false)
        router.push(`/consumer/${selectedProject?.id}/playground`)
      }}
    >
      Close
    </Button>
  </div>
</DialogContent>

      </Dialog>

      {/* No Hub Listing Message */}
      {!hubListing && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This project doesn't have pricing configured yet.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default Overview;
