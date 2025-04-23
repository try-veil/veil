"use client";

import { useEffect, useState } from "react";
import Navbar from "@/features/home/Navbar";
import Apps from "@/features/marketplace";
import MyProjects from "@/features/myprojects";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MyAnalytics from "@/features/myanalytics";
import { getAllProjectsByUserId } from "@/app/api/project/route";
import { useSession } from "next-auth/react";

interface User {
  given_name?: string;
  preferred_username?: string;
  email?: string;
}

export default function Projects() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const { data: session } = useSession();

  const fetchProjects = async () => {
    try {
      const token = session?.user?.accessToken;
      if (!token) {
        throw new Error('No authentication token found');
      }
      const projectsData = await getAllProjectsByUserId(token);
      setProjects(projectsData);
    } catch (error) {
      console.log('Error fetching projects:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch projects');
    }
  };

  useEffect(() => {
    if (session?.user?.accessToken) {
      fetchProjects();
    }
  }, [session]);

  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <main className="flex flex-col">
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
                <MyProjects projects={projects} onProjectsChange={fetchProjects} />
              </TabsContent>
              <TabsContent value="analytics" className="m-0">
                <MyAnalytics />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
