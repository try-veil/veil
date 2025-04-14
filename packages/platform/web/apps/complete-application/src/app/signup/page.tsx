"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<string>("0bced966-1cd5-44ad-8c0a-d8f902b870d7"); // Default to consumer
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data: { success?: boolean; error?: string; error_description?: string } =
        await response.json();

      if (response.ok && data.success) {
        router.push("/dashboard");
      } else {
        setError(data.error_description || "Signup failed");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: "82339786-3dff-42a6-aac6-1f1ceecb6c46" | "fed4d07b-db11-455a-b4f5-a1e7c9a3ee6d") => {
    const clientId = process.env.NEXT_PUBLIC_FUSIONAUTH_CLIENT_ID;
    const fusionAuthUrl = process.env.NEXT_PUBLIC_FUSIONAUTH_URL;
    const redirectUri = encodeURIComponent("http://localhost:3000/callback");
    const state = Math.random().toString(36).substring(2);
    sessionStorage.setItem("oauth_state", state);
    const authUrl = `${fusionAuthUrl}/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&identityProviderId=${provider}&state=${state}&prompt=select_account`;
    router.push(authUrl);
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", textAlign: "center" }}>
      <h1>Sign Up</h1>
      <form onSubmit={handleSignup}>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
          >
            <option value="0bced966-1cd5-44ad-8c0a-d8f902b870d7">Consumer</option>
            <option value="03326aa0-232c-4881-8e8a-bcfe68dec391">Provider</option>
          </select>
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "10px 20px", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>
      <div style={{ marginTop: "20px" }}>
        <p>Or sign up with:</p>
        <button
          onClick={() => handleSocialLogin("82339786-3dff-42a6-aac6-1f1ceecb6c46")}
          style={{ padding: "10px 20px", margin: "5px", backgroundColor: "#4285F4", color: "white" }}
        >
          Sign up with Google
        </button>
        <button
          onClick={() => handleSocialLogin("fed4d07b-db11-455a-b4f5-a1e7c9a3ee6d")}
          style={{ padding: "10px 20px", margin: "5px", backgroundColor: "#333", color: "white" }}
        >
          Sign up with GitHub
        </button>
      </div>
      <p style={{ marginTop: "20px" }}>
        Already have an account? <a href="/login" style={{ color: "#0070f3" }}>Log in</a>
      </p>
    </div>
  );
}