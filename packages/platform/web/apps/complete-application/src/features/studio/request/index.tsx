"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
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

export default function Request() {
  const [type, setType] = useState("get");
  const [urlTerm, setUrlTerm] = useState("");
  const options = new Map<string, string>([
    ["get", "GET"],
    ["head", "HEAD"],
    ["post", "POST"],
    ["put", "PUT"],
    ["delete", "DELETE"],
    ["patch", "PATCH"],
    ["options", "OPTIONS"],
    ["trace", "TRACE"],
  ]);
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className="mb-2 flex items-center justify-between space-y-2">
          <div className="flex flex-col gap-4 sm:my-4 sm:flex-row">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-36">
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
              className="h-9 w-40 lg:w-[250px]"
              value={urlTerm}
              onChange={(e) => setUrlTerm(e.target.value)}
            />
            <Button>Send</Button>
          </div>
        </div>
        <Tabs
          orientation="vertical"
          defaultValue="overview"
          className="space-y-4"
        >
          {/* <div className='w-full overflow-x-auto pb-2'> */}
          <TabsList>
            <TabsTrigger value="overview">Description</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="query">Query</TabsTrigger>
            <TabsTrigger value="body">Body</TabsTrigger>
            <TabsTrigger value="more">More</TabsTrigger>
          </TabsList>
          {/* </div> */}
          <TabsContent value="overview" className="space-y-4">
            <>
            <Label>Name</Label> 
            <Input
              placeholder="Request Name"
              className="h-9 w-full"
              value={urlTerm}
              onChange={(e) => setUrlTerm(e.target.value)}
            />
             <Label>Description</Label> 
            <Input
              placeholder="Set Description"
              className="h-9 w-full"
              value={urlTerm}
              onChange={(e) => setUrlTerm(e.target.value)}
            />
            </>
          </TabsContent>
          <TabsContent value="headers" className="space-y-4">
            <Headers />
          </TabsContent>
          <TabsContent value="query" className="space-y-4">
            <Query />
          </TabsContent>
          <TabsContent value="body" className="space-y-4">
            <p>body</p>
          </TabsContent>
          <TabsContent value="more" className="space-y-4">
            <p>more</p>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  );
}

const topNav = [
  {
    title: "Overview",
    href: "dashboard/overview",
    isActive: true,
    disabled: false,
  },
  {
    title: "Customers",
    href: "dashboard/customers",
    isActive: false,
    disabled: true,
  },
  {
    title: "Products",
    href: "dashboard/products",
    isActive: false,
    disabled: true,
  },
  {
    title: "Settings",
    href: "dashboard/settings",
    isActive: false,
    disabled: true,
  },
];
