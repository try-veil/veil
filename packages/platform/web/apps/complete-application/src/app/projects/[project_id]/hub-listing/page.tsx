"use client";
import React, { useState } from "react";
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

export default function HubListingPage() {
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  return (
    <ContentSection
      title="Marketplace Listing"
      desc="Manage how your API looks at marketplace"
    >
      <form className="space-y-6">
        <div className="space-y-2">
          
          <div className="flex items-start gap-4">
            <div className="flex flex-col justify-between h-24 pt-1">
            <Label>Upload Logo</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png"
                className="h-9 w-full max-w-2xl"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setSelectedLogo(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <p className="text-sm text-muted-foreground">
                Maximum Size: 500 x 500px, JPEG / PNG
              </p>
            </div>
            <div className="w-24 h-24 border rounded-md overflow-hidden bg-muted flex items-center justify-center">
              {selectedLogo ? (
                <Image
                  src={selectedLogo}
                  alt="Logo preview"
                  width={96}
                  height={96}
                  className="object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mb-1" />
                  <span className="text-xs">No logo</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="api">API</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="storage">Storage</SelectItem>
              <SelectItem value="analytics">Analytics</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Short Description</Label>
          <Input
            placeholder="Enter a short description"
            className="h-9 w-full"
          />
        </div>

        <div className="space-y-2">
          <Label>Long Description</Label>
          <textarea
            placeholder="Enter a detailed description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <Label>Website</Label>
          <Input
            type="url"
            placeholder="https://example.com"
            className="h-9 w-full"
          />
        </div>

        <div className="space-y-2">
          <Label>Terms of Use</Label>
          <textarea
            placeholder="Enter terms of use"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <Label>Visibility</Label>
          <div className="flex items-center space-x-2">
            <Switch id="visibility" />
            <Label htmlFor="visibility">Visible to Public</Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Health Check URL</Label>
          <Input
            type="url"
            placeholder="https://api.example.com/health"
            className="h-9 w-full"
          />
        </div>

        <div className="flex space-x-4">
          <Button variant="outline" type="button">
            Discard Changes
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </ContentSection>
  );
}
