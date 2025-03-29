"use client"
import { BarChart3, Edit, MoreHorizontal, Trash, Users } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Sample data
const apis = [
  {
    id: "1",
    name: "User Authentication API",
    category: "Authentication",
    subscribers: 124,
    calls: "452K",
    status: "active",
    lastUpdated: "2023-10-15",
  },
  {
    id: "2",
    name: "Payment Processing API",
    category: "Payments",
    subscribers: 89,
    calls: "321K",
    status: "active",
    lastUpdated: "2023-11-02",
  },
  {
    id: "3",
    name: "Data Analytics API",
    category: "Analytics",
    subscribers: 32,
    calls: "156K",
    status: "maintenance",
    lastUpdated: "2023-09-28",
  },
  {
    id: "4",
    name: "Image Recognition API",
    category: "AI",
    subscribers: 0,
    calls: "0",
    status: "draft",
    lastUpdated: "2023-12-01",
  },
]

export default function ApiManagementPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">API Management</h1>
          <p className="text-muted-foreground">Manage your APIs and monitor their performance.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/api-onboarding">Add New API</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your APIs</CardTitle>
          <CardDescription>A list of all your APIs on the Veil platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Subscribers</TableHead>
                <TableHead className="text-right">API Calls</TableHead>
                <TableHead className="text-right">Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apis.map((api) => (
                <TableRow key={api.id}>
                  <TableCell className="font-medium">{api.name}</TableCell>
                  <TableCell>{api.category}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        api.status === "active" ? "default" : api.status === "maintenance" ? "outline" : "secondary"
                      }
                    >
                      {api.status === "active" ? "Active" : api.status === "maintenance" ? "Maintenance" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{api.subscribers}</TableCell>
                  <TableCell className="text-right">{api.calls}</TableCell>
                  <TableCell className="text-right">{api.lastUpdated}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Users className="mr-2 h-4 w-4" />
                          View Subscribers
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Analytics
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

