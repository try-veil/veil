"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardOverview } from '@/features/dashboard/components/overview';

export default function DashboardPage() {
  const { isAuthenticated, user: authUser, accessToken } = useAuth();
  const router = useRouter();
  const { user: userContext, isLoading: isUserLoading } = useUser();
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Dashboard page - Auth state:', {
      isAuthenticated,
      hasUser: !!authUser,
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
  }, [isAuthenticated, router, authUser, accessToken]);

  // Set welcome message based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setWelcomeMessage('Good morning');
    else if (hour < 18) setWelcomeMessage('Good afternoon');
    else setWelcomeMessage('Good evening');
  }, []);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-2">{welcomeMessage}, {userContext?.name || authUser?.name || 'User'}</h1>
      <p className="text-muted-foreground mb-8">Welcome to your dashboard</p>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <DashboardOverview />
        </TabsContent>
        
        <TabsContent value="activity">
          <div className="bg-muted/40 rounded-lg border p-8 h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Activity content coming soon</p>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="bg-muted/40 rounded-lg border p-8 h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Analytics content coming soon</p>
          </div>
        </TabsContent>
        
        <TabsContent value="team">
          <div className="bg-muted/40 rounded-lg border p-8 h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Team content coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 