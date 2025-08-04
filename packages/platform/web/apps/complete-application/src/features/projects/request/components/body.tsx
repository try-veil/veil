"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import FormUrlEncoded from "./form-url-encoded";
import Multipart from "./multipart";
import JsonEditor from "./json-editor";

interface BodyProps {
  onBodyChange?: (data: {
    type: string;
    content: string;
    form_data?: { key: string; value: string }[];
    json_data?: any;
  }) => void;
}

export default function Body({ onBodyChange }: BodyProps) {
  const [bodyType, setBodyType] = useState("json");
  const [textContent, setTextContent] = useState("");
  const [graphqlContent, setGraphqlContent] = useState("");
  const [formData, setFormData] = useState<{ key: string; value: string }[]>([]);
  const [jsonData, setJsonData] = useState<any>(null);

  const notifyBodyChange = () => {
    if (onBodyChange) {
      onBodyChange({
        type: bodyType,
        content: bodyType === "text" ? textContent : bodyType === "graphql" ? graphqlContent : "",
        form_data: bodyType === "form-url-encoded" ? formData : undefined,
        json_data: bodyType === "json" ? jsonData : undefined,
      });
    }
  };

  useEffect(() => {
    notifyBodyChange();
  }, [bodyType, textContent, graphqlContent, formData, jsonData]);

  const handleFormDataChange = (data: { key: string; value: string }[]) => {
    setFormData(data);
  };

  const handleJsonChange = (data: any) => {
    setJsonData(data);
  };

  return (
    <div className="space-y-4">
      <Tabs value={bodyType} onValueChange={setBodyType}>
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
            onChange={(e) => setTextContent(e.target.value)}
          />
        </TabsContent>
        <TabsContent value="json" className="space-y-4">
          <JsonEditor onJsonChange={handleJsonChange} />
        </TabsContent>
        <TabsContent value="form-url-encoded" className="space-y-4 max-h-[270px] overflow-y-auto">
          <FormUrlEncoded onFormDataChange={handleFormDataChange} />
        </TabsContent>
        <TabsContent value="multipart" className="space-y-4 max-h-[270px] overflow-y-auto pb-8">
          <Multipart onFormDataChange={handleFormDataChange} />
        </TabsContent>
        <TabsContent value="graphql" className="space-y-4">
          <Input
            placeholder=""
            className="min-h-24 w-full"
            value={graphqlContent}
            onChange={(e) => setGraphqlContent(e.target.value)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
