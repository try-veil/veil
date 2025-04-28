"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/project-context";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { updateProject } from "@/lib/api";
import ContentSection from "@/features/settings/components/content-section";

export default function Monetize() {
  const { selectedProject, refreshProject } = useProject();
  const { accessToken } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  const [formData, setFormData] = useState({
    basicPlan: {
      enabled: true,
      pricePerMonth: 0,
      requestQuotaPerMonth: 0,
      hardLimitQuota: 0
    },
    proPlan: {
      enabled: true,
      pricePerMonth: 0,
      requestQuotaPerMonth: 0,
      hardLimitQuota: 0
    },
    ultraPlan: {
      enabled: true,
      pricePerMonth: 0,
      requestQuotaPerMonth: 0,
      hardLimitQuota: 0
    }
  });

  // Initialize form data when selectedProject changes
  useEffect(() => {
    if (selectedProject?.monetization) {
      const { monetization } = selectedProject;
      setFormData({
        basicPlan: {
          enabled: monetization?.basicPlan?.enabled ?? true,
          pricePerMonth: monetization?.basicPlan?.pricePerMonth ?? 0,
          requestQuotaPerMonth: monetization?.basicPlan?.requestQuotaPerMonth ?? 0,
          hardLimitQuota: monetization?.basicPlan?.hardLimitQuota ?? 0
        },
        proPlan: {
          enabled: monetization?.proPlan?.enabled ?? true,
          pricePerMonth: monetization?.proPlan?.pricePerMonth ?? 0,
          requestQuotaPerMonth: monetization?.proPlan?.requestQuotaPerMonth ?? 0,
          hardLimitQuota: monetization?.proPlan?.hardLimitQuota ?? 0
        },
        ultraPlan: {
          enabled: monetization?.ultraPlan?.enabled ?? true,
          pricePerMonth: monetization?.ultraPlan?.pricePerMonth ?? 0,
          requestQuotaPerMonth: monetization?.ultraPlan?.requestQuotaPerMonth ?? 0,
          hardLimitQuota: monetization?.ultraPlan?.hardLimitQuota ?? 0
        }
      });
    }
  }, [selectedProject]);

  function handleChange(plan, field, value) {
    setFormData((prev) => ({
      ...prev,
      [plan]: {
        ...prev[plan],
        [field]: field === 'enabled' ? value : Number(value)
      }
    }));
    setIsDirty(true);
  }

  async function handleSave(e) {
    if (e) e.preventDefault();
    
    if (!selectedProject?.id || !accessToken) {
      throw new Error("Project ID or access token not found");
    }

    setIsLoading(true);

    try {
      // Show loading toast
      toast({
        title: "Updating Monetization Settings...",
        description: "Please wait while we process your request",
        variant: "default",
      });

      await updateProject(accessToken, selectedProject.id, {
        ...selectedProject,
        monetization: {
          basicPlan: {
            enabled: formData.basicPlan.enabled,
            pricePerMonth: Number(formData.basicPlan.pricePerMonth),
            requestQuotaPerMonth: Number(formData.basicPlan.requestQuotaPerMonth),
            hardLimitQuota: Number(formData.basicPlan.hardLimitQuota)
          },
          proPlan: {
            enabled: formData.proPlan.enabled,
            pricePerMonth: Number(formData.proPlan.pricePerMonth),
            requestQuotaPerMonth: Number(formData.proPlan.requestQuotaPerMonth),
            hardLimitQuota: Number(formData.proPlan.hardLimitQuota)
          },
          ultraPlan: {
            enabled: formData.ultraPlan.enabled,
            pricePerMonth: Number(formData.ultraPlan.pricePerMonth),
            requestQuotaPerMonth: Number(formData.ultraPlan.requestQuotaPerMonth),
            hardLimitQuota: Number(formData.ultraPlan.hardLimitQuota)
          }
        }
      });

      setIsDirty(false);

      toast({
        title: "Success",
        description: "Monetization settings updated successfully",
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
    if (selectedProject?.monetization) {
      const { monetization } = selectedProject;
      setFormData({
        basicPlan: {
          enabled: monetization?.basicPlan?.enabled ?? true,
          pricePerMonth: monetization?.basicPlan?.pricePerMonth ?? 0,
          requestQuotaPerMonth: monetization?.basicPlan?.requestQuotaPerMonth ?? 0,
          hardLimitQuota: monetization?.basicPlan?.hardLimitQuota ?? 0
        },
        proPlan: {
          enabled: monetization?.proPlan?.enabled ?? true,
          pricePerMonth: monetization?.proPlan?.pricePerMonth ?? 0,
          requestQuotaPerMonth: monetization?.proPlan?.requestQuotaPerMonth ?? 0,
          hardLimitQuota: monetization?.proPlan?.hardLimitQuota ?? 0
        },
        ultraPlan: {
          enabled: monetization?.ultraPlan?.enabled ?? true,
          pricePerMonth: monetization?.ultraPlan?.pricePerMonth ?? 0,
          requestQuotaPerMonth: monetization?.ultraPlan?.requestQuotaPerMonth ?? 0,
          hardLimitQuota: monetization?.ultraPlan?.hardLimitQuota ?? 0
        }
      });
    }
    setIsDirty(false);
  }

  return (
    <div>
      <div className='flex-none my-4'>
        <h3 className='text-lg font-medium'>Monetize</h3>
        <p className='text-sm text-muted-foreground'>Start monetizing your APIs...</p>
      </div>
      <form className="space-y-8 pb-8" onSubmit={handleSave}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic Plan */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">BASIC</CardTitle>
                  <Switch 
                    checked={formData.basicPlan.enabled} 
                    onCheckedChange={(value) => handleChange("basicPlan", "enabled", value)} 
                  />
                </div>
                <CardDescription className="text-xs mt-1">
                  Entry level plan for basic users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <h3 className="text-sm font-medium mb-2">Price per Month</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="w-32"
                      min="0"
                      step="0.01"
                      disabled={!formData.basicPlan.enabled}
                      value={formData.basicPlan.pricePerMonth}
                      onChange={(e) => handleChange("basicPlan", "pricePerMonth", e.target.value)}
                    />
                    <span className="text-sm">$</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Request Quota</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="0"
                      className="w-32"
                      min="0"
                      disabled={!formData.basicPlan.enabled}
                      value={formData.basicPlan.requestQuotaPerMonth}
                      onChange={(e) => handleChange("basicPlan", "requestQuotaPerMonth", e.target.value)}
                    />
                    <span className="text-sm">/ month</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Hard Limit</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="0"
                      className="w-32"
                      min="0"
                      disabled={!formData.basicPlan.enabled}
                      value={formData.basicPlan.hardLimitQuota}
                      onChange={(e) => handleChange("basicPlan", "hardLimitQuota", e.target.value)}
                    />
                    <span className="text-sm">/ month</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">PRO</CardTitle>
                  <Switch 
                    checked={formData.proPlan.enabled} 
                    onCheckedChange={(value) => handleChange("proPlan", "enabled", value)} 
                  />
                </div>
                <CardDescription className="text-xs mt-1">
                  Professional plan with advanced features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <h3 className="text-sm font-medium mb-2">Price per Month</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="w-32"
                      min="0"
                      step="0.01"
                      disabled={!formData.proPlan.enabled}
                      value={formData.proPlan.pricePerMonth}
                      onChange={(e) => handleChange("proPlan", "pricePerMonth", e.target.value)}
                    />
                    <span className="text-sm">$</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Request Quota</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="0"
                      className="w-32"
                      min="0"
                      disabled={!formData.proPlan.enabled}
                      value={formData.proPlan.requestQuotaPerMonth}
                      onChange={(e) => handleChange("proPlan", "requestQuotaPerMonth", e.target.value)}
                    />
                    <span className="text-sm">/ month</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Hard Limit</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="0"
                      className="w-32"
                      min="0"
                      disabled={!formData.proPlan.enabled}
                      value={formData.proPlan.hardLimitQuota}
                      onChange={(e) => handleChange("proPlan", "hardLimitQuota", e.target.value)}
                    />
                    <span className="text-sm">/ month</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ultra Plan */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">ULTRA</CardTitle>
                  <Switch 
                    checked={formData.ultraPlan.enabled} 
                    onCheckedChange={(value) => handleChange("ultraPlan", "enabled", value)} 
                  />
                </div>
                <CardDescription className="text-xs mt-1">
                  Premium plan with maximum capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <h3 className="text-sm font-medium mb-2">Price per Month</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="w-32"
                      min="0"
                      step="0.01"
                      disabled={!formData.ultraPlan.enabled}
                      value={formData.ultraPlan.pricePerMonth}
                      onChange={(e) => handleChange("ultraPlan", "pricePerMonth", e.target.value)}
                    />
                    <span className="text-sm">$</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Request Quota</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="0"
                      className="w-32"
                      min="0"
                      disabled={!formData.ultraPlan.enabled}
                      value={formData.ultraPlan.requestQuotaPerMonth}
                      onChange={(e) => handleChange("ultraPlan", "requestQuotaPerMonth", e.target.value)}
                    />
                    <span className="text-sm">/ month</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Hard Limit</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="0"
                      className="w-32"
                      min="0"
                      disabled={!formData.ultraPlan.enabled}
                      value={formData.ultraPlan.hardLimitQuota}
                      onChange={(e) => handleChange("ultraPlan", "hardLimitQuota", e.target.value)}
                    />
                    <span className="text-sm">/ month</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-4">
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
    </div>
  );
}