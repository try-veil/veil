"use client"

import { useState } from "react"
import { ArrowLeft, Check, Copy, ExternalLink } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Sample API data
const apiData = {
  id: "1",
  name: "User Authentication API",
  description: "Secure user authentication and authorization service with support for OAuth, JWT, and more.",
  longDescription:
    "Our User Authentication API provides a complete solution for user authentication and authorization. It supports multiple authentication methods including OAuth 2.0, JWT, and API keys. The API is designed to be secure, scalable, and easy to integrate with your existing applications.",
  category: "Authentication",
  pricing: [
    {
      name: "Free",
      price: "$0",
      features: ["1,000 requests/month", "Basic authentication", "Email support"],
      recommended: false,
    },
    {
      name: "Pro",
      price: "$49/month",
      features: ["100,000 requests/month", "All authentication methods", "Priority support", "Custom domains"],
      recommended: true,
    },
    {
      name: "Enterprise",
      price: "Contact us",
      features: ["Unlimited requests", "All Pro features", "Dedicated support", "SLA", "Custom integration"],
      recommended: false,
    },
  ],
  endpoints: [
    {
      method: "POST",
      path: "/auth/register",
      description: "Register a new user",
    },
    {
      method: "POST",
      path: "/auth/login",
      description: "Authenticate a user and get a token",
    },
    {
      method: "GET",
      path: "/auth/user",
      description: "Get the current user's information",
    },
    {
      method: "POST",
      path: "/auth/refresh",
      description: "Refresh an authentication token",
    },
    {
      method: "POST",
      path: "/auth/logout",
      description: "Invalidate an authentication token",
    },
  ],
  documentation: "https://docs.example.com/auth-api",
}

export default function ApiDetailsPage({ params }: { params: { id: string } }) {
  const [copied, setCopied] = useState(false)
  const [apiKey, setApiKey] = useState("")

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateApiKey = () => {
    // In a real app, this would call an API to generate a key
    setApiKey(`veil_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/api-catalog">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{apiData.name}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>{apiData.category}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{apiData.longDescription}</p>
              <div className="mt-6 flex items-center gap-4">
                <Button variant="outline" asChild>
                  <a href={apiData.documentation} target="_blank" rel="noopener noreferrer">
                    Documentation
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Get API Key</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Generate API Key</DialogTitle>
                      <DialogDescription>Generate an API key to access the {apiData.name}.</DialogDescription>
                    </DialogHeader>
                    {apiKey ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="api-key">Your API Key</Label>
                          <div className="flex items-center gap-2">
                            <Input id="api-key" value={apiKey} readOnly className="font-mono" />
                            <Button variant="outline" size="icon" onClick={handleCopy}>
                              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Keep this key secure. You won't be able to see it again.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p>By generating an API key, you agree to the terms of service and pricing for this API.</p>
                        <p className="text-sm text-muted-foreground">
                          You can revoke this key at any time from your API keys page.
                        </p>
                      </div>
                    )}
                    <DialogFooter>
                      {apiKey ? (
                        <Button variant="outline" onClick={() => setApiKey("")}>
                          Close
                        </Button>
                      ) : (
                        <Button onClick={generateApiKey}>Generate Key</Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="endpoints">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
              <TabsTrigger value="examples">Usage Examples</TabsTrigger>
            </TabsList>
            <TabsContent value="endpoints">
              <Card>
                <CardHeader>
                  <CardTitle>API Endpoints</CardTitle>
                  <CardDescription>Available endpoints for the {apiData.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Method</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiData.endpoints.map((endpoint, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge
                              variant={
                                endpoint.method === "GET"
                                  ? "outline"
                                  : endpoint.method === "POST"
                                    ? "default"
                                    : endpoint.method === "PUT"
                                      ? "secondary"
                                      : "destructive"
                              }
                            >
                              {endpoint.method}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{endpoint.path}</TableCell>
                          <TableCell>{endpoint.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="examples">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Examples</CardTitle>
                  <CardDescription>Examples of how to use the {apiData.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Authentication</h3>
                      <pre className="mt-2 rounded-md bg-muted p-4 overflow-x-auto">
                        <code className="text-sm font-mono">
                          {`curl -X POST https://api.veil.dev/auth/login \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{"username": "user@example.com", "password": "password"}'`}
                        </code>
                      </pre>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Get User Info</h3>
                      <pre className="mt-2 rounded-md bg-muted p-4 overflow-x-auto">
                        <code className="text-sm font-mono">
                          {`curl -X GET https://api.veil.dev/auth/user \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "X-API-Key: YOUR_API_KEY"`}
                        </code>
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Choose a plan that fits your needs.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiData.pricing.map((plan, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 ${plan.recommended ? "border-primary bg-primary/5" : ""}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{plan.name}</h3>
                        <p className="text-2xl font-bold">{plan.price}</p>
                      </div>
                      {plan.recommended && <Badge>Recommended</Badge>}
                    </div>
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="mt-4 w-full">Select Plan</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

