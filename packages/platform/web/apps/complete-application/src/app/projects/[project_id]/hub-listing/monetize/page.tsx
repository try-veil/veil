"use client";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
export default function Monetize() {
  const [basicEnabled, setBasicEnabled] = useState(true);
  const [proEnabled, setProEnabled] = useState(true);
  const [ultraEnabled, setUltraEnabled] = useState(true);

  return (
    <div>
      <div className="flex-none">
        <h3 className="text-lg font-medium">Monetize</h3>
        <p className="text-sm text-muted-foreground">
          Start monetizing your APIs...
        </p>
      </div>
      <Separator className="my-4 flex-none" />
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Basic Plan */}
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle>BASIC</CardTitle>
                <Switch
                  checked={basicEnabled}
                  onCheckedChange={setBasicEnabled}
                />
              </div>
              <CardDescription>
                ${basicEnabled ? "0.00" : "0"}/month
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Requests</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1">500,000 / month</div>
                  <Badge variant="secondary">Quota</Badge>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Rapid-free-plans-hard-limit
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1">500,000 / month</div>
                  <Badge variant="secondary">Quota</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle>PRO</CardTitle>
                <Switch checked={proEnabled} onCheckedChange={setProEnabled} />
              </div>
              <CardDescription>
                ${proEnabled ? "0.00" : "0"}/month
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Requests</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1">500,000 / month</div>
                  <Badge variant="secondary">Quota</Badge>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Rapid-free-plans-hard-limit
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1">500,000 / month</div>
                  <Badge variant="secondary">Quota</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ultra Plan */}
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle>ULTRA</CardTitle>
                <Switch
                  checked={ultraEnabled}
                  onCheckedChange={setUltraEnabled}
                />
              </div>
              <CardDescription>
                ${ultraEnabled ? "0.00" : "0"}/month
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Requests</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1">500,000 / month</div>
                  <Badge variant="secondary">Quota</Badge>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Rapid-free-plans-hard-limit
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1">500,000 / month</div>
                  <Badge variant="secondary">Quota</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
