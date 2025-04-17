'use client'

import Request from '@/features/projects/request'
import React, { useState } from 'react'
import { ResizableBox } from 'react-resizable'
import 'react-resizable/css/styles.css'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ResponseViewer from '@/features/projects/request/components/response-viewer'

export default function page() {
  const [isCodePreviewExpanded, setIsCodePreviewExpanded] = useState(false)
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight - 200 : 600 // 32px for padding
  const requestHeight = isCodePreviewExpanded ? Math.floor(viewportHeight * 0.5) : viewportHeight - 100 // 100px for code preview header

  const [codeType, setCodeType] = useState("curl")
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)

  const handleSendRequest = () => {
    setIsLoading(true)
    // Simulated API call
    setTimeout(() => {
      setResponse({
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
          'x-powered-by': 'Express',
        },
        data: {
          message: 'Hello World',
          timestamp: new Date().toISOString(),
        },
        info: {
          date: new Date().toISOString(),
          url: 'https://echo.paw.cloud',
          status: '200 OK',
          library: 'Paw Cloud Proxy',
          headersResponseTime: '489 ms',
          totalResponseTime: '1419 ms',
          responseBodySize: '4.51 KiB',
        },
        request: {
          method: 'GET',
          url: 'https://echo.paw.cloud',
          path: '/',
          clientIP: '172.70.85.125',
          headers: {
            'Accept-Encoding': 'gzip',
            'Cdn-Loop': 'cloudflare; loops=1; subreqs=1',
            'Cf-Connecting-Ip': '2a06:98c0:3600::103',
            'Cf-Visitor': '{"scheme":"https"}',
            'Cf-Worker': 'paw.app',
            'Host': 'echo.paw.cloud',
          }
        }
      })
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="h-[calc(100vh-7rem)] w-full p-4">
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Left Column */}
        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-0">
            <ResizableBox
              width={Infinity}
              height={requestHeight}
              minConstraints={[Infinity, 200]}
              maxConstraints={[Infinity, viewportHeight - 100]}
              axis="y"
              className="rounded-lg shadow-md overflow-hidden"
            >
              <Request />
            </ResizableBox>
          </div>
          
          <div className="bg-muted rounded-lg shadow-md overflow-hidden mt-4">
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
                  {/* Add your code preview component here */}
                </div>
              </ResizableBox>
            )}
          </div>
        </div>

        {/* Right Column */}
        <ResizableBox
          width={Infinity}
          height={Infinity}
          minConstraints={[300, 100]}
          maxConstraints={[Infinity, Infinity]}
          axis="x"
          className="bg-muted rounded-lg shadow-md overflow-hidden"
        >
          <ResponseViewer 
            isLoading={isLoading}
            response={response}
            onSend={handleSendRequest}
          />
        </ResizableBox>
      </div>
    </div>
  )
}
