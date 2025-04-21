"use client";
import React from 'react'
import { useState } from "react";
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
import { Send } from 'lucide-react'

interface RequestProps {
  isLoading?: boolean;
  onSend?: () => void;
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

export default function Request({ isLoading, onSend }: RequestProps) {
  const [type, setType] = useState("get");
  const [urlTerm, setUrlTerm] = useState("");

  return (
    <div className="flex flex-col h-full">
      {/* URL Bar */}
      <div className="flex-none p-4 border-b">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue>{options.get(type)}</SelectValue>
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
            placeholder="http://google.com"
            className="flex-1"
            value={urlTerm}
            onChange={(e) => setUrlTerm(e.target.value)}
          />
          <Button 
            onClick={onSend} 
            disabled={isLoading}
            variant="default"
            size="sm"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs defaultValue="overview" className="flex flex-col h-full">
          <div className="flex-none px-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Description</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
              <TabsTrigger value="query">Query</TabsTrigger>
              <TabsTrigger value="body">Body</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto px-4 py-2">
              <TabsContent value="overview" className="mt-0 h-full">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="Request Name"
                      value={urlTerm}
                      onChange={(e) => setUrlTerm(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Set Description"
                      value={urlTerm}
                      onChange={(e) => setUrlTerm(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="headers" className="mt-0 h-full">
                <Headers />
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
