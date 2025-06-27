"use client";
import {useState, useEffect } from "react";
import { ChevronsUpDown, CommandIcon, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";

export function TeamSwitcher({
  teams,
  selectedProject,
}: {
  teams: {
    name: string;
    id: string;
    logo: string | React.ElementType;
    updatedAt: string;
  }[];
  selectedProject: {
    name: string;
    id: string;
    logo: string | React.ElementType;
    updatedAt: string;
  } | null;
}) {
  const { isMobile } = useSidebar();
  
  const [activeTeam, setActiveTeam] = useState(
    selectedProject || (teams.length > 0 ? teams[0] : null)
  );
  
  useEffect(() => {
    if (selectedProject) {
      setActiveTeam(selectedProject);
    } else if (teams.length > 0 && !activeTeam) {
      setActiveTeam(teams[0]);
    }
  }, [selectedProject, teams]);
  


  if (!teams.length) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {activeTeam && (
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    {typeof activeTeam?.logo === "string" ? (
  <img
    src={activeTeam.logo}
    alt={activeTeam.name}
    className="size-4 object-contain"
  />
) : activeTeam?.logo ? (
  <activeTeam.logo className="size-4" />
) : (
  // Fallback when logo is undefined
  // <div className="size-4 bg-gray-200 rounded-full"></div>
  <CommandIcon className="size-4" />
)}
                  </div>
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                {activeTeam?.name || "Select a project"}
                </span>
                <span className="truncate text-xs">
                  Updated: {activeTeam?.updatedAt?.split('T')[0]}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Projects
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <Link href={`/projects/${team.id}/hub-listing`}>
              <DropdownMenuItem
                key={team.id}
                onClick={() => setActiveTeam(team)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                {typeof team.logo === "string" ? (
  <img src={team.logo} alt={team.name} className="size-4" />
) : team.logo ? (
  <team.logo className="size-4" />
) : (
  <div className="size-4 bg-gray-200 rounded-full"></div>
)}
                </div>
                
                  {team.name}
                
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
              </Link>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                <Link href="/projects">Add project</Link>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
