"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
    // <Button
    //   // variant="ghost"
    //   // size="sm"
    //   onClick={handleClick}
    //   className="text-gray-700 dark:text-white hover:text-black transition-colors duration-200"

    // >
    //   {isAuthenticated ? "Logout" : "Login"}
    // </Button>
     <div
     onClick={handleClick}
     className=" bg-black py-1 px-3 rounded-md  text-white  dark:text-white hover:text-gray-300 transition-colors duration-200 hover:cursor-pointer"
   >
     {isAuthenticated ? "Logout" : "Login"}
   </div>
  );
}