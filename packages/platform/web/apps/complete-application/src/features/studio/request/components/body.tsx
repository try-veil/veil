"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import FormUrlEncoded from "./form-url-encoded";
import Multipart from "./multipart";
import JsonEditor from "./json-editor";

export default function Body() {
  const [bodyType, setBodyType] = useState("text");
  const [textContent, setTextContent] = useState("");
  const [graphqlContent, setGraphqlContent] = useState("");

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
          <JsonEditor />
        </TabsContent>
        <TabsContent value="form-url-encoded" className="space-y-4">
          <FormUrlEncoded />
        </TabsContent>
        <TabsContent value="multipart" className="space-y-4">
          <Multipart />
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
