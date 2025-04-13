import Cookies from 'js-cookie'
import { cn } from '@/lib/utils'
import { SearchProvider } from '@/context/search-context'
import { SidebarProvider } from '@/components/ui/sidebar'
import SkipToMain from '@/components/skip-to-main'
import { ProviderAppSidebar } from '@/components/layout/provider-app-sidebar'

export default function DashboardLayout({ children }: {
  children: React.ReactNode
}) {
  const defaultOpen = Cookies.get('sidebar:state') !== 'false'
  return (
    <SearchProvider>
      <SidebarProvider 
      defaultOpen={defaultOpen}
      >
        <SkipToMain />
        <ProviderAppSidebar />
        <div
          id='content'
          className={cn(
            'ml-auto w-full max-w-full',
            'peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)]',
            'peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]',
            'transition-[width] duration-200 ease-linear',
            'flex h-svh flex-col',
            'group-data-[scroll-locked=1]/body:h-full',
            'group-data-[scroll-locked=1]/body:has-[main.fixed-main]:h-svh'
          )}
        >
          {children}
        </div>
      </SidebarProvider>
    </SearchProvider>
  )
}
