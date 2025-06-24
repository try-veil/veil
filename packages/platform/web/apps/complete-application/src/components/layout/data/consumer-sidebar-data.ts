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
} from "@tabler/icons-react";
import { AudioWaveform, Command, GalleryVerticalEnd } from "lucide-react";
import { ConsumerSidebarData } from "../types";
import { useUser } from "@/contexts/UserContext";

export const getConsumerSidebarData = (): ConsumerSidebarData => {
  const user = useUser();
  return {
    user: {
      name: user.user?.name || "",
      email: user.user?.email || "",
      avatar: "/avatars/shadcn.jpg" ,
    },
    navGroups: [
      {
        title: "General",
        items: [
          {
            title: "Playground",
            url: "/consumer/project_jiya/playground",
            icon: IconPackages,
          },
          {
            title: "Analytics",
            url: "/consumer/project_jiya/analytics",
            icon: IconChartBar,
          },
        ],
      },
    ],
  };
};
