'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { JsonViewer } from "./json-tree-viewer"

interface ResponseViewerProps {
  isLoading?: boolean
  response?: {
    status: number
    statusText: string
    headers: Record<string, string>
    data: any
    info: {
      date: string
      url: string
      status: string
      library: string
      headersResponseTime: string
      totalResponseTime: string
      responseBodySize: string
    }
    request: {
      method: string
      url: string
      path: string
      clientIP: string
      headers: Record<string, string>
    }
  }
  onSend: () => void
}

export default function ResponseViewer({ isLoading, response, onSend }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState('info')

  if (!response) {
    return (
      <div className="flex items-center justify-center h-full">
        <Button onClick={onSend} disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send Request'}
        </Button>
      </div>
    )
  }

  const statusColor = response.status >= 200 && response.status < 300 
    ? 'bg-green-500' 
    : response.status >= 400 
      ? 'bg-red-500' 
      : 'bg-yellow-500'

  return (
    <div className="h-full flex flex-col py-2 overflow-y-auto">
      <div className={`px-4 py-2 rounded-t-lg flex items-center gap-2 mb-2  `}>
        <span className={`text-white rounded-md px-2 text-center font-mono ${statusColor}`}>{response.status}</span>
        <span>{response.statusText}</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="mx-4">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="request">Request</TabsTrigger>
          <TabsTrigger value="response">Response</TabsTrigger>
        </TabsList>


        <div className="p-4 overflow-auto flex-1">
          <TabsContent value="info" className="h-full">
            <div className="space-y-2">
              {Object.entries(response.info).map(([key, value]) => (
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
                  {Object.entries(response.request).map(([key, value]) => {
                    if (key === 'headers') return null
                    return (
                      <div key={key} className="grid grid-cols-2 gap-4">
                        <div className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className="text-muted-foreground font-mono">{String(value)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="font-medium">Headers</div>
                <JsonViewer data={response.request.headers} rootName="headers" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="response" className="h-full">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="font-medium">Headers</div>
                <JsonViewer data={response.headers} rootName="headers" />
              </div>
              
              <div className="space-y-2">
                <div className="font-medium">Body</div>
                <JsonViewer data={response.data} rootName="data" />
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
} 