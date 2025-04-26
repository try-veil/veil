"use client";

import { useEffect, useState } from "react";
import {
  IconChecklist,
  IconLayoutDashboard,
  IconPackages,
  IconPlus,
} from "@tabler/icons-react";
import { AudioWaveform, Command, GalleryVerticalEnd } from "lucide-react";
import { useProject } from "@/context/project-context";
import { useUser } from "@/contexts/UserContext";
import { getAllProjectsByUserId } from "@/app/api/project/route";
import { useAuth } from "@/contexts/AuthContext";

export function useProviderSidebarData() {
  const { selectedProject } = useProject();
  const user = useUser();
  const { accessToken } = useAuth();
  const { projectList, setProjectList } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

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
    console.log("Updated projectList:", projectList);
  }, [accessToken]);

  return {
    user: {
      name: user.user?.name,
      email: user.user?.email,
      avatar: "/avatars/shadcn.jpg",
    },
    projects: projectList.map((project) => ({
      name: project.name,
      id: project.id?.toString() ?? '',
      logo: project.thumbnail ? project.thumbnail : Command,
      updatedAt: project.updatedAt ?? "",
    })),
    navGroups: [
      {
        title: "End points",
        items: [
          {
            title: "Add Endpoint",
            url: `/projects/${selectedProject?.id}/client/add-request`,
            icon: IconPlus,
          },
          ...(selectedProject?.apis?.map((api) => ({
            title: `${api.name}`,
            url: `/projects/${selectedProject?.id}/client/${api.apiId}`,
            icon: IconPackages,
          })) ?? []),
        ],
      },
      {
        title: "General",
        items: [
          {
            title: "Hub Listing",
            url: `/projects/${selectedProject?.id}/hub-listing`,
            icon: IconLayoutDashboard,
          },
          {
            title: "Analytics",
            url: `/projects/${selectedProject?.id}/analytics`,
            icon: IconChecklist,
          },
          {
            title: "Settings",
            url: `/projects/${selectedProject?.id}/settings`,
            icon: IconPackages,
          },
        ],
      },
    ],
  };
}
