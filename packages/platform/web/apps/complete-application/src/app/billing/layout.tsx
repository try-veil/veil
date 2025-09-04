"use client";
import {
  IconLogs,
  IconHistory,
  IconCreditCardPay,
  IconWallet
} from "@tabler/icons-react";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import SidebarNav from "@/features/settings/components/sidebar-nav";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import Navbar from "@/features/home/Navbar";

interface SettingsProps {
  children?: React.ReactNode;
}

export default function Settings({ children }: SettingsProps) {
  const { isAuthenticated } = useAuth();
  const { user } = useUser();
  return (
    <>
      <Navbar session={isAuthenticated} user={user} />

      <div className="pt-40 max-w-6xl mx-auto">
        <SidebarProvider defaultOpen={true}>
          <Main fixed>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Billing
              </h1>
              <p className="text-muted-foreground">
                Manage your wallet, view transaction history, and purchase
                credits.
              </p>
            </div>
            <Separator className="my-4 lg:my-6" />
            <div className="flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-x-12 lg:space-y-0">
              <aside className="top-0 lg:sticky lg:w-1/5">
                <SidebarNav items={sidebarNavItems} />
              </aside>
              <div className="flex w-full overflow-y-hidden p-1 pr-4">
                {children}
              </div>
            </div>
          </Main>
        </SidebarProvider>
      </div>
    </>
  );
}

const sidebarNavItems = [
  {
    title: "Wallet",
    icon: <IconWallet size={18} />,
    href: "/billing/wallet",
  },
  {
    title: "History",
    icon: <IconHistory size={18} />,
    href: "/billing/history",
  },
  {
    title: "Credit Usage",
    icon: <IconLogs size={18} />,
    href: "/billing/credit-usage",
  },
  {
    title: "Payment Methods",
    icon: <IconCreditCardPay size={18} />,
    href: "/billing/payment-methods",
  },
];
