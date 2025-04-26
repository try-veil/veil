"use client";
import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Headers } from "./components/headers";
import { Query } from "./components/query";
import Body from "./components/body";
import { Send, Play, Loader2 } from 'lucide-react'
import { useProject } from '@/context/project-context';

interface RequestProps {
  isLoading?: boolean;
  onSave?: (data: RequestData) => void;
  onTest?: (data: TestRequestData) => void;
  initialData?: {
    name: string;
    description: string;
    path: string;
    documentation_url: string;
    method: string;
    required_headers?: { name: string; value: string; is_variable: boolean }[];
  };
}

interface RequestData {
  name: string;
  description: string;
  path: string;
  documentation_url: string;
  target_url: string;
  method: string;
  headers?: { name: string; value: string }[];
}

interface TestRequestData {
  method: string;
  target_url: string;
  headers: { name: string; value: string }[];
}

const options = new Map([
  ["get", "GET"],
  ["post", "POST"],
  ["put", "PUT"],
  ["delete", "DELETE"],
  ["patch", "PATCH"],
  ["head", "HEAD"],
  ["options", "OPTIONS"],
  ["trace", "TRACE"],
]);

export default function Request({ isLoading, onSave, onTest, initialData }: RequestProps) {
  const [method, setMethod] = useState(initialData?.method?.toLowerCase() || "get");
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [documentationUrl, setDocumentationUrl] = useState(initialData?.documentation_url || "");
  const [path, setPath] = useState(initialData?.path || "");
  const [headers, setHeaders] = useState<{ name: string; value: string }[]>(
    initialData?.required_headers?.map(h => ({ name: h.name, value: h.value })) || []
  );
  const [isTestLoading, setIsTestLoading] = useState(false);
  const { user } = useAuth();
  const { selectedProject } = useProject();

  useEffect(() => {
    if (initialData) {
      setMethod(initialData.method?.toLowerCase() || "get");
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setDocumentationUrl(initialData.documentation_url || "");
      setPath(initialData.path || "");
      setHeaders(initialData.required_headers?.map(h => ({ name: h.name, value: h.value })) || []);
    }
  }, [initialData]);

  const handleHeadersChange = (newHeaders: { id: string; name: string; value: string }[]) => {
    // Filter out empty headers and remove the id field
    const processedHeaders = newHeaders
      .filter(header => header.name.trim() !== '' && header.value.trim() !== '')
      .map(({ name, value }) => ({ name, value }));
    setHeaders(processedHeaders);
  };
  const targetUrl = selectedProject?.target_url;  
  const handleSave = () => {
    const formData = {
      name,
      description,
      path,
      documentation_url: documentationUrl,
      method,
      headers,
      target_url: targetUrl
    };
    console.log("Request Data",targetUrl);
    if (onSave) {
      onSave(formData as RequestData);
    }
  };

  const handleTest = async () => {
    if (!targetUrl) {
      alert('Please enter a target URL');
      return;
    }

    setIsTestLoading(true);
    
    const testData: TestRequestData = {
      method,
      target_url: `${targetUrl}${path}`,
      headers
    };

    if (onTest) {
      await onTest(testData);
    }

    setIsTestLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* URL Bar */}
      <div className="flex-none p-4 border-b">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue>{options.get(method)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="get">GET</SelectItem>
              <SelectItem value="head">HEAD</SelectItem>
              <SelectItem value="post">POST</SelectItem>
              <SelectItem value="put">PUT</SelectItem>
              <SelectItem value="delete">DELETE</SelectItem>
              <SelectItem value="patch">PATCH</SelectItem>
              <SelectItem value="options">OPTIONS</SelectItem>
              <SelectItem value="trace">TRACE</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Enter your endpoint"
            className="flex-1"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleTest}
              disabled={isTestLoading}
              variant="secondary"
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
            <Button 
              onClick={handleSave} 
              disabled={isLoading || !!initialData?.path}
              variant="default"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {initialData?.path !== "" ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {initialData?.path !== '' ? 'Update' : 'Save'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs defaultValue="overview" className="flex flex-col h-full">
          <div className="flex-none px-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Description</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
              <TabsTrigger disabled value="query">Query</TabsTrigger>
              <TabsTrigger disabled value="body">Body</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto px-4 py-2">
              <TabsContent value="overview" className="mt-0 h-full">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>End point name</Label>
                    <Input
                      placeholder="End point name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Set Description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  {/* <div className="space-y-2">
                    <Label>Path</Label>
                    <Input
                      placeholder="/your-api-path"
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                    />
                  </div> */}
                  <div className="space-y-2">
                    <Label>Documentation URL</Label>
                    <Input
                      placeholder="https://docs.example.com"
                      value={documentationUrl}
                      onChange={(e) => setDocumentationUrl(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="headers" className="mt-0 h-full">
                <Headers onHeadersChange={handleHeadersChange} />
              </TabsContent>

              <TabsContent value="query" className="mt-0 h-full">
                <Query />
              </TabsContent>

              <TabsContent value="body" className="mt-0 h-full">
                <Body />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
