"use client"
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from '@/contexts/UserContext';

export function DashboardOverview() {
  const { user } = useUser();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user?.name || 'User'}</CardTitle>
          <CardDescription>Dashboard overview</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is your personalized dashboard overview.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Your recent activity</CardDescription>
        </CardHeader>
        <CardContent>
          <p>No recent activities to display.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Your projects overview</CardDescription>
        </CardHeader>
        <CardContent>
          <p>No projects to display.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Export both as default and named to fix import issues
export default DashboardOverview;
