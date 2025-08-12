import {
  IconBarrierBlock,
  IconBrowserCheck,
  IconBug,
  IconChartBar,
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
  IconBuildingBank,
} from "@tabler/icons-react";
import { AudioWaveform, Command, GalleryVerticalEnd } from "lucide-react";
import { ConsumerSidebarData } from "../types";
import { useUser } from "@/contexts/UserContext";
import { useProject } from "@/context/project-context";

export const getConsumerSidebarData = (): ConsumerSidebarData => {
  const user = useUser();
  const { selectedProject, isLoading, error } = useProject();
  
  // If no project is selected or still loading, return minimal nav
  if (!selectedProject || isLoading) {
    return {
      user: {
        name: user.user?.name || "",
        email: user.user?.email || "",
        avatar: "/avatars/shadcn.jpg",
      },
      navGroups: [],
    };
  }

  return {
    user: {
      name: user.user?.name || "",
      email: user.user?.email || "",
      avatar: "/avatars/shadcn.jpg",
    },
    navGroups: [
      {
        title: "General",
        items: [
          {
            title: "API Overview",
            url: `/consumer/${selectedProject.id}/overview`,
            icon: IconPackages,
          },
          {
            title: "Playground",
            url: `/consumer/${selectedProject.id}/playground`,
            icon: IconPackages,
          },
          {
            title: "Analytics",
            url: `/consumer/${selectedProject.id}/analytics`,
            icon: IconChartBar,
          },
        ],
      }
    ],
  };
};
