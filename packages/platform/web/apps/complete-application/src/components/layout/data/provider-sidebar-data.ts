import {
  IconBarrierBlock,
  IconBrowserCheck,
  IconBug,
  IconChecklist,
  IconError404,
  IconHelp,
  IconLayoutDashboard,
  IconLock,
  IconLockAccess,
  IconMessages,
  IconNotification,
  IconPackages,
  IconPalette,
  IconServerOff,
  IconSettings,
  IconTool,
  IconUserCog,
  IconUserOff,
  IconUsers,
} from "@tabler/icons-react";
import { AudioWaveform, Command, GalleryVerticalEnd } from "lucide-react";
import { type ProviderSidebarData } from "../types";
import { useRequests } from "@/context/requests-context";
import React from 'react';

// Default data without requests
const defaultSidebarData: ProviderSidebarData = {
  user: {
    name: "satnaing",
    email: "satnaingdev@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },
  projects: [
    {
      name: "Weather API",
      logo: Command,
      plan: "Basic",
    },
    {
      name: "Typesense API",
      logo: GalleryVerticalEnd,
      plan: "Pro",
    },
    {
      name: "Gemini API",
      logo: AudioWaveform,
      plan: "Premium",
    },
  ],
  navGroups: [
    {
      title: "Requests",
      items: [
        {
          title: "Add Request",
          url: "/projects/project_jiya/client/add-request",
          icon: IconPackages,
        },
      ],
    },
    {
      title: "General",
      items: [
        {
          title: "Hub Listing",
          url: "/projects/project_jiya/hub-listing",
          icon: IconLayoutDashboard,
        },
        {
          title: "Analytics",
          url: "/projects/project_jiya/analytics",
          icon: IconChecklist,
        },
        {
          title: "Settings",
          url: "/projects/project_jiya/settings",
          icon: IconPackages,
        },
      ],
    },
  ],
};

// React component that uses the hook
export function ProviderSidebarDataComponent() {
  const { requests, projectId } = useRequests();
  
  // Create a deep copy of the default data
  const sidebarData = {
    user: {
      name: "satnaing",
      email: "satnaingdev@gmail.com",
      avatar: "/avatars/shadcn.jpg",
    },
    projects: [
      {
        name: "Weather API",
        logo: Command,
        plan: "Basic",
      },
      {
        name: "Typesense API",
        logo: GalleryVerticalEnd,
        plan: "Pro",
      },
      {
        name: "Gemini API",
        logo: AudioWaveform,
        plan: "Premium",
      },
    ],
    navGroups: [
      {
        title: "Requests",
        items: [
          ...requests.map(request => ({
            title: request.title,
            url: request.url,
            icon: request.icon,
          })),
          {
            title: "Add Request",
            url: `/projects/${projectId}/client/add-request`,
            icon: IconPackages,
          },
        ],
      },
      {
        title: "General",
        items: [
          {
            title: "Hub Listing",
            url: `/projects/${projectId}/hub-listing`,
            icon: IconLayoutDashboard,
          },
          {
            title: "Analytics",
            url: `/projects/${projectId}/analytics`,
            icon: IconChecklist,
          },
          {
            title: "Settings",
            url: `/projects/${projectId}/settings`,
            icon: IconPackages,
          },
        ],
      },
    ],
  };
  
  return sidebarData;
}

// For backward compatibility - returns data without requests
export const getProviderSidebarData = (): ProviderSidebarData => {
  return defaultSidebarData;
};

export function useProviderSidebarData() {
  const { requests, projectId } = useRequests();
  
  return {
    user: {
      name: "satnaing",
      email: "satnaingdev@gmail.com",
      avatar: "/avatars/shadcn.jpg",
    },
    projects: [
      {
        name: "Weather API",
        logo: Command,
        plan: "Basic",
      },
      {
        name: "Typesense API",
        logo: GalleryVerticalEnd,
        plan: "Pro",
      },
      {
        name: "Gemini API",
        logo: AudioWaveform,
        plan: "Premium",
      },
    ],
    navGroups: [
      {
        title: "Requests",
        items: [
          ...requests.map(request => ({
            title: request.title,
            url: request.url,
            icon: request.icon,
          })),
          {
            title: "Add Request",
            url: `/projects/${projectId}/client/add-request`,
            icon: IconPackages,
          },
        ],
      },
      {
        title: "General",
        items: [
          {
            title: "Hub Listing",
            url: `/projects/${projectId}/hub-listing`,
            icon: IconLayoutDashboard,
          },
          {
            title: "Analytics",
            url: `/projects/${projectId}/analytics`,
            icon: IconChecklist,
          },
          {
            title: "Settings",
            url: `/projects/${projectId}/settings`,
            icon: IconPackages,
          },
        ],
      },
    ],
  };
}
