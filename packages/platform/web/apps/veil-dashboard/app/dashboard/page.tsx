"use client"

import { useState } from "react"
import { BarChart3, Code, Key, Package, Users } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const apiUsageData = [
  { name: "Jan", calls: 4000 },
  { name: "Feb", calls: 3000 },
  { name: "Mar", calls: 2000 },
  { name: "Apr", calls: 2780 },
  { name: "May", calls: 1890 },
  { name: "Jun", calls: 2390 },
  { name: "Jul", calls: 3490 },
]

const revenueData = [
  { name: "Jan", revenue: 400 },
  { name: "Feb", revenue: 300 },
  { name: "Mar", revenue: 200 },
  { name: "Apr", revenue: 278 },
  { name: "May", revenue: 189 },
  { name: "Jun", revenue: 239 },
  { name: "Jul", revenue: 349 },
]

export default function DashboardPage() {
  const [userType, setUserType] = useState<"provider" | "user">("provider")

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your Veil dashboard. Here's an overview of your {userType === "provider" ? "APIs" : "API usage"}.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {userType === "provider" ? "Total APIs" : "Active Subscriptions"}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userType === "provider" ? "12" : "5"}</div>
            <p className="text-xs text-muted-foreground">{userType === "provider" ? "+2 from last month" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {userType === "provider" ? "Total Subscribers" : "API Keys"}
            </CardTitle>
            <Users className={`h-4 w-4 text-muted-foreground ${userType === "user" ? "hidden" : ""}`} />
            <Key className={`h-4 w-4 text-muted-foreground ${userType === "provider" ? "hidden" : ""}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userType === "provider" ? "245" : "8"}</div>
            <p className="text-xs text-muted-foreground">{userType === "provider" ? "+18% from last month" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{userType === "provider" ? "API Calls" : "API Calls"}</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userType === "provider" ? "1.2M" : "45.2K"}</div>
            <p className="text-xs text-muted-foreground">
              {userType === "provider" ? "+12% from last month" : "+5% from last month"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{userType === "provider" ? "Revenue" : "Balance"}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userType === "provider" ? "$12,234" : "$345"}</div>
            <p className="text-xs text-muted-foreground">{userType === "provider" ? "+8% from last month" : ""}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          {userType === "provider" && <TabsTrigger value="subscribers">Subscribers</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>API Usage</CardTitle>
                <CardDescription>
                  {userType === "provider" ? "Total API calls across all your APIs" : "Your API consumption over time"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer
                  config={{
                    calls: {
                      label: "API Calls",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="max-h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={apiUsageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="calls" fill="var(--color-calls)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>{userType === "provider" ? "Revenue" : "Spending"}</CardTitle>
                <CardDescription>
                  {userType === "provider" ? "Your earnings from API subscriptions" : "Your spending on API usage"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer
                  config={{
                    revenue: {
                      label: userType === "provider" ? "Revenue" : "Spending",
                      color: "#4DB9E8",
                    },
                  }}
                  className="max-h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Analytics</CardTitle>
              <CardDescription>
                {userType === "provider"
                  ? "Comprehensive analytics for all your APIs"
                  : "Detailed breakdown of your API usage"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Detailed analytics content will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        {userType === "provider" && (
          <TabsContent value="subscribers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subscriber Management</CardTitle>
                <CardDescription>View and manage your API subscribers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Subscriber management content will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

