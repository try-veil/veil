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

  const statusColor = response && response.status
    ? response.status >= 200 && response.status < 300 
      ? 'bg-green-500' 
      : response.status >= 400 
        ? 'bg-red-500' 
        : 'bg-yellow-500'
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
          {response ? `${response.status} ${response.statusText}` : 'No Response'}
        </div>
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
                <JsonViewer data={response?.data || {}} rootName="data" />
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
} 