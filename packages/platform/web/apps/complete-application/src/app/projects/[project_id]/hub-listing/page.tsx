"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageIcon } from "lucide-react";
import ContentSection from "@/features/settings/components/content-section";
import { useProject } from "@/context/project-context";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { updateProject } from "@/lib/api";

export default function HubListingPage() {
  const { selectedProject, refreshProject } = useProject();

  const [formData, setFormData] = useState({
    logo: "",
    category: "",
    shortDescription: "",
    longDescription: "",
    website: "",
    termsOfUse: "",
    visibleToPublic: false,
    healthCheckUrl: "",
  });

  const [isDirty, setIsDirty] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const { accessToken } = useAuth();

  useEffect(() => {
    if (selectedProject?.hubListing) {
      setFormData({
        logo: selectedProject.hubListing.logo || "",
        category: selectedProject.hubListing.category || "",
        shortDescription: selectedProject.hubListing.shortDescription || "",
        longDescription: selectedProject.hubListing.longDescription || "",
        website: selectedProject.hubListing.website || "",
        termsOfUse: selectedProject.hubListing.termsOfUse || "",
        visibleToPublic: selectedProject.hubListing.visibleToPublic || false,
        healthCheckUrl: selectedProject.hubListing.healthCheckUrl || "",
      });
    }
  }, [selectedProject]);

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }

  async function handleSave() {
    if (!selectedProject) return;
    setIsLoading(true);
    updateProject;
    try {
      
      if (!selectedProject?.id || !accessToken) {
        throw new Error("Project ID or access token not found");
      }

      // Show loading toast
      toast({
        title: "Updating Project...",
        description: "Please wait while we process your request",
        variant: "default",
      });

      await updateProject(accessToken, selectedProject.id, {
        ...selectedProject,
        logo: formData.logo,
        category: formData.category,
        shortDescription: formData.shortDescription,
        longDescription: formData.longDescription,
        website: formData.website,
        termsOfUse: formData.termsOfUse,
        visibleToPublic: formData.visibleToPublic,
        healthCheckUrl: formData.healthCheckUrl,
      } as any);
      

      setIsDirty(false);

      toast({
        title: "Success",
        description: "Project updated successfully",
      });

      await refreshProject();
    } catch (error) {
      console.error("Failed to save:", error);
    }
  }

  function handleDiscard() {
    if (selectedProject?.hubListing) {
      setFormData({
        logo: selectedProject.hubListing.logo || "",
        category: selectedProject.hubListing.category || "",
        shortDescription: selectedProject.hubListing.shortDescription || "",
        longDescription: selectedProject.hubListing.longDescription || "",
        website: selectedProject.hubListing.website || "",
        termsOfUse: selectedProject.hubListing.termsOfUse || "",
        visibleToPublic: selectedProject.hubListing.visibleToPublic || false,
        healthCheckUrl: selectedProject.hubListing.healthCheckUrl || "",
      });
    }
    setIsDirty(false);
  }

  return (
    <ContentSection
      title="Marketplace Listing"
      desc="Manage how your API looks at marketplace"
    >
      <form
        className="space-y-6 pb-8"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        {/* Logo Upload */}
        <div className="space-y-2">
          <div className="flex items-start gap-4">
            <div className="flex flex-col justify-between h-24 pt-1">
              <Label>Upload Logo</Label>
              {/* <Input
                type="file"
                accept="image/jpeg,image/png"
                className="h-9 w-full max-w-2xl"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      handleChange("logo", reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              /> */}
              <p className="text-sm text-muted-foreground">
                Maximum Size: 500 x 500px, JPEG / PNG
              </p>
            </div>
            <div className="w-24 h-24 border rounded-md overflow-hidden bg-muted flex items-center justify-center">
              {formData.logo ? (
                <></>
              ) : (
                // <Image
                //   src={formData.logo}
                //   alt="Logo preview"
                //   width={96}
                //   height={96}
                //   className="object-contain"
                // />
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mb-1" />
                  <span className="text-xs">No logo</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => handleChange("category", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="API">API</SelectItem>
              <SelectItem value="Database">Database</SelectItem>
              <SelectItem value="Storage">Storage</SelectItem>
              <SelectItem value="Analytics">Analytics</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Short Description */}
        <div className="space-y-2">
          <Label>Short Description</Label>
          <Input
            placeholder="Enter a short description"
            className="h-9 w-full"
            value={formData.shortDescription}
            onChange={(e) => handleChange("shortDescription", e.target.value)}
          />
        </div>

        {/* Long Description */}
        <div className="space-y-2">
          <Label>Long Description</Label>
          <textarea
            value={formData.longDescription}
            placeholder="Enter a detailed description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(e) => handleChange("longDescription", e.target.value)}
          />
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label>Website</Label>
          <Input
            type="url"
            placeholder="https://example.com"
            className="h-9 w-full"
            value={formData.website}
            onChange={(e) => handleChange("website", e.target.value)}
          />
        </div>

        {/* Terms of Use */}
        <div className="space-y-2">
          <Label>Terms of Use</Label>
          <textarea
            value={formData.termsOfUse}
            placeholder="Enter terms of use"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(e) => handleChange("termsOfUse", e.target.value)}
          />
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <Label>Visibility</Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="visibility"
              checked={formData.visibleToPublic}
              onCheckedChange={(checked) =>
                handleChange("visibleToPublic", checked)
              }
            />
            <Label htmlFor="visibility">Visible to Public</Label>
          </div>
        </div>

        {/* Health Check URL */}
        <div className="space-y-2">
          <Label>Health Check URL</Label>
          <Input
            type="url"
            placeholder="https://api.example.com/health"
            className="h-9 w-full"
            value={formData.healthCheckUrl}
            onChange={(e) => handleChange("healthCheckUrl", e.target.value)}
          />
        </div>

        {/* Buttons */}
        {isDirty ? (
          <>
            <div className="flex space-x-4">
              <Button variant="outline" type="button" onClick={handleDiscard}>
                Discard Changes
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </>
        ) : (
          <div className="flex space-x-4">
            <Button
              variant="outline"
              type="button"
              disabled
              onClick={handleDiscard}
            >
              Discard Changes
            </Button>
            <Button disabled type="submit">
              Save Changes
            </Button>
          </div>
        )}
      </form>
    </ContentSection>
  );
}
