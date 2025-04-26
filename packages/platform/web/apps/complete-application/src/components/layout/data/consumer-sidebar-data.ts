
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
  
  export const getConsumerSidebarData = (): ConsumerSidebarData => {

    return {
      user: {
        name: "satnaing",
        email: "satnaingdev@gmail.com",
        avatar: "/avatars/shadcn.jpg",
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
  