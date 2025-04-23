'use client'

import Request from '@/features/projects/request'
import React, { useState, useEffect } from 'react'
import { ResizableBox as BaseResizableBox } from 'react-resizable'
import type { ResizableBoxProps } from 'react-resizable'
import 'react-resizable/css/styles.css'
import ResponseViewer from '@/features/projects/request/components/response-viewer'

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
  method: string;
  target_url: string;
  headers: { name: string; value: string }[];
}

// Create a properly typed wrapper for ResizableBox
const ResizableBox = BaseResizableBox as any

export default function RequestPage() {
  const [isCodePreviewExpanded, setIsCodePreviewExpanded] = useState(false)
  const [codeType, setCodeType] = useState("curl")
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [formData, setFormData] = useState<OnboardRequestData>({
    api_id: "",
    name: "",
    path: "",
    project_id: 1,
    target_url: "",
    method: "GET",
    version: "v1",
    description: "",
    documentation_url: "",
    required_headers: []
  })

  useEffect(() => {
    setViewportHeight(window.innerHeight)
    const handleResize = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const generateCurlCommand = (data: TestRequestData) => {
    let curl = `curl -X ${data.method} '${data.target_url}'`;
    
    // Add headers
    if (data.headers && data.headers.length > 0) {
      data.headers.forEach(header => {
        curl += `\n  -H '${header.name}: ${header.value}'`;
      });
    }

    return curl;
  };

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
          path: '/',
          headers: requestHeaders,
          curl: curlCommand
        }
      });
    } catch (error) {
      console.error('Error making test request:', error);
      setResponse({
        status: 500,
        statusText: 'Error',
        data: { error: 'Failed to make test request' },
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

  const handleSaveRequest = async (requestData: any) => {
    setIsLoading(true)
    try {
      const generatedApiId = crypto.randomUUID();
      const targetUrlSegments = requestData.target_url.split('/');
      const targetUrlPart = targetUrlSegments[2] || '';
      const constructedPath = `${generatedApiId}${requestData.path}${targetUrlPart}`;

      // Transform headers to required format
      const required_headers = requestData.headers?.map((header: any) => ({
        name: header.name,
        value: header.value,
        is_variable: true
      })) || [];

      console.log('Received headers:', requestData.headers);

      const updatedFormData = {
        ...formData,
        api_id: generatedApiId,
        name: requestData.name,
        description: requestData.description,
        path: constructedPath,
        target_url: requestData.target_url,
        method: requestData.method.toUpperCase(),
        documentation_url: requestData.documentation_url,
        required_headers
      }

      // Log the form data to console
      console.log('Form Data to be sent:', updatedFormData);

      // Mock response for UI feedback
      setResponse({
        status: 200,
        statusText: 'OK',
        data: { 
          message: 'Request logged to console',
          formData: updatedFormData
        }
      })
    } catch (error) {
      console.error('Error processing request:', error)
      setResponse({
        status: 500,
        statusText: 'Error',
        data: { error: 'Failed to process request' }
      })
    } finally {
      setIsLoading(false)
    }
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
            onSave={handleSaveRequest}
            onTest={handleTest}
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
