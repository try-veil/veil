import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import React, { useState, useEffect } from 'react'
import { JsonViewer } from '@/features/projects/request/components/json-tree-viewer'
import { OnboardAPI } from '@/app/api/onboard-api/route'
import { dummyEndpoint } from './endpoints'
interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  name: string;
  category: string;
  api_id: string;
}

interface EndpointViewerProps {
  endpoint: Endpoint | null;
  apiDetails?: OnboardAPI | null;
}

interface HeaderValue {
  value: string;
  is_variable: boolean;
}

export default function EndpointViewer({ endpoint, apiDetails }: EndpointViewerProps) {
  const [headerValues, setHeaderValues] = useState<Record<string, HeaderValue>>({})
  const [selectedApp, setSelectedApp] = useState<string>("")
  const [selectedKey, setSelectedKey] = useState<string>("")
  const [selectedUrl, setSelectedUrl] = useState<string>("")
  const [selectedAuthType, setSelectedAuthType] = useState('bearer')

  const authTypes = {
    'api_key': 'API Key',
    'oauth2': 'OAuth 2.0',
    'bearer': 'Bearer Token'
  }

  // Initialize header values when apiDetails changes
  useEffect(() => {
    if (apiDetails?.required_headers) {
      const initialHeaders: Record<string, HeaderValue> = {};
      apiDetails.required_headers.forEach(header => {
        initialHeaders[header.name] = {
          value: header.value || '',
          is_variable: header.is_variable
        };
      });
      setHeaderValues(initialHeaders);
    }
  }, [apiDetails]);

  const generateCurlCommand = () => {
    if (!apiDetails) return 'No API details available';

    let curl = `curl -X ${apiDetails.method} '${apiDetails.target_url}${apiDetails.path}'`;

    // Add headers with current values
    if (apiDetails.required_headers && apiDetails.required_headers.length > 0) {
      apiDetails.required_headers.forEach(header => {
        const headerValue = headerValues[header.name];
        curl += `\n  -H '${header.name}: ${headerValue?.value || '<YOUR_' + header.name.toUpperCase() + '>'}'`;
      });
    }

    // Add authorization header
    curl += `\n  -H 'Authorization: Bearer <YOUR_TOKEN>'`;

    return curl;
  };

  // If no endpoint is selected, show a message
  if (!endpoint) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-muted-foreground">
        <p>Select an endpoint from the list to view its details</p>
      </div>
    )
  }

  const getAuthContent = () => {
    switch (selectedAuthType) {
      case 'api_key':
        return dummyEndpoint.auth.apiKey
      case 'oauth2':
        return dummyEndpoint.auth.oauth2
      case 'bearer':
        return dummyEndpoint.auth.bearerToken
      default:
        return null
    }
  }

  return (
    <div>
      <Tabs defaultValue="app" className="space-y-4">
        <div className="px-4">
          <TabsList className="flex flex-wrap h-auto min-h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground gap-2">
            <TabsTrigger value="app" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">App</TabsTrigger>
            <TabsTrigger value="params" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Params</TabsTrigger>
            <TabsTrigger value="headers" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Headers</TabsTrigger>
            <TabsTrigger value="body" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Body</TabsTrigger>
            <TabsTrigger value="auth" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Authorizations</TabsTrigger>
            <TabsTrigger value="code" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Code Snippets</TabsTrigger>
            <TabsTrigger value="example" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Example Responses</TabsTrigger>
            <TabsTrigger value="results" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Results</TabsTrigger>
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
                        <p>{apiDetails?.name || 'Not available'}</p>
                      </div>
                      <div>
                        <Label className="font-bold">Description</Label>
                        <p>{apiDetails?.description || 'Not available'}</p>
                      </div>
                      <div>
                        <Label className="font-bold">Version</Label>
                        <p>{apiDetails?.version || 'Not available'}</p>
                      </div>
                      <div>
                        <Label className="font-bold">Documentation URL</Label>
                        <p>{apiDetails?.documentation_url || 'Not available'}</p>
                      </div>
                    </div>
                  </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>App</Label>
                    <Select value={selectedApp} onValueChange={setSelectedApp}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an app" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="app1">App 1</SelectItem>
                        <SelectItem value="app2">App 2</SelectItem>
                        <SelectItem value="app3">App 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>V-Veil-Key</Label>
                    <Select value={selectedKey} onValueChange={setSelectedKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a key" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="key1">Key 1</SelectItem>
                        <SelectItem value="key2">Key 2</SelectItem>
                        <SelectItem value="key3">Key 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Request URL</Label>
                    <Select value={selectedUrl} onValueChange={setSelectedUrl}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a URL" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="url1">https://api.example.com/v1</SelectItem>
                        <SelectItem value="url2">https://api.example.com/v2</SelectItem>
                        <SelectItem value="url3">https://api.example.com/v3</SelectItem>
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
                  <p className="text-muted-foreground">No parameters available</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="headers" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {apiDetails?.required_headers && apiDetails.required_headers.length > 0 ? (
                    apiDetails.required_headers.map((header) => (
                      <div key={header.name} className="space-y-2">
                        <Label className="font-bold flex items-center gap-2">
                          {header.name}
                          {header.is_variable && (
                            <span className="text-xs text-blue-500 font-normal">(Variable)</span>
                          )}
                        </Label>
                        <Input
                          placeholder={header.is_variable ? `Enter your ${header.name}` : header.value}
                          value={headerValues[header.name]?.value || ''}
                          onChange={(e) => {
                            setHeaderValues(prev => ({
                              ...prev,
                              [header.name]: {
                                value: e.target.value,
                                is_variable: header.is_variable
                              }
                            }));
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No headers available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="body" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <p className="text-muted-foreground">No body schema available</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label>Authorization Type</Label>
                <Select value={selectedAuthType} onValueChange={setSelectedAuthType}>
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
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {authTypes[selectedAuthType as keyof typeof authTypes]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="overflow-x-auto">
                    <JsonViewer 
                      data={getAuthContent()} 
                      rootName={selectedAuthType}
                      className="whitespace-pre-wrap break-words"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="code" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <pre className="whitespace-pre-wrap overflow-x-auto bg-gray-100 p-4 rounded-md">
                  {generateCurlCommand()}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="example" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Example Responses</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="text-muted-foreground">
                  <p className="text-muted-foreground">No example responses available for this endpoint</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Results</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="text-muted-foreground">
                  <p className="text-muted-foreground">No results available. Make a request to see the response.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
