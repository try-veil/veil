"use client";

import { ReactNode } from "react";
import { AuthProvider as CustomAuthProvider } from "@/contexts/AuthContext";

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  return <CustomAuthProvider>{children}</CustomAuthProvider>;
} 