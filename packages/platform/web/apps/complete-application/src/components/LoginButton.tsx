"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";

export default function LoginButton() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const { user } = useUser();

  const handleClick = () => {
    if (isAuthenticated) {
      logout();
      router.push("/");
    } else {
      router.push("/login");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
    >
      {isAuthenticated ? "Logout" : "Login"}
    </Button>
  );
}