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

export const providerSidebarData: ProviderSidebarData = {
  user: {
    name: "satnaing",
    email: "satnaingdev@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },
  projects: [
    {
      name: "Weather API",
      logo: Command,
      plan: "NEXT.JS + ShadcnUI",
    },
    {
      name: "Typesense API",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Gemini API",
      logo: AudioWaveform,
      plan: "Startup",
    },
  ],
  navGroups: [
    {
      title: "Requests",
      items: [
        {
          title: "Request 1",
          url: "/studio/project_jiya/client/request1",
          icon: IconLayoutDashboard,
        },
        {
          title: "Request 2",
          url: "/studio/project_jiya/client/request2",
          icon: IconChecklist,
        },
        {
          title: "Request 3",
          url: "/studio/project_jiya/client/request3",
          icon: IconPackages,
        },
      ],
    },
    {
      title: "General",
      items: [
        {
          title: "Hub Listing",
          url: "/studio/project_jiya/client/publish/general",
          icon: IconLayoutDashboard,
        },
        {
          title: "Analytics",
          url: "/studio/project_jiya/analytics",
          icon: IconChecklist,
        },
        {
          title: "Settings",
          url: "/studio/project_jiya/settings",
          icon: IconPackages,
        },
      ],
    },
  ],
};
