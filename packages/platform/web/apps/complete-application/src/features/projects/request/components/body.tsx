"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import FormUrlEncoded from "./form-url-encoded";
import Multipart from "./multipart";
import JsonEditor from "./json-editor";
import { GraphQLEditor } from "./graphql-editor";

interface BodyProps {
  onBodyChange?: (data: {
    type: string;
    content?: string;
    form_data?: { key: string; value: string }[];
    multipart_data?: { key: string; value: string }[];
    json_data?: any;
  }) => void;
  initialBodyData?: {
    type: string;
    content?: string;
    form_data?: { key: string; value: string }[];
    multipart_data?: { key: string; value: string }[];
    json_data?: any;
  };
}

export default function Body({ onBodyChange, initialBodyData }: BodyProps) {
  const initializedRef = useRef(false);
  const [bodyType, setBodyType] = useState(initialBodyData?.type || "json");
  const [textContent, setTextContent] = useState(initialBodyData?.content || "");
  const [graphqlContent, setGraphqlContent] = useState(
    initialBodyData?.type === "graphql" ? initialBodyData.content : ""
  );
  const [formData, setFormData] = useState<{ key: string; value: string }[]>(
    initialBodyData?.form_data || []
  );
  const [multipartData, setMultipartData] = useState<{ key: string; value: string }[]>(
    initialBodyData?.multipart_data || []
  );
  const [jsonData, setJsonData] = useState<any>(initialBodyData?.json_data || null);

  const notifyBodyChange = () => {
    if (onBodyChange) {
      const bodyData: any = { type: bodyType };
      
      switch (bodyType) {
        case 'json':
          if (jsonData !== null && jsonData !== undefined) {
            bodyData.json_data = jsonData;
          }
          break;
        case 'text':
          if (textContent.trim() !== '') {
            bodyData.content = textContent;
          }
          break;
        case 'graphql':
          if (graphqlContent.trim() !== '') {
            bodyData.content = graphqlContent;
          }
          break;
        case 'form-url-encoded':
          if (formData.length > 0) {
            bodyData.form_data = formData;
          }
          break;
        case 'multipart':
          if (multipartData.length > 0) {
            bodyData.multipart_data = multipartData;
          }
          break;
      }
      
      onBodyChange(bodyData);
    }
  };

  useEffect(() => {
    notifyBodyChange();
  }, [bodyType, textContent, graphqlContent, formData, multipartData, jsonData]);

  // Update state when initialBodyData prop changes (only if not already initialized by user interactions)
  useEffect(() => {
    if (!initializedRef.current && initialBodyData) {
      setBodyType(initialBodyData.type || "json");
      setTextContent(initialBodyData.content || "");
      setGraphqlContent(
        initialBodyData.type === "graphql" ? initialBodyData.content : ""
      );
      setFormData(initialBodyData.form_data || []);
      setMultipartData(initialBodyData.multipart_data || []);
      setJsonData(initialBodyData.json_data || null);
      initializedRef.current = true;
    }
  }, [initialBodyData]);

  const handleFormDataChange = (data: { key: string; value: string }[]) => {
    setFormData(data);
    initializedRef.current = true; // Mark as initialized by user interaction
  };

  const handleMultipartDataChange = (data: { key: string; value: string }[]) => {
    setMultipartData(data);
    initializedRef.current = true; // Mark as initialized by user interaction
  };

  const handleJsonChange = (data: any) => {
    setJsonData(data);
    initializedRef.current = true; // Mark as initialized by user interaction
  };

  return (
    <div className="space-y-4">
      <Tabs value={bodyType} onValueChange={(value) => {
        setBodyType(value);
        initializedRef.current = true; // Mark as initialized by user interaction
      }}>
        <TabsList>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="form-url-encoded">Form URL Encoded</TabsTrigger>
          <TabsTrigger value="multipart">Multipart</TabsTrigger>
          <TabsTrigger value="graphql">GraphQL</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="space-y-4">
          <Input
            placeholder=""
            className="min-h-24 w-full"
            value={textContent}
            onChange={(e) => {
              setTextContent(e.target.value);
              initializedRef.current = true; // Mark as initialized by user interaction
            }}
          />
        </TabsContent>
        <TabsContent value="json" className="space-y-4">
          <JsonEditor 
            onJsonChange={handleJsonChange} 
            initialJsonData={jsonData} 
          />
        </TabsContent>
        <TabsContent value="form-url-encoded" className="space-y-4 max-h-[270px] overflow-y-auto">
          <FormUrlEncoded 
            onFormDataChange={handleFormDataChange} 
            initialFormData={formData}
          />
        </TabsContent>
        <TabsContent value="multipart" className="space-y-4 max-h-[270px] overflow-y-auto pb-8">
          <Multipart 
            onFormDataChange={handleMultipartDataChange} 
            initialFormData={multipartData}
          />
        </TabsContent>
        <TabsContent value="graphql" className="space-y-4">
          <GraphQLEditor
            value={graphqlContent}
            onChange={(value) => {
              setGraphqlContent(value || "");
              initializedRef.current = true; // Mark as initialized by user interaction
            }}
            className="min-h-24 w-full"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
