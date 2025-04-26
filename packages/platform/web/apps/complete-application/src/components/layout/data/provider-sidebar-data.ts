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
import { useUser } from '@/contexts/UserContext';

export function useProviderSidebarData() {
  const { selectedProject } = useProject();
  const user = useUser();
  return {
    user: {
      name: user.user?.name,
      email: user.user?.email,
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
          ...(selectedProject?.apis?.map(api => ({
            title: `${api.name}`,
            url: `/projects/${selectedProject?.id}/client/${api.apiId}`,
            icon: IconPackages,
          })) ?? []),
          {
            title: "Add End Point",
            url: `/projects/${selectedProject?.id}/client/add-request`,
            icon: IconPlus,
          },
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
