"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Sample data
const apis = [
  {
    id: "1",
    name: "User Authentication API",
    description: "Secure user authentication and authorization service with support for OAuth, JWT, and more.",
    category: "Authentication",
    pricing: "From $0.001 per request",
    popularity: "High",
  },
  {
    id: "2",
    name: "Payment Processing API",
    description: "Process payments securely with support for multiple payment providers and currencies.",
    category: "Payments",
    pricing: "From $0.01 per transaction",
    popularity: "High",
  },
  {
    id: "3",
    name: "Data Analytics API",
    description: "Analyze and visualize data with powerful analytics tools and machine learning capabilities.",
    category: "Analytics",
    pricing: "From $5 per month",
    popularity: "Medium",
  },
  {
    id: "4",
    name: "Image Recognition API",
    description: "Identify objects, faces, and text in images with high accuracy using advanced AI models.",
    category: "AI",
    pricing: "From $0.05 per image",
    popularity: "Medium",
  },
  {
    id: "5",
    name: "Email Verification API",
    description: "Verify email addresses for deliverability and reduce bounce rates for your email campaigns.",
    category: "Communication",
    pricing: "From $0.001 per verification",
    popularity: "Low",
  },
  {
    id: "6",
    name: "Geocoding API",
    description: "Convert addresses to geographic coordinates and vice versa with high accuracy.",
    category: "Location",
    pricing: "From $0.0005 per request",
    popularity: "Medium",
  },
]

export default function ApiCatalogPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const filteredApis = apis.filter((api) => {
    const matchesSearch =
      api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      api.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || api.category.toLowerCase() === categoryFilter.toLowerCase()
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">API Catalog</h1>
        <p className="text-muted-foreground">Browse and discover APIs available on the Veil platform.</p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search APIs..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select defaultValue="all" onValueChange={(value) => setCategoryFilter(value)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="authentication">Authentication</SelectItem>
            <SelectItem value="payments">Payments</SelectItem>
            <SelectItem value="analytics">Analytics</SelectItem>
            <SelectItem value="ai">AI</SelectItem>
            <SelectItem value="communication">Communication</SelectItem>
            <SelectItem value="location">Location</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredApis.map((api) => (
          <Card key={api.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{api.name}</CardTitle>
                  <CardDescription className="mt-1">{api.category}</CardDescription>
                </div>
                <Badge variant="outline">{api.popularity} Usage</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">{api.description}</p>
              <p className="mt-4 text-sm font-medium">{api.pricing}</p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/api-catalog/${api.id}`}>View Details</Link>
              </Button>
              <Button>Get API Key</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

