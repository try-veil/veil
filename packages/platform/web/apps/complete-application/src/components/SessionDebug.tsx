'use client';

import { useSession } from 'next-auth/react';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from "@/contexts/AuthContext";

export function SessionDebug() {
  const { data: session, status } = useSession();
  const { user, isLoading } = useUser();
  const { isAuthenticated } = useAuth();

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-black/80 text-white rounded-lg max-w-lg overflow-auto text-xs">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-2">
        <p>Session Status: {status}</p>
        <p>User Context Loading: {String(isLoading)}</p>
        <p>Is Authenticated: {String(isAuthenticated)}</p>
        <div>
          <p className="font-bold">Session Data:</p>
          <pre>{JSON.stringify(session, null, 2)}</pre>
        </div>
        <div>
          <p className="font-bold">User Context Data:</p>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
} 