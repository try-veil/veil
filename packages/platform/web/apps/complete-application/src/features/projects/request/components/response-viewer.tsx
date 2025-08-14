'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { JsonViewer } from "./json-tree-viewer"
// import { ChevronDown, ChevronUp } from 'lucide-react'
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"

interface ResponseViewerProps {
  isLoading?: boolean
  response?: {
    status: number
    statusText: string
    headers: Record<string, string>
    data: any
    info?: {
      date: string
      url: string
      status: string
      library: string
      headersResponseTime: string
      totalResponseTime: string
      responseBodySize: string
    }
    request?: {
      method: string
      url: string
      path: string
      headers: Record<string, string>
      curl?: string
    }
  }
}

export default function ResponseViewer({ isLoading, response }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState('info')
  // const [isCodePreviewExpanded, setIsCodePreviewExpanded] = useState(false)
  // const [codeType, setCodeType] = useState("curl")

  const statusColor = response && response.status !== undefined
    ? response.status === 0
      ? 'bg-orange-500' // Network error
      : response.status >= 200 && response.status < 300 
        ? 'bg-green-500'  // Success
        : response.status >= 400 && response.status < 500
          ? 'bg-yellow-500' // Client error (upstream API issue)
          : response.status >= 500
            ? 'bg-red-500'   // Server error
            : 'bg-gray-500'  // Other
    : 'bg-gray-500'

  // const generateCodePreview = () => {
  //   if (!response?.request) return "// Make a request to see the code preview"
    
  //   const baseUrl = response.request.url + response.request.path
  //   const headers = response.request.headers

  //   switch (codeType) {
  //     case "curl":
  //       return `curl -X ${response.request.method} "${baseUrl}" \\
  // ${Object.entries(headers).map(([key, value]) => `  -H "${key}: ${value}"`).join(" \\\n")}`

  //     case "python-requests":
  //       return `import requests

  // headers = {
  // ${Object.entries(headers).map(([key, value]) => `    "${key}": "${value}"`).join(",\n")}
  // }

  // response = requests.${response.request.method.toLowerCase()}("${baseUrl}", headers=headers)
  // print(response.json())`

  //     case "nodejs-axios":
  //       return `const axios = require('axios');

  // const headers = {
  // ${Object.entries(headers).map(([key, value]) => `  '${key}': '${value}'`).join(",\n")}
  // };

  // axios.${response.request.method.toLowerCase()}('${baseUrl}', { headers })
  //   .then(response => console.log(response.data))
  //   .catch(error => console.error(error));`

  //     case "nodejs-request":
  //       return `const request = require('request');

  // const options = {
  //   url: '${baseUrl}',
  //   method: '${response.request.method}',
  //   headers: {
  // ${Object.entries(headers).map(([key, value]) => `    '${key}': '${value}'`).join(",\n")}
  //   }
  // };

  // request(options, function(error, response, body) {
  //   if (!error && response.statusCode == 200) {
  //     console.log(body);
  //   }
  // });`

  //     case "python-http-client":
  //       return `import http.client
  // import json
  // from urllib.parse import urlparse

  // url = urlparse("${baseUrl}")
  // conn = http.client.HTTPSConnection(url.netloc)

  // headers = {
  // ${Object.entries(headers).map(([key, value]) => `    '${key}': '${value}'`).join(",\n")}
  // }

  // conn.request("${response.request.method}", url.path, headers=headers)

  // res = conn.getresponse()
  // data = res.read()

  // print(data.decode("utf-8"))`

  //     case "clojure":
  //       return `(require '[clj-http.client :as client])

  // (client/${response.request.method.toLowerCase()} "${baseUrl}"
  //   {:headers {${Object.entries(headers).map(([key, value]) => `"${key}" "${value}"`).join("\n            ")}})`

  //     default:
  //       return "// Select a language to see the code preview"
  //   }
  // }

  return (
    <div className="flex flex-col h-full">
      {/* Status Bar */}
      <div className="flex-none p-4 border-b flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${statusColor}`} />
        <div className="font-mono">
          {response 
            ? response.status === 0 
              ? `Network Error: ${response.statusText}` 
              : response.status >= 400 && response.status < 500
                ? `${response.status} ${response.statusText} (Upstream API Issue)`
                : `${response.status} ${response.statusText}`
            : 'No Response'
          }
        </div>
        {response?.request?.method && (
          <div className="ml-auto">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
              {response.request.method}
            </span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="request">Request</TabsTrigger>
          <TabsTrigger value="response">Response</TabsTrigger>
        </TabsList>

        <div className="p-4 overflow-auto flex-1">
          <TabsContent value="info" className="h-full">
            <div className="space-y-2">
              {response?.info && Object.entries(response.info).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-4">
                  <div className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div className="text-muted-foreground font-mono">{String(value)}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="request" className="h-full">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="font-medium">Request Details</div>
                <div className="space-y-2">
                  {response?.request && Object.entries(response.request).map(([key, value]) => {
                    if (key === 'headers' || key === 'curl') return null;
                    return (
                      <div key={key} className="grid grid-cols-2 gap-4">
                        <div className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className="text-muted-foreground font-mono">{String(value)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {response?.request?.curl && (
                <div className="space-y-2">
                  <div className="font-medium">Curl Command</div>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {response.request.curl}
                  </pre>
                </div>
              )}

              <div className="space-y-2">
                <div className="font-medium">Headers</div>
                <JsonViewer data={response?.request?.headers || {}} rootName="headers" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="response" className="h-full">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="font-medium">Headers</div>
                <JsonViewer data={response?.headers || {}} rootName="headers" />
              </div>
              
              <div className="space-y-2">
                <div className="font-medium">Body</div>
                <div className="space-y-4">
                  {/* Context messages for different error types */}
                  {response?.status >= 400 && response?.status < 500 && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-sm text-yellow-800">
                        <strong>Note:</strong> This is a {response.status} error from the upstream API, not your gateway. 
                        The request was successfully forwarded but the upstream API rejected it.
                      </div>
                    </div>
                  )}

                  {response?.status >= 500 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm text-red-800">
                        <strong>Server Error:</strong> The upstream API is experiencing server issues.
                      </div>
                    </div>
                  )}

                  {response?.status === 0 && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="text-sm text-orange-800">
                        <strong>Network Error:</strong> Unable to connect to the API. Check your network connection.
                      </div>
                    </div>
                  )}

                  {/* Show error information if it's a network error */}
                  {response?.status === 0 && response?.data?.error && (
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                      <div className="text-sm text-orange-600 font-medium mb-2">Network Error Details</div>
                      <JsonViewer data={response.data} rootName="error" />
                    </div>
                  )}
                  
                  {/* Show parse error if JSON parsing failed */}
                  {response?.info?.parseError && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <div className="text-sm text-yellow-600 font-medium mb-2">Parse Warning</div>
                      <div className="text-sm text-yellow-700">{response.info.parseError}</div>
                    </div>
                  )}

                  {/* Show only data, usage, and limit for successful responses */}
                  {response?.data && (
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Data</div>
                      <JsonViewer data={response.data} rootName="data" />
                    </div>
                  )}
                  
                  {/* Show full response body if no specific data field */}
                  {/* {response?.data && !response.data.data && response.status !== 0 && (
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Response Body</div>
                      <JsonViewer data={response.data} rootName="body" />
                    </div>
                  )} */}
                  
                  <div className="flex gap-4">
                    {response?.data?.usage !== undefined && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm text-blue-600 font-medium">Usage</div>
                        <div className="text-lg font-semibold">{response.data.usage}</div>
                      </div>
                    )}
                    
                    {response?.data?.limit !== undefined && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-sm text-green-600 font-medium">Limit</div>
                        <div className="text-lg font-semibold">{response.data.limit}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
} 