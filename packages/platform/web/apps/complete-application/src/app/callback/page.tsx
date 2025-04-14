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

    if (state !== storedState) {
      router.push("/login?error=Invalid state parameter");
      return;
    }
    sessionStorage.removeItem("oauth_state");

    if (error) {
      router.push(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (code) {
      fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data: { success?: boolean; error?: string; error_description?: string }) => {
          if (data.success) {
            router.push("/dashboard");
          } else {
            router.push(
              `/login?error=${encodeURIComponent(data.error_description || "Authentication failed")}`
            );
          }
        })
        .catch(() => {
          router.push("/login?error=Server error");
        });
    }
  }, [searchParams, router]);

  return <div>Loading...</div>;
}