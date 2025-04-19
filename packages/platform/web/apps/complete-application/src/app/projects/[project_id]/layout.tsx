import Cookies from "js-cookie";
import { cn } from "@/lib/utils";
import { SearchProvider } from "@/context/search-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { RequestsProvider } from "@/context/requests-context";
import SkipToMain from "@/components/skip-to-main";
import { ProviderAppSidebar } from "@/components/layout/provider-app-sidebar";
import { Main } from "@/components/layout/main";
import { Header } from "@/components/layout/header";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { TopNav } from "@/components/layout/top-nav";

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { project_id: string };
}) {
  const defaultOpen = Cookies.get("sidebar:state") !== "false";
  return (
    <SearchProvider>
      <RequestsProvider projectId={params.project_id}>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SkipToMain />
          <ProviderAppSidebar />
          <div
            id="content"
            className={cn(
              "ml-auto w-full max-w-full",
              "peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)]",
              "peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]",
              "transition-[width] duration-200 ease-linear",
              "flex h-svh flex-col",
              "group-data-[scroll-locked=1]/body:h-full",
              "group-data-[scroll-locked=1]/body:has-[main.fixed-main]:h-svh"
            )}
          >
            {/* ===== Top Heading ===== */}
            <Header fixed={true}>
              <TopNav links={topNav} />
              <div className="ml-auto flex items-center space-x-4">
                <ThemeSwitch />
                <ProfileDropdown />
              </div>
            </Header>

            {/* ===== Main ===== */}
            <Main>{children}</Main>
          </div>
        </SidebarProvider>
      </RequestsProvider>
    </SearchProvider>
  );
}

const topNav = [
  {
    title: "Home",
    href: "/",
    isActive: false,
    disabled: false,
  },
  {
    title: "Marketplace",
    href: "/marketplace",
    isActive: false,
    disabled: true,
  },
  {
    title: "My Projects",
    href: "/projects",
    isActive: false,
    disabled: true,
  },
];
