"use client"
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PasswordInput } from "@/components/password-input";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusIcon } from "lucide-react";
import { ImageIcon } from "lucide-react";

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => {
    // Override the default styles with our custom classes
    const Editor = (props: any) => (
      <mod.default
        {...props}
        className={cn(
          "w-full rounded-md border bg-white text-foreground",
          "data-[mode=preview]:prose data-[mode=preview]:max-w-none data-[mode=preview]:dark:prose-invert",
          "[&_.w-md-editor-toolbar]:bg-background [&_.w-md-editor-toolbar]:border-b [&_.w-md-editor-toolbar]:border-border",
          "[&_.w-md-editor-content]:bg-background",
          "[&_.w-md-editor-toolbar_button]:text-muted-foreground [&_.w-md-editor-toolbar_button:hover]:bg-accent [&_.w-md-editor-toolbar_button:hover]:text-accent-foreground",
          "[&_.w-md-editor-text]:bg-background [&_.w-md-editor-text]:text-foreground",
          "[&_.w-md-editor-preview]:bg-background [&_.w-md-editor-preview]:text-foreground",
          "[&_.w-md-editor-preview]:border-l [&_.w-md-editor-preview]:border-border",
          "[&_pre]:bg-secondary [&_pre]:text-secondary-foreground [&_pre]:border [&_pre]:border-border",
          "[&_.wmde-markdown]:bg-background",
          "[&_code]:bg-secondary [&_code]:text-secondary-foreground [&_code]:px-1 [&_code]:py-0.5",
          props.className
        )}
      />
    );
    return Editor;
  }),
  { ssr: false }
);

export default function page() {
  const [markdownContent, setMarkdownContent] = useState("# API Documentation\n\nWrite your API documentation here...");
  const [initialContent] = useState(markdownContent);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);

  // Add state for pricing tiers
  const [basicEnabled, setBasicEnabled] = useState(true);
  const [proEnabled, setProEnabled] = useState(true);
  const [ultraEnabled, setUltraEnabled] = useState(true);

  const handleDiscard = () => {
    setMarkdownContent(initialContent);
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving markdown content:', markdownContent);
  };

  return (
    <div>
      <Tabs orientation="vertical" defaultValue="general" className="space-y-4">
        {/* <div className='w-full overflow-x-auto pb-2'> */}
        <TabsList className="mx-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
          <TabsTrigger value="gateway">Gateway</TabsTrigger>
          <TabsTrigger value="monetize">Monetize</TabsTrigger>
        </TabsList>
        {/* </div> */}
        <div className="flex-grow overflow-y-auto overflow-x-auto p-4">
          <TabsContent value="general" className="space-y-4">
            <form className="space-y-6">
              <div className="space-y-2">
                <Label>Upload Logo</Label>
                <div className="flex items-start gap-4">
                  <div className="">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="h-9 w-full max-w-2xl"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setSelectedLogo(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Maximum Size: 500 x 500px, JPEG / PNG
                    </p>
                  </div>
                  <div className="w-24 h-24 border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                    {selectedLogo ? (
                      <img
                        src={selectedLogo}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-8 h-8 mb-1" />
                        <span className="text-xs">No logo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Short Description</Label>
                <Input
                  placeholder="Enter a short description"
                  className="h-9 w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Long Description</Label>
                <textarea
                  placeholder="Enter a detailed description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  className="h-9 w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Terms of Use</Label>
                <textarea
                  placeholder="Enter terms of use"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex items-center space-x-2">
                  <Switch id="visibility" />
                  <Label htmlFor="visibility">Visible to Public</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  type="url"
                  placeholder="https://api.example.com"
                  className="h-9 w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Load Balancer</Label>
                <RadioGroup defaultValue="round-robin">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="round-robin" id="round-robin" />
                    <Label htmlFor="round-robin">Round Robin</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="geolocation" id="geolocation" />
                    <Label htmlFor="geolocation">Geolocation</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Health Check URL</Label>
                <Input
                  type="url"
                  placeholder="https://api.example.com/health"
                  className="h-9 w-full"
                />
              </div>

              <div className="flex space-x-4">
                <Button variant="outline" type="button">
                  Discard Changes
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="docs" className="h-[calc(100vh-24rem)]">
            <div className="w-full h-full flex flex-col space-y-4">
              <div className="flex-1">
                <MDEditor
                  value={markdownContent}
                  onChange={(val: string) => setMarkdownContent(val || '')}
                  preview="live"
                  height="100%"
                  visibleDragbar={false}
                  hideToolbar={false}
                />
              </div>
              <div className="flex space-x-4">
                <Button variant="outline" type="button" onClick={handleDiscard}>
                  Discard Changes
                </Button>
                <Button type="button" onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="gateway" className="space-y-8">
            <form className="space-y-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Firewall Settings</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Protect your API by blocking requests that are not from the
                    RapidAPI infrastructure. RapidAPI adds the
                    "X-RapidAPI-Proxy-Secret" header on every request. This header
                    has a unique value for each API.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Proxy Secret</Label>
                  <PasswordInput
                    placeholder="Enter your proxy secret"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    Request Configurations
                  </h3>
                </div>

                <div className="space-y-4 rounded-lg border p-4 w-fit">
                  <div className="space-y-2 flex flex-row gap-8">
                    <div className="space-y-2">
                      <Label>Request Size Limit</Label>
                      <p className="text-sm text-muted-foreground">
                        Configure the request message size
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="0"
                          className="w-[120px]"
                          min="0"
                          max="50"
                        />
                        <Select defaultValue="MB">
                          <SelectTrigger className="w-[80px]">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MB">MB</SelectItem>
                            <SelectItem value="KB">KB</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Max value is 50 MB
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 rounded-lg border p-4 w-fit">
                  <div className="space-y-2 flex flex-row gap-8">
                    <div className="space-y-2">
                      <Label>Proxy Timeout Setting</Label>
                      <p className="text-sm text-muted-foreground">
                        Configure the timeout between the proxy and the target endpoints
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="0"
                          className="w-[120px]"
                          min="0"
                          max="50"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Max value is 180 Sec
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button variant="outline" type="button">
                  Discard Changes
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="monetize" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Monetization</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Basic Plan */}
                <Card>
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <CardTitle>BASIC</CardTitle>
                      <Switch
                        checked={basicEnabled}
                        onCheckedChange={setBasicEnabled}
                      />
                    </div>
                    <CardDescription>
                      ${basicEnabled ? "0.00" : "0"}/month
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Requests</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">500,000 / month</div>
                        <Badge variant="secondary">Quota</Badge>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-2">Rapid-free-plans-hard-limit</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">500,000 / month</div>
                        <Badge variant="secondary">Quota</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pro Plan */}
                <Card>
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <CardTitle>PRO</CardTitle>
                      <Switch
                        checked={proEnabled}
                        onCheckedChange={setProEnabled}
                      />
                    </div>
                    <CardDescription>
                      ${proEnabled ? "0.00" : "0"}/month
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Requests</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">500,000 / month</div>
                        <Badge variant="secondary">Quota</Badge>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-2">Rapid-free-plans-hard-limit</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">500,000 / month</div>
                        <Badge variant="secondary">Quota</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ultra Plan */}
                <Card>
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <CardTitle>ULTRA</CardTitle>
                      <Switch
                        checked={ultraEnabled}
                        onCheckedChange={setUltraEnabled}
                      />
                    </div>
                    <CardDescription>
                      ${ultraEnabled ? "0.00" : "0"}/month
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Requests</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">500,000 / month</div>
                        <Badge variant="secondary">Quota</Badge>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-2">Rapid-free-plans-hard-limit</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">500,000 / month</div>
                        <Badge variant="secondary">Quota</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
