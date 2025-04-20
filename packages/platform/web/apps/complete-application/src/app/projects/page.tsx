"use client";

import { useEffect, useState } from "react";
import Navbar from "@/features/home/Navbar";
import Apps from "@/features/apps";
import MyProjects from "@/features/myprojects";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MyAnalytics from "@/features/myanalytics";

interface User {
  given_name?: string;
  preferred_username?: string;
  email?: string;
}

export default function Projects() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // useEffect(() => {
  //   console.log("Fetching user token...");
  //   fetch("/api/auth/token")
  //     .then((res) => res.json())
  //     .then((data: { access_token?: string; error?: string }) => {
  //       if (!data.access_token) {
  //         console.log("No access token, user not logged in");
  //         setIsLoading(false);
  //         return;
  //       }

  //       console.log("Fetching user info...");
  //       fetch(`${process.env.NEXT_PUBLIC_FUSIONAUTH_URL}/oauth2/userinfo`, {
  //         headers: {
  //           Authorization: `Bearer ${data.access_token}`,
  //         },
  //       })
  //         .then((res) => {
  //           if (!res.ok) throw new Error("Failed to fetch user info");
  //           return res.json();
  //         })
  //         .then((userData: User) => {
  //           console.log("User info loaded:", userData);
  //           setUser(userData);
  //           setIsLoading(false);
  //         })
  //         .catch((err) => {
  //           console.error("User info error:", err);
  //           setError("Could not load user info");
  //           setIsLoading(false);
  //         });
  //     })
  //     .catch((err) => {
  //       console.error("Token fetch error:", err);
  //       setIsLoading(false);
  //     });
  // }, []);

  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <main className=" flex flex-col">
      <Navbar session={!isLoading && user !== null} user={user} />
      <div className="flex-1 pt-24">
        <div className="sticky top-16 z-20 bg-background w-full max-w-7xl mx-auto px-6 h-[calc(100vh-7rem)]">
          <Tabs
            orientation="vertical"
            defaultValue="projects"
            className="w-full"
          >
            <TabsList className="justify-start border-b-0 py-4">
              <TabsTrigger value="projects">My Projects</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            <div className="flex-grow">
              <TabsContent value="projects" className="m-0">
                <MyProjects/>
              </TabsContent>
              <TabsContent value="analytics" className="m-0">
                <MyAnalytics/>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
