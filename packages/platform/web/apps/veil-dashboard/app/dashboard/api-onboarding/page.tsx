"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const apiFormSchema = z.object({
  name: z.string().min(2, {
    message: "API name must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  category: z.string({
    required_error: "Please select a category.",
  }),
  authMethod: z.string({
    required_error: "Please select an authentication method.",
  }),
  baseUrl: z.string().url({
    message: "Please enter a valid URL.",
  }),
  rateLimit: z.coerce.number().min(1, {
    message: "Rate limit must be at least 1.",
  }),
})

export default function ApiOnboardingPage() {
  const form = useForm<z.infer<typeof apiFormSchema>>({
    resolver: zodResolver(apiFormSchema),
    defaultValues: {
      name: "",
      description: "",
      baseUrl: "",
      rateLimit: 1000,
    },
  })

  function onSubmit(values: z.infer<typeof apiFormSchema>) {
    console.log(values)
    // Submit the form
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">API Onboarding</h1>
        <p className="text-muted-foreground">
          Add a new API to the Veil platform. Fill out the details below to get started.
        </p>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Provide basic details about your API.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My Awesome API" {...field} />
                          </FormControl>
                          <FormDescription>This is the name that will be displayed to users.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ai">AI & Machine Learning</SelectItem>
                              <SelectItem value="data">Data & Analytics</SelectItem>
                              <SelectItem value="payment">Payment Processing</SelectItem>
                              <SelectItem value="communication">Communication</SelectItem>
                              <SelectItem value="ecommerce">E-Commerce</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>Select the category that best describes your API.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your API and what it does..."
                            className="min-h-32"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Provide a detailed description of your API's functionality.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="baseUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.example.com" {...field} />
                        </FormControl>
                        <FormDescription>The target URL for your API endpoints.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg border border-dashed p-6 flex-1">
                          <div className="flex flex-col items-center gap-2 text-center">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm font-medium">Upload API Logo</p>
                            <p className="text-xs text-muted-foreground">
                              Drag and drop or click to upload. SVG, PNG or JPG (max. 800x400px)
                            </p>
                            <Input type="file" className="hidden" id="logo-upload" />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById("logo-upload")?.click()}
                            >
                              Select File
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">Save & Continue</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authentication">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Configure how users will authenticate with your API.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormField
                    control={form.control}
                    name="authMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authentication Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an authentication method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="apiKey">API Key</SelectItem>
                            <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                            <SelectItem value="jwt">JWT</SelectItem>
                            <SelectItem value="basic">Basic Auth</SelectItem>
                            <SelectItem value="none">No Authentication</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Choose how users will authenticate with your API.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rateLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate Limit (requests per day)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>Set the maximum number of requests a user can make per day.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit">Save & Continue</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>Define the endpoints for your API.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <FormLabel>Method</FormLabel>
                      <Select defaultValue="get">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="get">GET</SelectItem>
                          <SelectItem value="post">POST</SelectItem>
                          <SelectItem value="put">PUT</SelectItem>
                          <SelectItem value="delete">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <FormLabel>Path</FormLabel>
                      <Input placeholder="/users" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <FormLabel>Description</FormLabel>
                    <Textarea placeholder="Describe what this endpoint does..." />
                  </div>
                  <div className="mt-4">
                    <FormLabel>Parameters</FormLabel>
                    <div className="space-y-2">
                      <div className="grid gap-2 md:grid-cols-4">
                        <Input placeholder="Parameter name" />
                        <Select defaultValue="string">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="object">Object</SelectItem>
                            <SelectItem value="array">Array</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select defaultValue="query">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="query">Query</SelectItem>
                            <SelectItem value="path">Path</SelectItem>
                            <SelectItem value="header">Header</SelectItem>
                            <SelectItem value="body">Body</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select defaultValue="optional">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="required">Required</SelectItem>
                            <SelectItem value="optional">Optional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-2">
                      Add Parameter
                    </Button>
                  </div>
                </div>
                <Button variant="outline">Add Endpoint</Button>
                <div className="flex justify-end">
                  <Button>Save & Continue</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Plans</CardTitle>
              <CardDescription>Define pricing plans for your API.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <FormLabel>Plan Name</FormLabel>
                      <Input placeholder="Basic" />
                    </div>
                    <div>
                      <FormLabel>Price (USD)</FormLabel>
                      <Input type="number" placeholder="0" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <FormLabel>Description</FormLabel>
                    <Textarea placeholder="Describe the features of this plan..." />
                  </div>
                  <div className="mt-4">
                    <FormLabel>Rate Limit (requests per day)</FormLabel>
                    <Input type="number" placeholder="1000" />
                  </div>
                </div>
                <Button variant="outline">Add Pricing Plan</Button>
                <div className="flex justify-end">
                  <Button>Save & Publish API</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

