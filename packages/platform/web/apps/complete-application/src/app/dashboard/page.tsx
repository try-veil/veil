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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log("Fetching user token...");
    fetch("/api/auth/token")
      .then((res) => res.json())
      .then((data: { access_token?: string; error?: string }) => {
        if (!data.access_token) {
          console.error("No access token, redirecting to login");
          router.push("/login");
          return;
        }

        console.log("Fetching user info...");
        fetch(`${process.env.NEXT_PUBLIC_FUSIONAUTH_URL}/oauth2/userinfo`, {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        })
          .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch user info");
            return res.json();
          })
          .then((userData: User) => {
            console.log("User info loaded:", userData);
            setUser(userData);
          })
          .catch((err) => {
            console.error("User info error:", err);
            setError("Could not load user info");
            router.push("/login");
          });
      })
      .catch((err) => {
        console.error("Token fetch error:", err);
        router.push("/login");
      });
  }, [router]);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", textAlign: "center" }}>
      <h1>Welcome, {user.given_name || user.preferred_username}!</h1>
      <p>Email: {user.email}</p>
      <button
        onClick={async () => {
          setIsLoggingOut(true);
          try {
            console.log("Initiating logout...");
            const response = await fetch("/api/auth/logout", { method: "POST" });
            const data = await response.json();
            if (data.success) {
              console.log("Logout successful, redirecting to login");
              router.push("/login");
            } else {
              console.error("Logout failed:", data.error);
              setError("Logout failed, please try again");
            }
          } catch (error) {
            console.error("Logout request error:", error);
            setError("Logout failed, please try again");
          } finally {
            setIsLoggingOut(false);
          }
        }}
        style={{
          padding: "10px 20px",
          cursor: isLoggingOut ? "not-allowed" : "pointer",
          opacity: isLoggingOut ? 0.6 : 1,
        }}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? "Logging out..." : "Log Out"}
      </button>
    </div>
  );
}