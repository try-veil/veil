"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useUser } from "@/contexts/UserContext";
import { createTenant } from "@/app/api/tenant/route";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";

const formSchema = z.object({
  tenantName: z.string().min(2, {
    message: "Tenant name must be at least 2 characters.",
  }),
  tenantDomain: z.string().min(2, {
    message: "Tenant domain must be at least 2 characters.",
  }),
});

export function CreateTenantForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { user, refreshUserData } = useUser();
  const { data: session, status } = useSession();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenantName: "",
      tenantDomain: "",
    },
  });
  console.log(session?.user?.accessToken)
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!session?.user?.accessToken) {
      toast({
        title: "Error",
        description: "You must be logged in to create an organization",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create tenant
      await createTenant({
        name: values.tenantName,
        domain: values.tenantDomain,
      }, session?.user?.accessToken);

      // Refresh user data to get updated tenant ID
      await refreshUserData();

      toast({
        title: "Success",
        description: "Organization created successfully.",
      });

      // Reset form
      form.reset();

      // Instead of just refreshing the page, we'll force a hard reload
      // This ensures both user context and projects are freshly fetched
      window.location.reload();
    } catch (error) {
      console.error('Error creating tenant:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] w-full flex-col items-center justify-center">
      <div className="w-full max-w-lg space-y-6 shadow-md p-8 rounde-md">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Create Organization</h1>
          <p className="text-muted-foreground">
            Create your organization to get started with projects
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tenantName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter organization name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tenantDomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Domain</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter organization domain" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Organization"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}