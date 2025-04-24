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
  IconPlus,
} from "@tabler/icons-react";
import { AudioWaveform, Command, GalleryVerticalEnd } from "lucide-react";
import { useProject } from "@/context/project-context";

export function useProviderSidebarData() {
  const { project } = useProject();
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
        title: "End points",
        items: [
          ...(project?.apis?.map(api => ({
            title: `${api.name}`,
            url: `/projects/${project?.id}/client/${api.apiId}`,
            icon: IconPackages,
          })) ?? []),
          {
            title: "Add End Point",
            url: `/projects/${project?.id}/client/add-request`,
            icon: IconPlus,
          },
        ],
      },
      {
        title: "General",
        items: [
          {
            title: "Hub Listing",
            url: `/projects/${project?.id}/hub-listing`,
            icon: IconLayoutDashboard,
          },
          {
            title: "Analytics",
            url: `/projects/${project?.id}/analytics`,
            icon: IconChecklist,
          },
          {
            title: "Settings",
            url: `/projects/${project?.id}/settings`,
            icon: IconPackages,
          },
        ],
      },
    ],
  };
}
