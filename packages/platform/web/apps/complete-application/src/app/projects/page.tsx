"use client";

import { useEffect, useState } from "react";
import Navbar from "@/features/home/Navbar";
import Apps from "@/features/apps";
import MyProjects from "@/features/myprojects";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MyAnalytics from "@/features/myanalytics";
import { getAllProjectsByUserId } from "@/app/api/project/route";

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

  const fetchProjects = async () => {
    try {
      // For now using a static userId, you might want to get this from your auth context
      const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjFyeWJyOGpUTXNNa0tYbzd1MjJ0Qm5XeVc2dyJ9.eyJhdWQiOiIyMTMwMWZkZC02NWJhLTQ2OWUtOTlmMy0xZjZlY2RlY2IzMjUiLCJleHAiOjE3ODEyMzcxODMsImlhdCI6MTc0NTIzNzE4MywiaXNzIjoidHJ5dmVpbC5mdXNpb25hdXRoLmlvIiwic3ViIjoiM2VjMjQ3MTgtYzAwOC00NDUwLWFjMmQtZjYyMTJhYTg0MDE1IiwianRpIjoiZTkyOWUyODctNjNjZC00YzlhLWI1YzMtMjcyYzZmMmJmNDM5IiwiYXV0aGVudGljYXRpb25UeXBlIjoiUEFTU1dPUkQiLCJhcHBsaWNhdGlvbklkIjoiMjEzMDFmZGQtNjViYS00NjllLTk5ZjMtMWY2ZWNkZWNiMzI1Iiwicm9sZXMiOlsicHJvdmlkZXIiXSwic2lkIjoiYTlhMmM0OWItN2RmOC00NTQyLWIzNzctZDgwNTczMDdhZDNlIiwiYXV0aF90aW1lIjoxNzQ1MjM3MTgzLCJ0aWQiOiJmZWI4MDE5YS01YmE2LTQwYzQtMzBhZC03NGQ3YzQ3OWZiOTAifQ.UjaGt3XuRSG0UlWrfcl4s9eQWanNS3Z0nQbYqA9V1Dxci9do0lkgbiJ2xDOYlTrkUe_O9MRm_2yKgGIGqgNZAyitgAWOwAS-az5okOfna7ATMcedc2JWGg3LSwawr3wLkYzS9nj0aACQRKxv3vzQtlPBeaFgHThwbPWQS30oGmT2tkpkuJsRasQr7PLtgyR9AqtUJR4M4AvhG8vUKUBBp4ekLs3-d9TOdtZnxQt3LLYMr_qIqnBaZBGu7CPXq3F_3tdObyR7mQoTDWARhi1oNw2PBDAXQ46wGEEBEKUaK7N8Uxi90mVLo73l58IKfKHdLrdUw3QolyHHoMFYAixI-A"
      const projectsData = await getAllProjectsByUserId(token);
      setProjects(projectsData);
    } catch (error) {
      console.log('Error fetching projects:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch projects');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

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
