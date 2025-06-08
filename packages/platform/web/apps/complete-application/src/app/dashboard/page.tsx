"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardOverview } from '@/features/dashboard/components/overview';

export default function DashboardPage() {
  const { isAuthenticated, accessToken } = useAuth();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Dashboard page - Auth state:', {
      isAuthenticated,
      hasUser: !!user,
      hasAccessToken: !!accessToken,
    });
    
    // Give time for auth context to initialize
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (!isAuthenticated) {
        console.log('Dashboard - Not authenticated, redirecting to login');
        router.push('/login');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, router, user, accessToken]);

  // Set welcome message based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setWelcomeMessage('Good morning');
    else if (hour < 18) setWelcomeMessage('Good afternoon');
    else setWelcomeMessage('Good evening');
  }, []);

  if (isLoading || !isAuthenticated || isUserLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {welcomeMessage}, {user?.name || 'User'}!
      </h1>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <DashboardOverview />
        </TabsContent>
        <TabsContent value="projects">
          <div>Projects content</div>
        </TabsContent>
        <TabsContent value="settings">
          <div>Settings content</div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 