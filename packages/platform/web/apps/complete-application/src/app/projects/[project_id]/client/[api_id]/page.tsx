"use client";

import Request from "@/features/projects/request";
import React, { useState, useEffect } from "react";
import { ResizableBox as BaseResizableBox } from "react-resizable";
import type { ResizableBoxProps } from "react-resizable";
import "react-resizable/css/styles.css";
import ResponseViewer from "@/features/projects/request/components/response-viewer";
import { useAuth } from "@/contexts/AuthContext";
import {
  onboardAPI,
  getOnboardAPIById,
  updateOnboardAPI,
} from "@/app/api/onboard-api/route";
import { toast } from "@/hooks/use-toast";
import { useProject } from "@/context/project-context";
import { updateProject } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Target URL Schema
const targetUrlSchema = z.object({
  target_url: z.string().url({
    message: "Please enter a valid URL.",
  })
});

type TargetUrlFormValues = z.infer<typeof targetUrlSchema>;

// Target URL Modal Component
function TargetUrlModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { selectedProject, refreshProject } = useProject();
  const { accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [trailingSlashError, setTrailingSlashError] = useState(false);
  const router = useRouter();

  const form = useForm<TargetUrlFormValues>({
    resolver: zodResolver(targetUrlSchema),
    defaultValues: {
      target_url: "",
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // If user tries to close the modal, navigate back
      router.back();
    }
  };

  async function onSubmit(data: TargetUrlFormValues) {
    // Reset the trailing slash error
    setTrailingSlashError(false);

    // Check for trailing slash
    if (data.target_url.endsWith('/')) {
      setTrailingSlashError(true);
      return;
    }

    try {
      setIsLoading(true);
      if (!selectedProject?.id || !accessToken) {
        throw new Error("Project ID or access token not found");
      }

      // Update project with new target_url
      await updateProject(accessToken, selectedProject.id, {
        target_url: data.target_url,
      });

      // Refresh project data
      await refreshProject();

      toast({
        title: "Success",
        description: "Target URL updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating target URL:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update target URL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set Target URL</DialogTitle>
          <DialogDescription>
            Please set the target URL for your API endpoints. This will be used
            as the base URL for all requests. You must set a target URL to
            continue.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="target_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.example.com" {...field} />
                  </FormControl>
                  <FormDescription className="flex flex-col gap-1">
                    <span>The base URL for your API endpoints</span>
                    {trailingSlashError && (
                      <span className="text-destructive text-sm">
                        URL should not end with a forward slash (/)
                      </span>
                    )}
                    {form.formState.errors.target_url?.message && (
                      <span className="text-destructive text-sm">
                        {form.formState.errors.target_url.message}
                      </span>
                    )}
                  </FormDescription>
                </FormItem>
              )}
            />
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Target URL"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface RequiredHeader {
  name: string;
  value: string;
  is_variable: boolean;
}

interface OnboardRequestData {
  api_id: string;
  name: string;
  path: string;
  project_id: number;
  target_url: string;
  method: string;
  version: string;
  description: string;
  documentation_url: string;
  required_headers: RequiredHeader[];
}

interface TestRequestData {
  headers: { name: string; value: string }[];
  api_id: string;
  project_id: number;
  name: string;
  path: string;
  target_url: string;
  method: string;
  version: string;
  required_headers: { name: string; value: string; is_variable: boolean }[];
  description: string;
  documentation_url: string;
}

// Create a properly typed wrapper for ResizableBox
const ResizableBox = BaseResizableBox as any;

export default function RequestPage() {
  const [isCodePreviewExpanded, setIsCodePreviewExpanded] = useState(false);
  const [codeType, setCodeType] = useState("curl");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const { accessToken } = useAuth();
  const { selectedProject, setSelectedProjectId, refreshProject } =
    useProject();
  const [showTargetUrlModal, setShowTargetUrlModal] = useState(false);
  const params = useParams();
  const [formData, setFormData] = useState<OnboardRequestData>({
    api_id: "",
    name: "",
    path: "",
    project_id: Number(params.project_id),
    target_url: "",
    method: "GET",
    version: "1.0",
    description: "",
    documentation_url: "",
    required_headers: [],
  });
  const router = useRouter();

  useEffect(() => {
    const fetchApiDetails = async () => {
      if (params.api_id && params.api_id !== "add-request" && accessToken) {
        try {
          setIsLoading(true);
          const data = await getOnboardAPIById(
            params.api_id as string,
            accessToken
          );

          setFormData({
            ...formData,
            api_id: data.api_id,
            name: data.name,
            path: data.path,
            method: data.method,
            description: data.description,
            documentation_url: data.documentation_url,
            required_headers: data.required_headers || [],
          });
        } catch (error) {
          console.error("Error fetching API details:", error);
          toast({
            title: "Error",
            description:
              error instanceof Error
                ? error.message
                : "Failed to fetch API details",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchApiDetails();
  }, [params.api_id, accessToken]);

  // Check if target_url is missing when component mounts or selectedProject changes
  useEffect(() => {
    if (selectedProject && !selectedProject.target_url) {
      setShowTargetUrlModal(true);
    }
  }, [selectedProject]);

  useEffect(() => {
    setViewportHeight(window.innerHeight);
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const generateCurlCommand = (data: TestRequestData) => {
    let curl = `curl -X ${data.method} '${data.target_url}'`;

    // Add headers
    if (data.headers && data.headers.length > 0) {
      data.headers.forEach((header) => {
        curl += `\n  -H '${header.name}: ${header.value}'`;
      });
    }

    return curl;
  };

  const getStatusText = (statusCode: number): string => {
    const statusTexts: { [key: number]: string } = {
      200: "OK",
      201: "Created", 
      202: "Accepted",
      204: "No Content",
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      405: "Method Not Allowed",
      409: "Conflict",
      422: "Unprocessable Entity",
      429: "Too Many Requests",
      500: "Internal Server Error",
      502: "Bad Gateway",
      503: "Service Unavailable",
      504: "Gateway Timeout"
    };
    return statusTexts[statusCode] || "Unknown";
  };

  const handleTest = async (testData: TestRequestData) => {
    try {
      const curlCommand = generateCurlCommand(testData);

      // Call the backend test endpoint instead of direct gateway call
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      console.log("🧪 Testing API with payload:", testData);
      console.log("🌐 Making request to:", `${API_BASE_URL}/onboard/test`);

      const response = await fetch(`${API_BASE_URL}/onboard/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(testData),
      });

      const responseData = await response.json();
      console.log("📊 Test API response:", responseData);

      // Handle both successful and error responses from the API
      // For error responses, use statusCode field, for success use status field, fallback to HTTP status
      const actualStatus = responseData.statusCode || responseData.status || response.status;
      const actualStatusText = getStatusText(actualStatus);
      
      console.log("Actual status:", actualStatus, "Status text:", actualStatusText);
      
      setResponse({
        status: actualStatus,
        statusText: actualStatusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        info: {
          date: new Date().toISOString(),
          url: `${API_BASE_URL}/onboard/test`,
          status: `${actualStatus} ${actualStatusText}`,
          library: "Fetch API",
          headersResponseTime: "N/A",
          totalResponseTime: "N/A",
          responseBodySize: "N/A",
        },
        request: {
          method: testData.method.toUpperCase(),
          url: `${API_BASE_URL}/onboard/test`,
          path: testData.path,
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
          },
          curl: curlCommand,
        },
      });

      if (!response.ok) {
        console.log("❌ Test API failed with status:", response.status);
      } else {
        console.log("✅ Test API successful");
      }

    } catch (error) {
      console.error("Error making test request:", error);
      setResponse({
        status: 500,
        statusText: "Error",
        data: { error: "Failed to make test request" },
        request: {
          method: testData.method,
          url: testData.target_url,
          path: testData.path,
          headers: testData.headers,
          curl: generateCurlCommand(testData),
        },
      });
    }
  };

  const handleSaveRequest = async (requestData: any) => {
    setIsLoading(true);
    try {
      // Transform headers to required format
      const required_headers =
        requestData.headers?.map((header: any) => ({
          name: header.name,
          value: header.value,
          is_variable: true,
        })) || [];

      if (params.api_id && params.api_id !== "add-request") {
        // Update existing API
        const updateData = {
          api_id: params.api_id as string,
          name: requestData.name,
          description: requestData.description,
          path: requestData.path,
          target_url: requestData.target_url,
          method: requestData.method.toUpperCase(),
          version: "1.0",
          documentation_url: requestData.documentation_url,
          required_headers,
          query_params: requestData.query_params,
          body: requestData.body,
        };

        if (accessToken) {
          try {
            const response = await updateOnboardAPI(
              params.api_id as string,
              updateData,
              accessToken
            );
            console.log("API updated successfully:", response);
            refreshProject();
            toast({
              title: "Success",
              description: "API updated successfully",
              variant: "default",
            });
          } catch (error: any) {
            console.error("Error updating API:", error);
            toast({
              title: "Error",
              description: error.message || "Failed to update API",
              variant: "destructive",
            });
          }
        }
      } else {
        // Create new API
        const generatedApiId = crypto.randomUUID();

        const newApiData = {
          ...formData,
          api_id: generatedApiId,
          name: requestData.name,
          description: requestData.description,
          path: requestData.path, // Use clean path without API ID prefix
          target_url: requestData.target_url,
          method: requestData.method.toUpperCase(),
          documentation_url: requestData.documentation_url,
          required_headers,
          query_params: requestData.query_params,
          body: requestData.body,
          project_id: Number(params.project_id),
        };

        if (accessToken) {
          try {
            const response = await onboardAPI(newApiData, accessToken);
            console.log("API onboarded successfully:", response);
            await refreshProject();
            toast({
              title: "Success",
              description: "API onboarded successfully",
              variant: "default",
            });
            router.push(
              `/projects/${params.project_id}/client/${generatedApiId}`
            );
          } catch (error: any) {
            console.error("Error onboarding API:", error);
            toast({
              title: "Error",
              description: error.message || "Failed to onboard API",
              variant: "destructive",
            });
          }
        } else {
          console.error("No authentication token available");
          toast({
            title: "Error",
            description: "Authentication required",
            variant: "destructive",
          });
          setResponse({
            status: 401,
            statusText: "Unauthorized",
            data: { error: "Authentication required" },
          });
        }
      }
    } catch (error) {
      console.error("Error processing request:", error);
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive",
      });
    } finally {
      if (params.project_id) {
        setSelectedProjectId(String(params.project_id));
      }
      setIsLoading(false);
    }
  };

  return (
    <>
      <TargetUrlModal
        open={showTargetUrlModal}
        onOpenChange={setShowTargetUrlModal}
        onSuccess={() => {
          // Additional actions after successful update if needed
        }}
      />

      <div className="h-[calc(100vh-4rem)] w-full flex flex-col">
        {/* Preview Section */}
        {/* <div className="bg-muted rounded-lg shadow-md overflow-hidden mx-4 mt-4">
          <button
            onClick={() => setIsCodePreviewExpanded(!isCodePreviewExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h2 className="text-base font-semibold">Preview</h2>
            <div className="flex items-center gap-2">
              <Select value={codeType} onValueChange={setCodeType}>
                <SelectTrigger className="w-60" aria-label="Select code type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="curl">C / Libcurl</SelectItem>
                  <SelectItem value="clojure">Clojure / clj-http</SelectItem>
                  <SelectItem value="nodejs-axios">Node.js / Axios</SelectItem>
                  <SelectItem value="nodejs-request">Node.js / Request</SelectItem>
                  <SelectItem value="python-requests">Python / Requests</SelectItem>
                  <SelectItem value="python-http-client">Python / http.client</SelectItem>
                </SelectContent>
              </Select>
              {isCodePreviewExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>
          {isCodePreviewExpanded && (
            <ResizableBox
              width={Infinity}
              height={Math.floor(viewportHeight * 0.4)}
              minConstraints={[Infinity, 200]}
              maxConstraints={[Infinity, viewportHeight - 100]}
              axis="y"
              className="border-t"
            >
              <div className="p-4 h-full overflow-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  
                  {generateCodePreview()}
                </pre>
              </div>
            </ResizableBox>
          )}
        </div> */}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 p-4 pt-0">
          {/* Left Column - Request */}
          <ResizableBox
            width={Infinity}
            height={Infinity}
            minConstraints={[300, 400]}
            maxConstraints={[Infinity, Infinity]}
            axis="none"
            className="rounded-lg shadow-md overflow-hidden"
          >
            <Request
              isLoading={isLoading}
              onSave={handleSaveRequest}
              onTest={handleTest}
              project_id={Number(params.project_id)}
              initialData={formData}
            />
          </ResizableBox>
          {/* Right Column - Response */}
          <ResizableBox
            width={Infinity}
            height={Infinity}
            minConstraints={[300, 400]}
            maxConstraints={[Infinity, Infinity]}
            axis="none"
            className="bg-muted rounded-lg shadow-md overflow-hidden"
          >
            <ResponseViewer isLoading={isLoading} response={response} />
          </ResizableBox>
        </div>
      </div>
    </>
  );
}
