"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  given_name?: string;
  preferred_username?: string;
  email?: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    // Fetch token from API to access cookie
    fetch("/api/auth/token")
      .then((res) => res.json())
      .then(
        (data: { access_token?: string; error?: string }) => {
          if (!data.access_token) {
            router.push("/login");
            return;
          }

          fetch(`${process.env.NEXT_PUBLIC_FUSIONAUTH_URL}/oauth2/userinfo`, {
            headers: {
              Authorization: `Bearer ${data.access_token}`,
            },
          })
            .then((res) => {
              if (!res.ok) throw new Error("Failed to fetch user info");
              return res.json();
            })
            .then((userData: User) => setUser(userData))
            .catch(() => {
              setError("Could not load user info");
              router.push("/login");
            });
        }
      )
      .catch(() => router.push("/login"));
  }, [router]);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", textAlign: "center" }}>
      <h1>Welcome, {user.given_name || user.preferred_username}!</h1>
      <p>Email: {user.email}</p>
      <button
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
        }}
        style={{ padding: "10px 20px", cursor: "pointer" }}
      >
        Log Out
      </button>
    </div>
  );
}