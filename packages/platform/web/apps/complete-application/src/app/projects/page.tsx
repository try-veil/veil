"use client";

import { useEffect, useState } from "react";
import Navbar from "@/features/home/Navbar";
import Apps from "@/features/marketplace";
import MyProjects from "@/features/myprojects";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MyAnalytics from "@/features/myanalytics";
import { getAllProjectsByUserId, Project } from "@/app/api/project/route";
import { useAuth } from "@/contexts/AuthContext";
import { CreateTenantForm } from "@/features/projects/create-tenant-form";
import { useUser } from "@/contexts/UserContext";
import { useProject } from "@/context/project-context";
export default function Projects() {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated, accessToken } = useAuth();
  const { user: userContext, isLoading: isUserLoading } = useUser();
  console.log("userContext", userContext, user);
  const { projectList, setProjectList } = useProject();
  const fetchProjects = async () => {
    try {
      const token = accessToken;
      if (!token) {
        throw new Error("No authentication token found");
      }
      const projectsData = await getAllProjectsByUserId(token);
      setProjectList(projectsData);
      setIsLoading(false);
    } catch (error) {
      console.log("Error fetching projects:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch projects"
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchProjects();
    }
  }, [accessToken]);

  // Show loading state while checking user context
  // if (isUserLoading) {
  //   return (
  //     <main className="flex flex-col">
  //       <Navbar session={isAuthenticated} user={user} />
  //       <div className="flex-1 pt-24 flex items-center justify-center">
  //         <p>Loading...</p>
  //       </div>
  //     </main>
  //   );
  // }

  if (error) return <p style={{ color: "red" }}>{error}</p>;

  // Check if projects array is empty before showing CreateTenantForm
  if (projectList.length === 0 && !isLoading) {
    return (
      <main className="flex flex-col">
        <Navbar session={isAuthenticated} user={user} />
        <div className="flex-1 pt-24">
          <CreateTenantForm />
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col">
      <Navbar session={isAuthenticated} user={user} />
      <div className="flex-1 pt-24">
        <div className="sticky top-16 z-20 bg-background w-full max-w-6xl mx-auto h-[calc(100vh-7rem)] px-2">
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
                <MyProjects
                  projects={projectList}
                  onProjectsChange={fetchProjects}
                  isLoading={isLoading}
                />
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
