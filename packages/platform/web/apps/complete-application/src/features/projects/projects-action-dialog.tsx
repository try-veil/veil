"use client";

import { z } from "zod";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { createProject } from "@/app/api/project/route";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import {
  SelectItem,
  SelectTrigger,
  SelectContent,
  Select,
  SelectValue,
} from "@/components/ui/select";

interface AddForm {
  name: string;
  thumbnail?: File;
  description?: string;
  favorite?: boolean;
  enableLimitsToAPIs?: boolean;
  target_url?: string;
  category: string;
}

// Schema
const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  thumbnail: z
    .any()
    .optional()
    .refine(
      (file) => file === undefined || (file instanceof File && file.size > 0),
      { message: "Invalid file." }
    ),
  description: z.string().optional(),
  favorite: z.boolean().optional(),
  enableLimitsToAPIs: z.boolean().optional(),
  target_url: z
  .string()
  .optional() // Make the target_url optional
  .refine((url) => !url || !url.endsWith("/"), {
    message: "URL should not end with a '/'",
  })
  .refine((url) => !url || z.string().url().safeParse(url).success, {
    message: "Invalid URL format", // Only check URL format if it's not empty
  })
  ,
  category: z.string().min(1, { message: "Category is required" }),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProjectsActionDialog({ open, onOpenChange, onSuccess }: Props) {
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { accessToken } = useAuth();
  const { user: userContext } = useUser();

  const form = useForm<AddForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      thumbnail: undefined,
      description: "",
      favorite: false,
      enableLimitsToAPIs: false,
      target_url: "",
      category: "",
    },
  });

  const onSubmit = async (values: AddForm) => {
    try {
      setIsLoading(true);
      const {
        name,
        thumbnail,
        description,
        favorite,
        enableLimitsToAPIs,
        target_url,
        category,
      } = values;

      // Convert thumbnail file to base64 if it exists
      let thumbnailBase64: string | undefined = undefined;
      if (thumbnail instanceof File) {
        thumbnailBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(thumbnail);
        });
      }

      if (!userContext?.tenantId) {
        throw new Error(
          "No tenant ID found. Please create an organization first."
        );
      }

      // Create project object
      const projectData = {
        name,
        description,
        thumbnail: thumbnailBase64,
        favorite: favorite || false,
        enableLimitsToAPIs: enableLimitsToAPIs || false,
        tenantId: userContext.tenantId,
        target_url,
        category,
      };

      if (!accessToken) {
        throw new Error("Access token is missing");
      }

      const project = await createProject(projectData, accessToken);

      toast({
        title: "Success",
        description: "Project created successfully",
      });

      // Reset form and close dialog
      form.reset();
      setSelectedLogo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);

      // Call onSuccess callback to refresh projects list
      onSuccess?.();
    } catch (error) {
      console.log("Error creating project:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset();
        setSelectedLogo(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        onOpenChange(state);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Enter details to create project and your onboard APIs.
          </DialogDescription>
        </DialogHeader>
        <div className="-mr-4 h-[26.25rem] w-full overflow-y-auto py-1 pr-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 p-0.5"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Project Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ✅ Custom Logo Upload with Preview */}
              <FormField
                control={form.control}
                name="thumbnail"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col justify-between h-24 pt-1">
                        <Label>Upload Logo</Label>
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png"
                          className="h-9 w-full max-w-2xl"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              onChange(file);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setSelectedLogo(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          value={value?.filename || ""}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Maximum Size: 500 x 500px, JPEG / PNG
                        </p>
                        <FormMessage />
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
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Describe your project" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Set Base URL of your project"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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
                      </FormControl>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Add Project"}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
