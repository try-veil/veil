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
import { Button } from "@/components/ui/button";
import { Send, Play, Loader2 } from "lucide-react";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  name: string;
  apiId: string;
  version: string;
  path: string;
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
}

export default function EndpointViewer({
  endpoint,
  apiDetails,
}: EndpointViewerProps) {
  const [headerValues, setHeaderValues] = useState<Record<string, HeaderValue>>(
    {}
  );
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [selectedUrl, setSelectedUrl] = useState<string>(process.env.NEXT_PUBLIC_VEIL_URL || "https://veil.com");
  const [selectedAuthType, setSelectedAuthType] = useState("bearer");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);

  const authTypes = {
    api_key: "API Key",
    oauth2: "OAuth 2.0",
    bearer: "Bearer Token",
  };

  // Initialize header values when apiDetails changes
  useEffect(() => {
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
  }, [apiDetails]);

  const generateCurlCode = () => {
    if (!apiDetails) return "No API details available";

    let curl = `curl -X ${apiDetails.method} '${process.env.NEXT_PUBLIC_VEIL_URL}/${apiDetails.path}'`;

    // Add headers with current values
    if (apiDetails.required_headers && apiDetails.required_headers.length > 0) {
      apiDetails.required_headers.forEach((header) => {
        const headerValue = headerValues[header.name];
        curl += `\n  -H '${header.name}: ${headerValue?.value || "<YOUR_" + header.name.toUpperCase() + ">"}'`;
      });
    }

    // Add authorization header
    curl += `\n  -H 'x-veilapi-host: ${apiDetails.api_id}'`;

    return curl;
  };

  const generateCurlCommand = (data: TestRequestData) => {
    console.log("data..........",data)
    let curl = `curl -X ${data.method} ${data.target_url}`;

    // Add headers
    if (data.headers && data.headers.length > 0) {
      data.headers.forEach((header) => {
        curl += `\n  -H '${header.name}: ${header.value}'`;
      });
    }

    return curl;
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
    try {
      const curlCommand = generateCurlCommand(testData);
      
      // Make the actual HTTP request
      const requestHeaders: Record<string, string> = {};
      testData.headers.forEach(header => {
        requestHeaders[header.name] = header.value;
      });

      const response = await fetch(testData.target_url, {
        method: testData.method,
        headers: requestHeaders
      });

      const responseData = await response.json();

      console.log("^^^^^^^",responseData)

      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        info: {
          date: new Date().toISOString(),
          url: testData.target_url,
          status: `${response.status} ${response.statusText}`,
          library: 'Fetch API',
          headersResponseTime: 'N/A',
          totalResponseTime: 'N/A',
          responseBodySize: 'N/A',
        },
        request: {
          method: testData.method,
          url: testData.target_url,
          path: apiDetails?.path,
          headers: requestHeaders,
          curl: curlCommand
        }
      });

      console.log("@@@@@@",response)

    } catch (error) {
      console.error('Error making test request:', error);
      setResponse({
        status: 500,
        statusText: 'Error',
        data: { error: 'Failed to make test request' },
        info: {
          date: new Date().toISOString(),
          url: testData.target_url,
          status: `${response.status} ${response.statusText}`,
          library: 'Fetch API',
          headersResponseTime: 'N/A',
          totalResponseTime: 'N/A',
          responseBodySize: 'N/A',
        },
        request: {
          method: testData.method,
          url: testData.target_url,
          path: '/',
          headers: testData.headers,
          curl: generateCurlCommand(testData)
        }
      });
    }
  };

  return (
    <div>
      <Tabs defaultValue="app" className="space-y-4">
        <div className="px-4">
          <TabsList className="flex flex-wrap h-auto min-h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground gap-2">
            <TabsTrigger
              value="app"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              App
            </TabsTrigger>
            <TabsTrigger
              disabled
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
              disabled
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
                        <SelectItem value={process.env.NEXT_PUBLIC_VEIL_URL || "https://veil.com"}>https://veil.com</SelectItem>
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
                  <p className="text-muted-foreground">
                    No parameters available
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="headers" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <Label>X-VeilAPI-Host</Label>
                  <Input
                    disabled
                    placeholder=""
                    value={`veil.com/${apiDetails?.api_id}`}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="body" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <p className="text-muted-foreground">
                    No body schema available
                  </p>
                </div>
              </CardContent>
            </Card>
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
console.log("endpoint----------->",endpoint);
                      console.log("path--->",endpoint.path)
                      const testData: TestRequestData = {
                        method: endpoint?.method || "GET",
                        target_url: selectedUrl+"/"+apiDetails?.path,
                        headers: Object.entries(headerValues).map(
                          ([name, value]) => ({
                            name,
                            value: value.value,
                          })
                        ),
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
