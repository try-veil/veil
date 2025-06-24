"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";

export default function DebugPage() {
  const { accessToken, refreshToken } = useAuth();
  const { user } = useUser();

  if (!user) {
    return <p>Not authenticated</p>;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Debug Session</h1>
      
      <div className="bg-muted rounded-lg p-4">
        <h2 className="text-lg font-medium mb-4">User Info</h2>
        <p><strong>User:</strong> {user?.name || user?.email || "Unknown"}</p>
        <p><strong>ID:</strong> {user?.id}</p>
      </div>
      
      <div className="bg-muted rounded-lg p-4">
        <h2 className="text-lg font-medium mb-4">Auth Tokens</h2>
        <p><strong>Access Token:</strong> {accessToken ? `${accessToken.substring(0, 20)}...` : "None"}</p>
        <p><strong>Refresh Token:</strong> {refreshToken ? `${refreshToken.substring(0, 20)}...` : "None"}</p>
      </div>
    </div>
  );
} 