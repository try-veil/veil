"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const consumerRoleId = process.env.NEXT_PUBLIC_ROLE_CONSUMER_ID;
  const providerRoleId = process.env.NEXT_PUBLIC_ROLE_PROVIDER_ID;
  const githubIdentityProviderId =
    process.env.NEXT_PUBLIC_GITHUB_IDENTITY_PROVIDER_ID;
  const googleIdentityProviderId =
    process.env.NEXT_PUBLIC_GOOGLE_IDENTITY_PROVIDER_ID;

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    console.log("Signup page - isAuthenticated:", isAuthenticated);
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setError("Please select a role");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("Signup successful, data:", data);
        // Use our auth context to store user data and tokens
        login(data.user, data.accessToken, data.refreshToken);
        console.log("Redirecting to dashboard...");

        // Add a small delay to ensure localStorage is updated
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      } else {
        setError(data.error_description || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    if (!role) {
      setError("Please select a role before continuing with social login");
      return;
    }
    setError("");
    const clientId = process.env.NEXT_PUBLIC_FUSIONAUTH_CLIENT_ID;
    const fusionAuthUrl = process.env.NEXT_PUBLIC_FUSIONAUTH_URL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = encodeURIComponent(`${appUrl}/callback`);
    const state = Math.random().toString(36).substring(2);

    // Store both state and selected role in session storage
    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("selected_role", role);

    // Build authorization URL with explicit offline_access and prompt=consent
    const authUrl =
      `${fusionAuthUrl}/oauth2/authorize?client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent("openid offline_access email profile")}` +
      `&identityProviderId=${provider}` +
      `&prompt=consent` + // Force consent screen to ensure refresh token is issued
      `&state=${state}` +
      `&newRegistration=true`;

    console.log("Redirecting to social signup:", authUrl);
    router.push(authUrl);
  };

  return (
    <>
      <div className="container relative h-screen px-8 flex flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
          <div className="absolute inset-0 bg-zinc-900" />
          <Link href={"/"}>
            <div className="relative z-20 flex w-fit items-center text-lg font-medium">
              <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center mr-2"></div>
              Veil
            </div>
          </Link>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                Publish your existing APIs, manage subscribers, and start
                earning without vendor lock‑in.
              </p>
              <footer className="text-sm">with Veil</footer>
            </blockquote>
          </div>
        </div>
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Create an account
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your details below to create your account
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <Select
                  value={role}
                  onValueChange={(value) => {
                    setRole(value);
                    setError("");
                  }}
                >
                  <SelectTrigger className="w-full px-3 py-2 border rounded-md">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={consumerRoleId || ""}>
                      Consumer
                    </SelectItem>
                    <SelectItem value={providerRoleId || ""}>
                      Provider
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "Signing up..." : "Sign Up"}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Login
              </Link>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    handleSocialLogin(googleIdentityProviderId || "")
                  }
                  className="w-1/2"
                >
                  Google
                </Button>
                <Button
                  onClick={() =>
                    handleSocialLogin(githubIdentityProviderId || "")
                  }
                  className="w-1/2"
                >
                  GitHub
                </Button>
              </div>
            </div>

            <p className="px-8 text-center text-sm text-muted-foreground">
              By clicking continue, you agree to our{" "}
              <Link
                href="/terms"
                className="underline underline-offset-4 hover:text-primary"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy-policy"
                className="underline underline-offset-4 hover:text-primary"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
