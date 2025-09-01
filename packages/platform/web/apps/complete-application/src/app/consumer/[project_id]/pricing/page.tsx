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

  const { accessToken } = useAuth();
  const { selectedProject, isLoading: projectLoading } = useProject();

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
          <div className="text-center mt-8">
            <Button className="w-full">Choose Basic Plan</Button>
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
          <div className="text-center mt-8">
            <Button className="w-full">Upgrade to Pro Plan</Button>
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
          <div className="text-center mt-8">
            <Button className="w-full">Choose Ultra Plan</Button>
          </div>
        </Card>
      </div>

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
