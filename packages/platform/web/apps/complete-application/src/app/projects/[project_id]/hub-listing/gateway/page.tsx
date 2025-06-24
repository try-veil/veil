"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { Input } from "@/components/ui/input";
import ContentSection from "@/features/settings/components/content-section";
import { useProject } from "@/context/project-context";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { updateProject } from "@/lib/api";

export default function Gateway() {
  const { selectedProject, refreshProject } = useProject();
  const { accessToken } = useAuth();

  const [formData, setFormData] = useState({
    proxySecret: "",
    requestSizeLimit: 0,
    proxyTimeout: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }

  async function handleSave() {
    if (!selectedProject?.id || !accessToken) {
      throw new Error("Project ID or access token not found");
    }

    setIsLoading(true);

    try {
      // Show loading toast
      toast({
        title: "Updating Gateway Settings...",
        description: "Please wait while we process your request",
        variant: "default",
      });

      await updateProject(accessToken, selectedProject.id, {
        ...selectedProject,
        proxySecret: formData.proxySecret,
        requestSizeLimitMb: Number(formData.requestSizeLimit),
        proxyTimeoutSeconds: Number(formData.proxyTimeout),
      } as any);

      setIsDirty(false);

      toast({
        title: "Success",
        description: "Gateway settings updated successfully",
      });

      await refreshProject();
    } catch (error) {
      console.error("Failed to save:", error);
      toast({
        title: "Error",
        description: "An error occurred while updating the settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleDiscard() {
    // Reset the form data to the initial selectedProject values
    setFormData({
      proxySecret: selectedProject?.hubListing?.proxySecret || "",
      requestSizeLimit: selectedProject?.hubListing?.requestSizeLimitMb || 0,
      proxyTimeout: selectedProject?.hubListing?.proxyTimeoutSeconds || 0,
    });
    setIsDirty(false);
  }

  return (
    <ContentSection title="Gateway" desc="Configure your gateway settings here">
      <form
        className="space-y-8 pb-8"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        {/* Firewall Settings */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Firewall Settings</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Protect your API by blocking requests that are not from the
              RapidAPI infrastructure.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Proxy Secret</Label>
            <PasswordInput
              placeholder="Enter your proxy secret"
              className="w-full"
              value={formData.proxySecret}
              onChange={(e) => handleChange("proxySecret", e.target.value)}
            />
          </div>
        </div>

        {/* Request Configurations */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Request Configurations</h3>
          </div>

          <div className="space-y-4 rounded-lg border p-4 w-fit">
            <div className="space-y-2 flex flex-row gap-8">
              <div className="space-y-2">
                <Label>Request Size Limit</Label>
                <p className="text-sm text-muted-foreground">
                  Configure the request message size
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="0"
                    className="w-[120px]"
                    min="0"
                    max="50"
                    value={formData.requestSizeLimit}
                    onChange={(e) =>
                      handleChange("requestSizeLimit", e.target.value)
                    }
                  />
                  MB
                </div>
                <p className="text-sm text-muted-foreground">
                  Max value is 50 MB
                </p>
              </div>
            </div>
          </div>

          {/* Proxy Timeout Setting */}
          <div className="space-y-4 rounded-lg border p-4 w-fit">
            <div className="space-y-2 flex flex-row gap-8">
              <div className="space-y-2">
                <Label>Proxy Timeout Setting</Label>
                <p className="text-sm text-muted-foreground">
                  Configure the timeout between the proxy and the target
                  endpoints
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="0"
                    className="w-[120px]"
                    min="0"
                    max="180"
                    value={formData.proxyTimeout}
                    onChange={(e) =>
                      handleChange("proxyTimeout", e.target.value)
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Max value is 180 Sec
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          {isDirty ? (
            <>
              <Button variant="outline" type="button" onClick={handleDiscard}>
                Discard Changes
              </Button>
              <Button type="submit" disabled={isLoading}>
                Save Changes
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </form>
    </ContentSection>
  );
}
