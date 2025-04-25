'use client'

import Request from '@/features/projects/request'
import React, { useState, useEffect } from 'react'
import { ResizableBox as BaseResizableBox } from 'react-resizable'
import type { ResizableBoxProps } from 'react-resizable'
import 'react-resizable/css/styles.css'
import ResponseViewer from '@/features/projects/request/components/response-viewer'
import { useAuth } from '@/contexts/AuthContext'
import { onboardAPI } from '@/app/api/onboard-api/route'
import { toast } from '@/hooks/use-toast'
import { useProject } from '@/context/project-context'
import { updateProject } from '@/lib/api'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// Target URL Schema
const targetUrlSchema = z.object({
  target_url: z.string().url({
    message: 'Please enter a valid URL.',
  }),
})

type TargetUrlFormValues = z.infer<typeof targetUrlSchema>

// Target URL Modal Component
function TargetUrlModal({ 
  open, 
  onOpenChange,
  onSuccess,
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { selectedProject, refreshProject } = useProject();
  const { accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<TargetUrlFormValues>({
    resolver: zodResolver(targetUrlSchema),
    defaultValues: {
      target_url: '',
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // If user tries to close the modal, navigate back
      router.back();
    }
  };

  async function onSubmit(data: TargetUrlFormValues) {
    try {
      setIsLoading(true);
      if (!selectedProject?.id || !accessToken) {
        throw new Error('Project ID or access token not found');
      }

      // Update project with new target_url
      await updateProject(accessToken, selectedProject.id, {
        target_url: data.target_url
      });

      // Refresh project data
      await refreshProject();

      toast({
        title: 'Success',
        description: 'Target URL updated successfully',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating target URL:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update target URL',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={handleOpenChange}
      modal={true}
    >
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set Target URL</DialogTitle>
          <DialogDescription>
            Please set the target URL for your API endpoints. This will be used as the base URL for all requests.
            You must set a target URL to continue.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='target_url'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='https://api.example.com'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The base URL for your API endpoints
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Target URL'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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
  const { user, accessToken } = useAuth()
  const { selectedProject } = useProject()
  const [showTargetUrlModal, setShowTargetUrlModal] = useState(false)
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

  // Check if target_url is missing when component mounts or selectedProject changes
  useEffect(() => {
    if (selectedProject && !selectedProject.target_url) {
      setShowTargetUrlModal(true);
    }
  }, [selectedProject]);
  
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

      const updatedFormData = {
        ...formData,
        api_id: generatedApiId,
        name: requestData.name,
        description: requestData.description,
        path: constructedPath,
        target_url: requestData.target_url,
        method: requestData.method.toUpperCase(),
        documentation_url: requestData.documentation_url,
        required_headers,
        project_id: selectedProject?.id
      }
      console.log("client",updatedFormData);
      // Make API request to /onboard endpoint
      if (accessToken) {
        try {
          const response = await onboardAPI(updatedFormData, accessToken);
          
          console.log('API onboarded successfully:', response);
          toast({
            title: "Success",
            description: "API onboarded successfully",
            variant: "default",
          });
        } catch (error: any) {
          console.error('Error onboarding API:', error);
          toast({
            title: "Error",
            description: error.message || "Failed to onboard API",
            variant: "destructive",
          });
        }
      } else {
        console.error('No authentication token available');
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive",
        });
        setResponse({
          status: 401,
          statusText: 'Unauthorized',
          data: { error: 'Authentication required' }
        });
      }
    } catch (error) {
      console.error('Error processing request:', error)
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive",
      });
      
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <TargetUrlModal 
        open={showTargetUrlModal} 
        onOpenChange={setShowTargetUrlModal}
        onSuccess={() => {
          // Additional actions after successful update if needed
        }}
      />

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
    </>
  )
}
