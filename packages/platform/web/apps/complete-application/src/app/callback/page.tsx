"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Processing your login...");
  const { login } = useAuth();

  useEffect(() => {
    if (!searchParams) {
      console.error("Search params not available");
      router.push("/login?error=Missing search parameters");
      return;
    }

    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");
    const storedState = sessionStorage.getItem("oauth_state");
    const selectedRole = sessionStorage.getItem("selected_role");
    const redirectPath = sessionStorage.getItem("auth_redirect") || "/dashboard";

    // Log for debugging
    console.log("Callback params:", { code, error, state, storedState, selectedRole, redirectPath });

    // Clear sessionStorage to prevent stale data
    sessionStorage.removeItem("oauth_state");
    sessionStorage.removeItem("selected_role");
    sessionStorage.removeItem("auth_redirect");

    // Validate state
    if (state !== storedState) {
      console.error("State mismatch:", { state, storedState });
      router.push("/login?error=Invalid state parameter");
      return;
    }

    // Handle OAuth error
    if (error) {
      console.error("OAuth error:", error);
      router.push(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    // Require role only for new registrations
    const isNewRegistration = searchParams.get("newRegistration") === "true";
    if (isNewRegistration && !selectedRole) {
      console.error("Role required for new registration");
      router.push("/signup?error=Role selection is required");
      return;
    }

    if (!code) {
      console.error("No authorization code provided");
      router.push("/login?error=Missing authorization code");
      return;
    }

    // Send callback request to get the tokens
    setStatus("Exchanging authorization code for tokens...");
    console.log("Sending callback request:", { code, role: selectedRole });
    fetch("/api/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, role: selectedRole || undefined }),
    })
      .then((res) => res.json())
      .then(async (data) => {
        if (data.success && data.accessToken) {
          setStatus("Creating session...");
          
          // Prepare user data
          const userData = {
            id: data.userId,
            // Add any other user properties here that you have
          };
          
          // Use our auth context to store user data and tokens
          login(userData, data.accessToken, data.refreshToken || "");
          
          console.log("Login successful, redirecting to:", redirectPath);
          setStatus("Login successful! Redirecting...");
          
          // Allow a small delay to ensure localStorage is updated
          setTimeout(() => {
            router.push(redirectPath);
          }, 500);
        } else {
          console.error("Callback failed:", data);
          router.push(
            `/login?error=${encodeURIComponent(data.error_description || "Authentication failed")}`
          );
        }
      })
      .catch((err) => {
        console.error("Callback request error:", err);
        router.push("/login?error=Server error");
      });
  }, [searchParams, router, login]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">{status}</h2>
        <p className="text-muted-foreground">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}