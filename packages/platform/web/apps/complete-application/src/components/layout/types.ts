interface User {
  name: string
  email: string
  avatar: string
}

interface Team {
  name: string
  logo: React.ElementType
  plan: string
}

interface Project {
  name: string
  id: string;
  logo: React.ElementType | string
  updatedAt: string;
}

interface BaseNavItem {
  title: string
  badge?: string
  icon?: React.ElementType | string
  isRequest?: true
}

type NavLink = BaseNavItem & {
  url: string
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: string })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

interface NavGroup {
  title: string
  items: NavItem[]
}

interface SidebarData {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
}

interface ProviderSidebarData {
  user: User
  projects: Project[]
  navGroups: NavGroup[]
}

interface ConsumerSidebarData {
  user: User
  navGroups: NavGroup[]
}

export type { SidebarData, NavGroup, NavItem, NavCollapsible, NavLink, ProviderSidebarData, ConsumerSidebarData }
