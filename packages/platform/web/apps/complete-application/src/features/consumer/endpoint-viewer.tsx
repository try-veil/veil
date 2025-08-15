import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React, { useState, useEffect } from "react";
import { JsonViewer } from "@/features/projects/request/components/json-tree-viewer";
import { OnboardAPI } from "@/app/api/onboard-api/route";
import ResponseViewer from "@/features/projects/request/components/response-viewer";
import Body from "@/features/projects/request/components/body";
import { Button } from "@/components/ui/button";
import { Send, Play, Loader2, Copy, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/context/project-context";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  name: string;
  apiId: string;
  version: string;
}

interface EndpointViewerProps {
  endpoint: Endpoint | null;
  apiDetails?: OnboardAPI | null;
}

interface HeaderValue {
  value: string;
  is_variable: boolean;
}

interface TestRequestData {
  method: string;
  target_url: string;
  headers: { name: string; value: string }[];
  body?: {
    type: string;
    content: string;
    form_data?: { key: string; value: string }[];
    multipart_data?: { key: string; value: string }[];
    json_data?: any;
  };
}

export default function EndpointViewer({
  endpoint,
  apiDetails,
}: EndpointViewerProps) {


  console.log("Endpoint::::", endpoint);
  console.log("API Details", apiDetails);

  const [headerValues, setHeaderValues] = useState<Record<string, HeaderValue>>(
    {}
  );
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [bodyData, setBodyData] = useState<{
    type: string;
    content: string;
    form_data?: { key: string; value: string }[];
    multipart_data?: { key: string; value: string }[];
    json_data?: any;
  } | null>(null);
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [selectedUrl, setSelectedUrl] = useState<string>(process.env.NEXT_PUBLIC_VEIL_URL || "https://veil.com");
  const [selectedAuthType, setSelectedAuthType] = useState("bearer");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("app");

  const { accessToken } = useAuth();
  const { selectedProject } = useProject();

  const authTypes = {
    api_key: "API Key",
    oauth2: "OAuth 2.0",
    bearer: "Bearer Token",
  };

  // Initialize header values and query parameters when apiDetails changes
  useEffect(() => {
    // Reset to App tab when apiDetails change
    setActiveTab("app");

    if (apiDetails?.required_headers) {
      const initialHeaders: Record<string, HeaderValue> = {};
      apiDetails.required_headers.forEach((header) => {
        initialHeaders[header.name] = {
          value: header.value || "",
          is_variable: header.is_variable,
        };
      });
      setHeaderValues(initialHeaders);
    }

    if (apiDetails?.query_params) {
      const initialQueryParams: Record<string, string> = {};
      apiDetails.query_params.forEach((param) => {
        initialQueryParams[param.key] = param.value || "";
      });
      setQueryParams(initialQueryParams);
    }

    // Always reset body data when apiDetails change
    if (apiDetails?.body) {
      setBodyData(apiDetails.body);
    }

  }, [apiDetails]);

  const generateCurlCode = () => {
    if (!apiDetails) return "No API details available";

    let url = `${process.env.NEXT_PUBLIC_VEIL_URL}${apiDetails.path}`;

    // Add query parameters if they exist and have values
    const validQueryParams = Object.entries(queryParams).filter(([key, value]) => value.trim() !== "");
    if (validQueryParams.length > 0) {
      const queryString = validQueryParams.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
      url += `?${queryString}`;
    }

    let curl = `curl -X ${apiDetails.method} '${url}'`;

    // Add headers with current values
    if (apiDetails.required_headers && apiDetails.required_headers.length > 0) {
      apiDetails.required_headers.forEach((header) => {
        const headerValue = headerValues[header.name];
        curl += `\n  -H '${header.name}: ${headerValue?.value || "<YOUR_" + header.name.toUpperCase() + ">"}'`;
      });
    }

    // Check if "X-Subscription-Key" is missing
    const hasContentTypeKey = apiDetails.required_headers.some(
      (header) => header.name.toLowerCase() === "Content-type".toLowerCase()
    );
    if (!hasContentTypeKey) {
      curl += `\n  -H 'Content-Type: application/json'`;
    }

    // Check if "X-Subscription-Key" is missing
    const hasSubscriptionKey = apiDetails.required_headers.some(
      (header) => header.name.toLowerCase() === "X-subscription-key".toLowerCase()
    );
    if (!hasSubscriptionKey) {
      curl += `\n  -H 'X-Subscription-Key: test-key-${apiDetails.api_id}'`;
    }

    // Add body data if available
    if (bodyData && bodyData.type && (apiDetails.method === 'POST' || apiDetails.method === 'PUT' || apiDetails.method === 'PATCH')) {
      if (bodyData.type === 'json' && bodyData.json_data) {
        curl += `\n  -d '${JSON.stringify(bodyData.json_data)}'`;
      } else if (bodyData.type === 'text' && bodyData.content) {
        curl += `\n  -d '${bodyData.content}'`;
      } else if (bodyData.type === 'form-url-encoded' && bodyData.form_data) {
        const formString = bodyData.form_data
          .filter(item => item.key && item.value)
          .map(item => `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`)
          .join('&');
        if (formString) {
          curl += `\n  -d '${formString}'`;
          // Update content-type for form data
          curl = curl.replace('Content-Type: application/json', 'Content-Type: application/x-www-form-urlencoded');
        }
      } else if (bodyData.type === 'multipart' && bodyData.multipart_data) {
        bodyData.multipart_data
          .filter(item => item.key && item.value)
          .forEach(item => {
            curl += `\n  -F '${item.key}=${item.value}'`;
          });
      }
    }

    return curl;
  };

  const generateCurlCommand = (data: TestRequestData) => {
    console.log("data..........", data)
    let curl = `curl -X ${data.method} ${data.target_url}`;

    // Add headers
    if (data.headers && data.headers.length > 0) {
      data.headers.forEach((header) => {
        curl += `\n  -H '${header.name}: ${header.value}'`;
      });
    }

    // Add body data if available
    if (data.body && (data.method === 'POST' || data.method === 'PUT' || data.method === 'PATCH')) {
      if (data.body.type === 'json' && data.body.json_data) {
        curl += `\n  -d '${JSON.stringify(data.body.json_data)}'`;
      } else if (data.body.type === 'text' && data.body.content) {
        curl += `\n  -d '${data.body.content}'`;
      } else if (data.body.type === 'form-url-encoded' && data.body.form_data) {
        const formString = data.body.form_data
          .filter(item => item.key && item.value)
          .map(item => `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`)
          .join('&');
        if (formString) {
          curl += `\n  -d '${formString}'`;
        }
      } else if (data.body.type === 'multipart' && data.body.multipart_data) {
        data.body.multipart_data
          .filter(item => item.key && item.value)
          .forEach(item => {
            curl += `\n  -F '${item.key}=${item.value}'`;
          });
      }
    }

    return curl;
  };

  const getFullUrl = () => {
    if (!apiDetails?.path) return selectedUrl;

    let url = `${selectedUrl}${apiDetails.path}`;

    // Add query parameters if they exist and have values
    const validQueryParams = Object.entries(queryParams).filter(([key, value]) => value.trim() !== "");
    if (validQueryParams.length > 0) {
      const queryString = validQueryParams.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
      url += `?${queryString}`;
    }

    return url;
  };

  const handleQueryParamChange = (key: string, value: string) => {
    setQueryParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleHeaderValueChange = (headerName: string, value: string) => {
    setHeaderValues(prev => ({
      ...prev,
      [headerName]: {
        ...prev[headerName],
        value: value
      }
    }));
  };

  const handleBodyChange = (data: {
    type: string;
    content: string;
    form_data?: { key: string; value: string }[];
    multipart_data?: { key: string; value: string }[];
    json_data?: any;
  }) => {
    setBodyData(data);
  };

  const handleCopyUrl = async () => {
    const url = getFullUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If no endpoint is selected, show a message
  if (!endpoint) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-muted-foreground">
        <p>Select an endpoint from the list to view its details</p>
      </div>
    );
  }

  const handleTest = async (testData: TestRequestData) => {
    const curlCommand = generateCurlCommand(testData);

    try {

      // Make the actual HTTP request
      const requestHeaders: Record<string, string> = {};
      testData.headers.forEach(header => {
        requestHeaders[header.name] = header.value;
      });

      console.log("Target URL:", testData.target_url)

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: testData.method,
        headers: requestHeaders
      };

      // Add body data if available and method supports it
      if (testData.body && (testData.method === 'POST' || testData.method === 'PUT' || testData.method === 'PATCH')) {
        if (testData.body.type === 'json' && testData.body.json_data) {
          fetchOptions.body = JSON.stringify(testData.body.json_data);
        } else if (testData.body.type === 'text' && testData.body.content) {
          fetchOptions.body = testData.body.content;
        } else if (testData.body.type === 'form-url-encoded' && testData.body.form_data) {
          const formData = new URLSearchParams();
          testData.body.form_data
            .filter(item => item.key && item.value)
            .forEach(item => formData.append(item.key, item.value));
          fetchOptions.body = formData.toString();
          requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
        } else if (testData.body.type === 'multipart' && testData.body.multipart_data) {
          const formData = new FormData();
          testData.body.multipart_data
            .filter(item => item.key && item.value)
            .forEach(item => formData.append(item.key, item.value));
          fetchOptions.body = formData;
          // Remove Content-Type header for FormData to let browser set it with boundary
          delete requestHeaders['Content-Type'];
        }

        // Update headers in fetchOptions
        fetchOptions.headers = requestHeaders;
      }

      // Use backend API for enhanced testing with rate limiting and Caddy URL
      const backendPayload = {
        api_id: apiDetails?.api_id,
        project_id: selectedProject?.id || null, // Optional for marketplace testing
        name: apiDetails?.name || 'test-api',
        method: testData.method,
        target_url: testData.target_url,
        path: apiDetails?.path || '/',
        version: apiDetails?.version || '1.0',
        required_headers: (testData.headers || []).map(header => ({
          name: header.name,
          value: header.value,
          is_variable: false
        })),
        body: testData.body
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/onboard/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(backendPayload),
      });

      let responseData;
      let parseError = null;

      // Try to parse JSON, but handle cases where response isn't JSON
      try {
        const responseText = await response.text();
        if (responseText) {
          responseData = JSON.parse(responseText);
        } else {
          responseData = null;
        }
      } catch (jsonError) {
        console.warn('Response is not valid JSON:', jsonError);
        // If JSON parsing fails, try to get the text content
        try {
          const responseText = await response.text();
          responseData = {
            message: 'Response is not valid JSON',
            content: responseText,
            parseError: jsonError.message
          };
          parseError = jsonError.message;
        } catch (textError) {
          responseData = {
            error: 'Failed to parse response',
            jsonError: jsonError.message,
            textError: textError.message
          };
          parseError = `JSON: ${jsonError.message}, Text: ${textError.message}`;
        }
      }

      console.log("Backend API response:", responseData)

      // Handle enhanced backend API response
      if (responseData?.success && responseData?.data) {
        setResponse({
          status: responseData.status || 200,
          statusText: response.statusText,
          headers: responseData.headers || {},
          data: responseData.data,
          info: {
            date: new Date().toISOString(),
            url: responseData.url || testData.target_url, // Use Caddy gateway URL from backend
            status: `${responseData.status || 200} ${response.statusText}`,
            library: 'Backend API (User Rate Limited)',
            headersResponseTime: 'N/A',
            totalResponseTime: 'N/A',
            responseBodySize: 'N/A',
            apiId: responseData.apiId,
            userId: responseData.userId,
            usage: responseData.usage,
            limit: responseData.limit,
            remaining: responseData.remaining,
          },
          request: {
            method: testData.method,
            url: responseData.url || testData.target_url, // Use Caddy gateway URL from backend
            path: apiDetails?.path || '/',
            headers: requestHeaders,
            curl: curlCommand
          }
        });
      } else {
        // Handle other backend responses (errors, etc.)
        setResponse({
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
          info: {
            date: new Date().toISOString(),
            url: responseData?.url || testData.target_url, // Use Caddy URL if available
            status: `${response.status} ${response.statusText}`,
            library: 'Backend API',
            headersResponseTime: 'N/A',
            totalResponseTime: 'N/A',
            responseBodySize: 'N/A',
            parseError: parseError || undefined,
          },
          request: {
            method: testData.method,
            url: responseData?.url || testData.target_url, // Use Caddy URL if available
            path: apiDetails?.path || '/',
            headers: requestHeaders,
            curl: curlCommand
          }
        });
      }

      console.log("Final response object:", response)

    } catch (error) {
      console.error('Network or fetch error:', error);

      // Create a more detailed error response
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorType = error.name || 'NetworkError';

      setResponse({
        status: 0, // Use 0 to indicate network error, not HTTP error
        statusText: `Network Error: ${errorType}`,
        headers: {},
        data: {
          error: 'Network request failed',
          message: errorMessage,
          type: errorType,
          details: 'This is a client-side error, not an HTTP response error'
        },
        info: {
          date: new Date().toISOString(),
          url: testData.target_url,
          status: `Network Error: ${errorMessage}`,
          library: 'Backend API',
          headersResponseTime: 'N/A',
          totalResponseTime: 'N/A',
          responseBodySize: 'N/A',
        },
        request: {
          method: testData.method,
          url: testData.target_url,
          path: apiDetails?.path || '/',
          headers: testData.headers.reduce((acc, h) => ({ ...acc, [h.name]: h.value }), {}),
          curl: curlCommand
        }
      });
    }
  };

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="px-4">
          <TabsList className="flex flex-wrap h-auto min-h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground gap-2">
            <TabsTrigger
              value="app"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              App
            </TabsTrigger>
            <TabsTrigger
              value="params"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Params
            </TabsTrigger>
            <TabsTrigger
              value="headers"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Headers
            </TabsTrigger>
            <TabsTrigger
              disabled={apiDetails?.method === "GET"}
              value="body"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Body
            </TabsTrigger>
            <TabsTrigger
              disabled
              value="auth"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Authorizations
            </TabsTrigger>
            <TabsTrigger
              value="code"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Code Snippets
            </TabsTrigger>
            <TabsTrigger
              value="example"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Examples
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Results
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-grow overflow-y-auto overflow-x-auto p-4">
          <TabsContent value="app" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="pb-4 border-b">
                  <div className="space-y-4">
                    <div>
                      <Label className="font-bold">Name</Label>
                      <p>{apiDetails?.name || ""}</p>
                    </div>
                    <div>
                      <Label className="font-bold">Description</Label>
                      <p>{apiDetails?.description || ""}</p>
                    </div>
                    <div>
                      <Label className="font-bold">Version</Label>
                      <p>{apiDetails?.version || ""}</p>
                    </div>
                    <div>
                      <Label className="font-bold">URL</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded flex-1">
                          {getFullUrl()}
                        </p>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopyUrl}
                          className="h-8 w-8"
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="font-bold">Documentation URL</Label>
                      <p>{apiDetails?.documentation_url || ""}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Request URL</Label>
                    <Select value={selectedUrl} onValueChange={setSelectedUrl}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a URL" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={process.env.NEXT_PUBLIC_VEIL_URL || "https://veil.com"}>
                          {process.env.NEXT_PUBLIC_VEIL_URL || "https://veil.com"} (Gateway)
                        </SelectItem>
                        {apiDetails?.target_url && (
                          <SelectItem value={apiDetails.target_url}>
                            {apiDetails.target_url} (Direct - Debug)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="params" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <p className="font-medium">Query Params</p>
                  {apiDetails?.query_params && apiDetails.query_params.length > 0 ? (
                    <div className="space-y-3">
                      {apiDetails.query_params.map((param) => (
                        <div key={param.key} className="space-y-2">
                          <Label htmlFor={param.key}>{param.key}</Label>
                          <Input
                            id={param.key}
                            placeholder={`Enter value for ${param.key}`}
                            value={queryParams[param.key] || ""}
                            onChange={(e) => handleQueryParamChange(param.key, e.target.value)}
                          />
                          <p className="text-muted-foreground text-xs">Default: {param.value || "N/A"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No parameters available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="headers" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <Label>Content-type</Label>
                  <Input
                    disabled
                    placeholder=""
                    value="application/json"
                  />
                </div>
                <div className="space-y-4 mt-4">
                  <Label>X-Subscription-Key</Label>
                  <Input
                    disabled
                    placeholder=""
                    value={`test-key-${apiDetails?.api_id}`}
                  />
                </div>

                {/* Dynamic Required Headers */}
                {apiDetails?.required_headers && apiDetails.required_headers.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <div className="border-t pt-4">
                      <p className="font-medium mb-4">Required Headers</p>
                      {apiDetails.required_headers.map((header) => (
                        <div key={header.name} className="space-y-2 mb-4">
                          <Label htmlFor={header.name}>{header.name}</Label>
                          <Input
                            id={header.name}
                            placeholder={header.is_variable ? `Enter value for ${header.name}` : header.value}
                            value={headerValues[header.name]?.value || ""}
                            onChange={(e) => handleHeaderValueChange(header.name, e.target.value)}
                            disabled={!header.is_variable}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="body" className="space-y-4">
            <Body
              onBodyChange={handleBodyChange}
              initialBodyData={bodyData || undefined}
            />
          </TabsContent>

          <TabsContent value="auth" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label>Authorization Type</Label>
                <Select
                  value={selectedAuthType}
                  onValueChange={setSelectedAuthType}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select auth type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(authTypes).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* {apiDetails?.required_headers &&
                  apiDetails.required_headers.length > 0 ? (
                    apiDetails.required_headers.map((header) => (
                      <div key={header.name} className="space-y-2">
                        <Label className="font-bold flex items-center gap-2">
                          {header.name}
                          {header.is_variable && (
                            <span className="text-xs text-blue-500 font-normal">
                              (Variable)
                            </span>
                          )}
                        </Label>
                        <Input
                          disabled
                          placeholder={
                            header.is_variable
                              ? `Enter your ${header.name}`
                              : header.value
                          }
                          value={headerValues[header.name]?.value || ""}
                          onChange={(e) => {
                            setHeaderValues((prev) => ({
                              ...prev,
                              [header.name]: {
                                value: e.target.value,
                                is_variable: header.is_variable,
                              },
                            }));
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">
                      No headers available
                    </p>
                  )} */}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {authTypes[selectedAuthType as keyof typeof authTypes]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="overflow-x-auto">
                    <p className="text-muted-foreground">
                      No additional authorization headers needed
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="code" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <pre className="whitespace-pre-wrap overflow-x-auto bg-gray-100 p-4 rounded-md">
                  {generateCurlCode()}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="example" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Example Responses</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pl-6">
                <div className="text-muted-foreground">
                  <p className="text-muted-foreground">
                    No example responses available for this endpoint
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle className="text-sm">Results</CardTitle>
                  <Button
                    onClick={() => {
                      console.log("endpoint----------->", endpoint);

                      // Generate the test key 
                      const uniqueTestKey = `test-key-${apiDetails?.api_id}`;

                      // Prepare headers including required subscription key and content-type
                      const requestHeaders = [
                        { name: 'Content-Type', value: 'application/json' },
                        { name: 'X-Subscription-Key', value: uniqueTestKey },
                        ...Object.entries(headerValues).map(([name, value]) => ({
                          name,
                          value: value.value,
                        }))
                      ];

                      // Construct URL with query parameters
                      let targetUrl = selectedUrl + apiDetails?.path;
                      const validQueryParams = Object.entries(queryParams).filter(([key, value]) => value.trim() !== "");
                      if (validQueryParams.length > 0) {
                        const queryString = validQueryParams.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
                        targetUrl += `?${queryString}`;
                      }

                      const testData: TestRequestData = {
                        method: endpoint?.method || "GET",
                        target_url: targetUrl,
                        headers: requestHeaders,
                        body: bodyData || undefined,
                      };
                      handleTest(testData);
                      // setIsTestLoading(true); // Trigger loading state
                    }}
                    disabled={isTestLoading}
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
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ResponseViewer isLoading={isLoading} response={response} />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
