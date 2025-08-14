"use client";
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Headers } from "./components/headers";
import { Query } from "./components/query";
import Body from "./components/body";
import { Send, Play, Loader2, Trash2 } from "lucide-react";
import { useProject } from "@/context/project-context";
import { deleteAPI } from "@/app/api/onboard-api/route";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

const requestFormSchema = z.object({
  name: z.string().min(1, { message: "Endpoint name is required" }),
  description: z.string().optional(),
  // path: z.string()
  //   .min(1, { message: "Path is required" })
  //   .startsWith("/", { message: "Path must start with /" }),
  documentation_url: z.union([
    z.string().url({ message: "Please enter a valid URL" }),
    z.string().length(0),
  ]),
  method: z.string(),
  headers: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
      })
    )
    .optional(),
});

type RequestFormData = z.infer<typeof requestFormSchema>;
interface RequestProps {
  isLoading?: boolean;
  onSave?: (data: RequestData) => void;
  onTest?: (data: TestRequestData) => void;
  project_id?: number;
  initialData?: {
    name: string;
    api_id: string;
    description: string;
    path: string;
    documentation_url: string;
    method: string;
    version?: string;
    required_headers?: { name: string; value: string; is_variable: boolean }[];
    query_params?: { key: string; value: string }[];
    body?: {
      type: string;
      content: string;
      form_data?: { key: string; value: string }[];
      json_data?: any;
    };
  };
}

interface RequestData {
  name: string;
  description: string;
  path: string;
  documentation_url: string;
  target_url: string;
  method: string;
  headers?: { name: string; value: string }[];
  query_params?: { key: string; value: string }[];
  body?: {
    type: string;
    content: string;
    form_data?: { key: string; value: string }[];
    json_data?: any;
  };
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
  body?: {
    type: string;
    content?: string;
    form_data?: { key: string; value: string }[];
    json_data?: any;
  };
}

const options = new Map([
  ["get", "GET"],
  ["post", "POST"],
  ["put", "PUT"],
  ["delete", "DELETE"],
  ["patch", "PATCH"],
  ["head", "HEAD"],
  ["options", "OPTIONS"],
  ["trace", "TRACE"],
]);

export default function Request({
  isLoading,
  onSave,
  onTest,
  project_id,
  initialData,
}: RequestProps) {
  const { accessToken } = useAuth();
  const router = useRouter();
  const { refreshProject } = useProject();

  const [errors, setErrors] = useState<{
    name?: string;
    path?: string;
    documentation_url?: string;
  }>();

  const [name, setName] = useState(initialData?.name || "");
  const [path, setPath] = useState("");
  const [storedUuid, setStoredUuid] = useState("");
  const [method, setMethod] = useState<string>(initialData?.method || "GET");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [documentationUrl, setDocumentationUrl] = useState(
    initialData?.documentation_url || ""
  );
  const [version, setVersion] = useState(initialData?.version || "1.0.0");
  const [headers, setHeaders] = useState<{ name: string; value: string }[]>(
    initialData?.required_headers?.map((h) => ({
      name: h.name,
      value: h.value,
    })) || []
  );
  const [queryParams, setQueryParams] = useState<
    { key: string; value: string }[]
  >([]);
  const [bodyData, setBodyData] = useState<{
    type: string;
    content?: string;
    form_data?: { key: string; value: string }[];
    json_data?: any;
  }>({
    type: "json", // Only initialize type
  });
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [showMethodChangeDialog, setShowMethodChangeDialog] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<string>("");
  const { selectedProject } = useProject();

  useEffect(() => {
    if (initialData) {
      setMethod(initialData.method?.toLowerCase() || "get");
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setDocumentationUrl(initialData.documentation_url || "");
      setPath(initialData.path || "");
      setVersion(initialData.version || "1.0.0");
      setHeaders(
        initialData.required_headers?.map((h) => ({
          name: h.name,
          value: h.value,
        })) || []
      );
      setQueryParams(initialData.query_params || []);
      setBodyData(
        initialData.body || {
          type: "json",
        }
      );
    }
  }, [initialData]);

  useEffect(() => {
    if (initialData?.path) {
      const pathParts = initialData.path.split("/");
      if (pathParts.length > 1) {
        setStoredUuid(pathParts[0]);
        setPath("/" + pathParts.slice(1).join("/"));
      } else {
        setPath(initialData.path);
      }
    }
  }, [initialData?.path]);

  const handleMethodChange = (newMethod: string) => {
    const currentMethodHasBody = ["post", "put", "patch"].includes(method.toLowerCase());
    const newMethodIsGet = newMethod.toLowerCase() === "get";
    
    // Check if we're changing from a method that supports body to GET
    if (currentMethodHasBody && newMethodIsGet) {
      // Check if there's actual body content
      const hasBodyContent = 
        bodyData.content.trim() !== "" ||
        (bodyData.form_data && bodyData.form_data.length > 0) ||
        bodyData.json_data !== null;
      
      if (hasBodyContent) {
        setPendingMethod(newMethod);
        setShowMethodChangeDialog(true);
        return;
      }
    }
    
    // If no confirmation needed, just change the method
    setMethod(newMethod);
  };

  const handleConfirmMethodChange = () => {
    setMethod(pendingMethod);
    // Clear body data when changing to GET
    setBodyData({
      type: "json",
    });
    setShowMethodChangeDialog(false);
    setPendingMethod("");
  };

  const handleCancelMethodChange = () => {
    setShowMethodChangeDialog(false);
    setPendingMethod("");
  };

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newPath = e.target.value;
    if (!newPath.startsWith("/")) {
      newPath = "/" + newPath;
    }
    setPath(newPath);
  };

  const handleHeadersChange = (
    newHeaders: { id: string; name: string; value: string }[]
  ) => {
    const processedHeaders = newHeaders
      .filter(
        (header) => header.name.trim() !== "" && header.value.trim() !== ""
      )
      .map(({ name, value }) => ({ name, value }));
    setHeaders(processedHeaders);
  };

  const handleQueryChange = (
    newQueries: { id: string; key: string; value: string }[]
  ) => {
    const processedQueries = newQueries
      .filter((query) => query.key.trim() !== "" && query.value.trim() !== "")
      .map(({ key, value }) => ({ key, value }));
    setQueryParams(processedQueries);
  };

  const handleBodyChange = (data: {
    type: string;
    content: string;
    form_data?: { key: string; value: string }[];
    json_data?: any;
  }) => {
    setBodyData(data);
  };

  const targetUrl = selectedProject?.target_url;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalPath = initialData?.path ? `${storedUuid}${path}` : path;

    const formData = {
      name,
      description,
      path: finalPath,
      documentation_url: documentationUrl,
      method,
      headers,
      query_params: queryParams,
      body: bodyData,
      target_url: targetUrl,
    };

    console.log("🚀 Submitting API request with data:", formData);
    console.log(
      "📝 Request type:",
      initialData?.path !== "" ? "UPDATE" : "CREATE"
    );

    const result = requestFormSchema.safeParse(formData);
    if (!result.success) {
      const formattedErrors = result.error.format();
      console.log("❌ Form validation failed:", formattedErrors);
      setErrors({
        name: formattedErrors.name?._errors[0],
        documentation_url: formattedErrors.documentation_url?._errors[0],
      });
      return;
    }
    setErrors({});

    console.log("✅ Form validation passed, calling onSave handler");
    if (onSave) {
      onSave(formData as RequestData);
    }
  };

  const handleTest = async () => {
    if (!targetUrl) {
      alert("Please enter a target URL");
      return;
    }

    if (!project_id) {
      alert("Project ID is required");
      return;
    }

    setIsTestLoading(true);

    const queryString = queryParams
  .map(({ key, value }) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  .join('&');

  const queryPath = queryString.length > 0 ? `${path}?${queryString}` : path;

    try {
      const payload = {
        api_id:
          initialData?.api_id && initialData.api_id !== ""
            ? initialData.api_id
            : crypto.randomUUID(),
        project_id: project_id,
        name,
        path: queryPath,
        target_url: targetUrl,
        method,
        version,
        required_headers: headers.map((h) => ({
          name: h.name,
          value: h.value,
          is_variable: false,
        })),
        description,
        documentation_url: documentationUrl,
        body: bodyData,
      };

      console.log("🧪 Testing API with payload:", payload);
      console.log("🌐 Making request to:", `${API_BASE_URL}/onboard/test`);

      if (onTest) {
        await onTest(payload as TestRequestData);
      }
      console.log("✅ Test API successful");
    } catch (error) {
      console.log("❌ Test API error:", error);
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleDeleteAPI = async () => {
    try {
      setIsDeleteLoading(true);
      if (!selectedProject?.id || !initialData?.api_id || !accessToken) {
        console.log("❌ Delete API failed - missing required data:", {
          projectId: selectedProject?.id,
          apiId: initialData?.api_id,
          hasAccessToken: !!accessToken,
        });
        toast({
          title: "Error",
          description: "Missing required information to delete API",
          variant: "destructive",
        });
        return;
      }

      console.log("🗑️ Deleting API:", {
        projectId: selectedProject.id,
        apiId: initialData.api_id,
      });

      toast({
        title: "Deleting API...",
        description: "Please wait while we process your request",
        variant: "default",
      });

      await deleteAPI(
        selectedProject.id.toString(),
        initialData.api_id.toString(),
        accessToken
      );

      console.log("✅ API deleted successfully");
      await refreshProject();
      toast({
        title: "Success",
        description: "API deleted successfully",
        variant: "default",
      });
      router.push(`/projects/${selectedProject.id}/client/add-request`);
    } catch (error) {
      console.log("❌ Delete API error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete API",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-4 border-b">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Select value={method} onValueChange={handleMethodChange}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue>{options.get(method)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="get">GET</SelectItem>
              <SelectItem value="post">POST</SelectItem>
              <SelectItem value="put">PUT</SelectItem>
              <SelectItem value="delete">DELETE</SelectItem>
              <SelectItem value="patch">PATCH</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Enter your endpoint (e.g. /users)"
            className="flex-1"
            value={path}
            onChange={handlePathChange}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={isTestLoading || initialData?.path == ""}
              variant="secondary"
              size="sm"
              className="min-w-[80px]"
            >
              {isTestLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Test
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Test
                </>
              )}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              variant="default"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {initialData?.path !== "" ? "Updating..." : "Saving..."}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {initialData?.path !== "" ? "Update" : "Save"}
                </>
              )}
            </Button>

            {initialData?.path !== "" ? (
              <Button
                onClick={handleDeleteAPI}
                disabled={isDeleteLoading}
                variant="default"
                size="sm"
              >
                {isDeleteLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                  </>
                )}
              </Button>
            ) : (
              <></>
            )}
          </div>
        </div>
        {errors?.path && (
          <p className="text-sm text-red-500 mt-1 ml-1">{errors.path}</p>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <Tabs defaultValue="overview" className="flex flex-col h-full">
          <div className="flex-none px-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Description</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
              <TabsTrigger value="query">Query</TabsTrigger>
              <TabsTrigger value="body">Body</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto px-4 py-2">
              <TabsContent value="overview" className="mt-0 h-full">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>End point name</Label>
                    <Input
                      placeholder="End point name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    {errors?.name && (
                      <p className="text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Set Description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Version</Label>
                    <Input
                      placeholder="1.0.0"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Documentation URL</Label>
                    <Input
                      placeholder="https://docs.example.com"
                      value={documentationUrl}
                      onChange={(e) => setDocumentationUrl(e.target.value)}
                    />
                    {errors?.documentation_url && (
                      <p className="text-sm text-red-500">
                        {errors.documentation_url}
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="headers" className="mt-0 h-full">
                <Headers
                  onHeadersChange={handleHeadersChange}
                  initialHeaders={headers}
                />
              </TabsContent>

              <TabsContent value="query" className="mt-0 h-full">
                <Query
                  onQueryChange={handleQueryChange}
                  initialQueries={queryParams}
                />
              </TabsContent>

              <TabsContent value="body" className="mt-0 h-full">
                {method === "get" ? (
                  <div className="text-muted-foreground py-4 p-1 text-center">
                    Body is not applicable for GET requests.
                  </div>
                ) : (
                  <Body
                    onBodyChange={handleBodyChange}
                    initialBodyData={bodyData}
                  />
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      <Dialog
        open={showMethodChangeDialog}
        onOpenChange={setShowMethodChangeDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Method Change</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Changing the request method to GET will remove any existing body
            content. Do you want to continue?
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={handleCancelMethodChange}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmMethodChange}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
