"use client"
import { AlertCircle, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Sample usage data
const usageData = [
  { date: "2023-11-01", calls: 1240 },
  { date: "2023-11-02", calls: 1580 },
  { date: "2023-11-03", calls: 1890 },
  { date: "2023-11-04", calls: 2390 },
  { date: "2023-11-05", calls: 3490 },
  { date: "2023-11-06", calls: 2390 },
  { date: "2023-11-07", calls: 3490 },
  { date: "2023-11-08", calls: 4000 },
  { date: "2023-11-09", calls: 3000 },
  { date: "2023-11-10", calls: 2000 },
  { date: "2023-11-11", calls: 2780 },
  { date: "2023-11-12", calls: 1890 },
  { date: "2023-11-13", calls: 2390 },
  { date: "2023-11-14", calls: 3490 },
]

// Sample usage history
const usageHistory = [
  {
    id: "1",
    date: "2023-12-01",
    api: "User Authentication API",
    calls: 1240,
    cost: "$1.24",
  },
  {
    id: "2",
    date: "2023-11-30",
    api: "User Authentication API",
    calls: 980,
    cost: "$0.98",
  },
  {
    id: "3",
    date: "2023-11-29",
    api: "Payment Processing API",
    calls: 45,
    cost: "$0.45",
  },
  {
    id: "4",
    date: "2023-11-28",
    api: "Data Analytics API",
    calls: 320,
    cost: "$1.60",
  },
  {
    id: "5",
    date: "2023-11-27",
    api: "User Authentication API",
    calls: 760,
    cost: "$0.76",
  },
]

export default function UsagePage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Usage & Balance</h1>
        <p className="text-muted-foreground">Monitor your API usage and manage your balance.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$345.00</div>
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Low Balance</AlertTitle>
              <AlertDescription>Your balance is below $500. Consider adding funds.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45,200 calls</div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">45,200 / 100,000</div>
                <div className="font-medium">45%</div>
              </div>
              <Progress value={45} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45.20</div>
            <p className="text-xs text-muted-foreground mt-1">Based on current usage</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <Button variant="link" className="px-0 mt-1">
              View details
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Usage</CardTitle>
              <CardDescription>Your API usage over the last 14 days.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ChartContainer
                config={{
                  calls: {
                    label: "API Calls",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return `${date.getMonth() + 1}/${date.getDate()}`
                      }}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="calls" fill="var(--color-calls)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Usage History</CardTitle>
                <CardDescription>A record of your API usage and associated costs.</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>API</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.api}</TableCell>
                      <TableCell className="text-right">{item.calls}</TableCell>
                      <TableCell className="text-right">{item.cost}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>Manage your payment methods and billing details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">Credit Card</h3>
                      <p className="text-sm text-muted-foreground">**** **** **** 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/25</p>
                    </div>
                    <Badge>Default</Badge>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      Remove
                    </Button>
                  </div>
                </div>
                <Button variant="outline">Add Payment Method</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

