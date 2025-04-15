"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LoginButton({ session }: { session: any }) {
  const router = useRouter();

  if (session) {
    return (
      <>
        <Button
          onClick={async () => {
            try {
              console.log("Initiating logout...");
              const response = await fetch("/api/auth/logout", { method: "POST" });
              const data = await response.json();
              if (data.success) {
                console.log("Logout successful, redirecting to login");
                router.push("/login");
              } else {
                console.error("Logout failed:", data.error);
                // Optionally show an error message
              }
            } catch (error) {
              console.error("Logout request error:", error);
              // Optionally show an error message
            }
          }}
          variant="primary-scale"
        >
          Sign out
        </Button>
        <Button onClick={() => router.push("/provider/dashboard")} variant="primary-scale">
          Dashboard
        </Button>
      </>
    );
  }

  return (
    <>
      <Button
        variant="primary-scale"
        onClick={() => {
          console.log("Initiating login...");
          router.push("/login"); // Or "/signup" if that's your entry point
        }}
      >
        Sign in
      </Button>
    </>
  );
}