"use client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavUser } from '@/components/layout/nav-user'
import { TeamSwitcher } from '@/components/layout/team-switcher'
import { useProviderSidebarData } from "./data/provider-sidebar-data";
import { useProject } from '@/context/project-context'
import { NavGroupRequest } from './nav-group-request'

export function ProviderAppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const sidebarData = useProviderSidebarData();
  const {selectedProject} = useProject();
  
  return (
    <Sidebar collapsible='icon' variant='floating' {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.projects} selectedProject={selectedProject} />
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroupRequest key={props.title} {...props}/>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
