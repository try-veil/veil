"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function DebugPage() {
  const { data: session, status } = useSession();
  const [cookies, setCookies] = useState<string>("");

  useEffect(() => {
    // Display cookies in the client
    setCookies(document.cookie);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Middleware Debug Page</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Session:</strong> {session ? "Available" : "Not available"}</p>
        {session && (
          <div className="mt-2">
            <p><strong>User:</strong> {session.user?.name || session.user?.email || "Unknown"}</p>
            <pre className="bg-gray-200 p-2 mt-2 overflow-auto rounded text-sm">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Cookies</h2>
        <pre className="bg-gray-200 p-2 overflow-auto rounded text-sm">
          {cookies.split(';').map(cookie => cookie.trim()).join('\n')}
        </pre>
      </div>
    </div>
  );
} 