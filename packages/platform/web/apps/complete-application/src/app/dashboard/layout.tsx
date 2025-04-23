'use client';

import Navbar from '@/features/home/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Give time for auth context to initialize
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (!isAuthenticated) {
        console.log('Dashboard Layout - Not authenticated, redirecting to login');
        router.push('/login');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar session={isAuthenticated} user={user} />
      <main className="flex-1 p-4 md:p-6 pt-24">
        {children}
      </main>
    </div>
  );
} 