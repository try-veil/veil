"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");
    const storedState = sessionStorage.getItem("oauth_state");
    const selectedRole = sessionStorage.getItem("selected_role");

    // Log for debugging
    console.log("Callback params:", { code, error, state, storedState, selectedRole });

    // Clear sessionStorage to prevent stale data
    sessionStorage.removeItem("oauth_state");
    sessionStorage.removeItem("selected_role");

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

    // Send callback request
    console.log("Sending callback request:", { code, role: selectedRole });
    fetch("/api/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, role: selectedRole || undefined }),
    })
      .then((res) => res.json())
      .then((data: { success?: boolean; error?: string; error_description?: string }) => {
        if (data.success) {
          console.log("Callback successful, redirecting to dashboard");
          router.push("/");
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
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Processing your login...</h2>
        <p className="text-muted-foreground">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}