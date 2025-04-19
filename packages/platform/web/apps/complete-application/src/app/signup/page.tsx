"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function SignupPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const consumerRoleId = process.env.NEXT_PUBLIC_ROLE_CONSUMER_ID;
  const providerRoleId = process.env.NEXT_PUBLIC_ROLE_PROVIDER_ID;
  const githubIdentityProviderId = process.env.NEXT_PUBLIC_GITHUB_IDENTITY_PROVIDER_ID;
  const googleIdentityProviderId = process.env.NEXT_PUBLIC_GOOGLE_IDENTITY_PROVIDER_ID;

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
        // Use NextAuth to sign in with the obtained credentials
        const result = await signIn('custom-credentials', {
          redirect: false,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          userData: JSON.stringify(data.user),
        });

        if (result?.error) {
          setError(result.error);
        } else {
          router.push("/");
        }
      } else {
        setError(data.error_description || "Signup failed");
      }
    } catch {
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
    const redirectUri = encodeURIComponent("http://localhost:3000/callback");
    const state = Math.random().toString(36).substring(2);
    
    // Store both state and selected role in session storage
    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("selected_role", role);
    
    // Build authorization URL with explicit offline_access and prompt=consent
    const authUrl = `${fusionAuthUrl}/oauth2/authorize?client_id=${clientId}` + 
                    `&redirect_uri=${redirectUri}` + 
                    `&response_type=code` + 
                    `&scope=${encodeURIComponent('openid offline_access email profile')}` +
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
          <div className="relative z-20 flex items-center text-lg font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            Veil
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Doloremque minima nulla eveniet consequuntur sit impedit amet repellendus, ab officia architecto!
              </p>
              <footer className="text-sm">Lorem, ipsum.</footer>
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
                    <SelectItem value={consumerRoleId || ""}>Consumer</SelectItem>
                    <SelectItem value={providerRoleId || ""}>Provider</SelectItem>
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
                <button
                  onClick={() => handleSocialLogin(googleIdentityProviderId || "")}
                  className="w-full py-2 px-4 bg-[#4285F4] text-white rounded-md hover:bg-[#4285F4]/90"
                >
                  Google
                </button>
                <button
                  onClick={() => handleSocialLogin(githubIdentityProviderId || "")}
                  className="w-full py-2 px-4 bg-[#333] text-white rounded-md hover:bg-[#333]/90"
                >
                  GitHub
                </button>
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
                href="/privacy"
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