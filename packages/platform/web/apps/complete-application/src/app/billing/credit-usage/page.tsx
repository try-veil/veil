"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import React from "react";
import Link from "next/link";

const CreditUsage = () => {
  return (
    <div className="w-full">
      <Card className="w-full md:min-h-[26rem] flex flex-col">
        <CardHeader>
          <CardTitle>Credit Usage</CardTitle>
          <CardDescription>
            Your credit usage will be displayed here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1">
          <div className="text-center m-auto space-y-6 mx-auto">
            <p className="text-muted-foreground text-sm">
              Subscribe to a plan to start using credits for your projects.
            </p>
              <Button><Link href="/marketplace">Go to Marketplace</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditUsage;
