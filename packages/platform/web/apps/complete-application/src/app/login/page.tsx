"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams?.get("redirect") || "/projects";
  const { login, isAuthenticated } = useAuth();
  const { user, setUser } = useUser();

  // If already authenticated, redirect to projects page
  useEffect(() => {
    console.log("Login page - isAuthenticated:", isAuthenticated);
    if (isAuthenticated && user) {
      // console.log("Already authenticated, redirecting to:", redirectPath);
      router.push("/projects");
    }
  }, [isAuthenticated, user, router]);

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Get tokens from your auth API
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Login successful, data:", data);
        // Use our custom auth context instead of NextAuth
        login(data?.accessToken, data?.refreshToken);
        setUser(data?.user);
        // console.log("Redirecting to:", redirectPath);

        // Allow a small delay to ensure localStorage and cookies are set
        setTimeout(() => {
          router.push("/projects");
        }, 300);
      } else {
        setError(data.error_description || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    const clientId = process.env.NEXT_PUBLIC_FUSIONAUTH_CLIENT_ID;
    const fusionAuthUrl = process.env.NEXT_PUBLIC_FUSIONAUTH_URL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = encodeURIComponent(`${appUrl}/callback`);

    // Generate and store a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem("oauth_state", state);
    // Store the redirect path for after login
    sessionStorage.setItem("auth_redirect", redirectPath);

    // Build authorization URL with explicit offline_access and prompt=consent
    const authUrl =
      `${fusionAuthUrl}/oauth2/authorize?client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent("openid offline_access email profile")}` +
      `&identityProviderId=${provider}` +
      `&prompt=consent` + // Force consent screen to ensure refresh token is issued
      `&state=${state}`;

    console.log("Redirecting to:", authUrl);
    router.push(authUrl);
  };

  // Show login form if not authenticated
  return (
    <>
      <div className="container relative h-screen px-8 flex flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
          <div className="absolute inset-0 bg-zinc-900" />
          <Link href={"/"}>
            <div className="relative w-fit z-20 flex items-center text-lg font-medium">
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
                Login to your account
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your details below to login
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Username or Email"
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
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-primary underline-offset-4 hover:underline"
              >
                Sign Up
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
                    handleSocialLogin("82339786-3dff-42a6-aac6-1f1ceecb6c46")
                  }
                  className="w-1/2"
                >
                  Google
                </Button>

                <Button
                  onClick={() =>
                    handleSocialLogin(
                      process.env.NEXT_PUBLIC_GITHUB_IDENTITY_PROVIDER_ID || ""
                    )
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
