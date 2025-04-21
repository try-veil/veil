'use client'

import Request from '@/features/projects/request'
import React, { useState, useEffect } from 'react'
import { ResizableBox as BaseResizableBox, ResizableBoxProps } from 'react-resizable'
import 'react-resizable/css/styles.css'
import ResponseViewer from '@/features/projects/request/components/response-viewer'

// Create a properly typed wrapper for ResizableBox
const ResizableBox = BaseResizableBox as unknown as React.FC<ResizableBoxProps & { children: React.ReactNode }>

export default function RequestPage() {
  const [isCodePreviewExpanded, setIsCodePreviewExpanded] = useState(false)
  const [codeType, setCodeType] = useState("curl")
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    setViewportHeight(window.innerHeight)
    const handleResize = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
    <div className="h-[calc(100vh-7rem)] w-full flex flex-col">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 p-4">
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
            onSend={handleSendRequest}
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
          <ResponseViewer 
            isLoading={isLoading}
            response={response}
          />
        </ResizableBox>
      </div>
    </div>
  )
}
