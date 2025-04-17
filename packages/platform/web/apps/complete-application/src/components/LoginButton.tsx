"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface User {
  id?: string;
  name?: string;
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
            await signOut({ redirect: true, callbackUrl: "/" });
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