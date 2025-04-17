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

export const getProviderSidebarData = (): ProviderSidebarData => {
  const { requests } = useRequests();

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
          ...requests,
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
};
