"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface User {
  given_name?: string;
  preferred_username?: string;
  email?: string;
}

interface LoginButtonProps {
  session: boolean;
  user: User | null;
}

export default function LoginButton({ session, user }: LoginButtonProps) {
  const router = useRouter();

  if (session && user) {
    return (
      <Button
        onClick={async () => {
          try {
            console.log("Initiating logout...");
            const response = await fetch("/api/auth/logout", { method: "POST" });
            const data = await response.json();
            if (data.success) {
              console.log("Logout successful");
              // Force a hard refresh of the page to clear all states
              window.location.href = "/";
            } else {
              console.error("Logout failed:", data.error);
            }
          } catch (error) {
            console.error("Logout request error:", error);
          }
        }}
        variant="primary-scale"
      >
        Sign out
      </Button>
    );
  }

  return (
    <Button
      variant="primary-scale"
      onClick={() => {
        console.log("Initiating login...");
        router.push("/login");
      }}
    >
      Sign in
    </Button>
  );
}